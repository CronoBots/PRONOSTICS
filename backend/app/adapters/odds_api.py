"""Adapter The Odds API.

Doc : https://the-odds-api.com/liveapi/guides/v4/
Free tier : 500 req/mois.

Stratégie :
  1. On découvre les sports actifs via /sports (1 req)
  2. On filtre ceux qui nous intéressent + ceux qui ont des évents en cours (`has_outrights=False`)
  3. Pour chaque sport actif, on récupère /odds (1 req par sport)
  4. On log le quota restant à chaque appel (header `x-requests-remaining`)

Budget ~6-8 req/jour → confortable sous les 500/mois.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any

import httpx

from app.adapters.base import BaseAdapter
from app.config import Settings, get_settings
from app.schemas import MatchInput

logger = logging.getLogger(__name__)

# Mapping nos sport keys → keys The Odds API. Plusieurs valeurs possibles ;
# on garde celles qui sont actives à l'instant T (vérifié via /sports).
_SPORT_KEYS: dict[str, list[str]] = {
    "football": [
        "soccer_epl",
        "soccer_france_ligue_one",
        "soccer_spain_la_liga",
        "soccer_italy_serie_a",
        "soccer_germany_bundesliga",
        "soccer_uefa_champs_league",
        "soccer_uefa_europa_league",
    ],
    "basketball": ["basketball_nba", "basketball_euroleague"],
    "tennis": [
        "tennis_atp_french_open",
        "tennis_wta_french_open",
        "tennis_atp_wimbledon",
        "tennis_wta_wimbledon",
        "tennis_atp_us_open",
        "tennis_wta_us_open",
        "tennis_atp_aus_open",
        "tennis_wta_aus_open",
    ],
    "nfl": ["americanfootball_nfl"],
    "mlb": ["baseball_mlb"],
    "nhl": ["icehockey_nhl"],
}


class OddsApiAdapter(BaseAdapter):
    name = "odds_api"
    base_url = "https://api.the-odds-api.com/v4"

    def is_configured(self, settings: Settings) -> bool:
        return bool(settings.odds_api_key)

    async def _get_with_quota(self, url: str, params: dict) -> tuple[Any, dict[str, str]]:
        """Variante de _get qui retourne aussi les headers (pour le quota)."""
        timeout = httpx.Timeout(get_settings().request_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            return resp.json(), dict(resp.headers)

    async def _active_sport_keys(self, api_key: str) -> set[str]:
        """Liste les sport keys actifs en ce moment (avec événements en cours)."""
        try:
            data, headers = await self._get_with_quota(
                f"{self.base_url}/sports", {"apiKey": api_key}
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("odds_api /sports failed: %s", exc)
            return set()
        remaining = headers.get("x-requests-remaining", "?")
        used = headers.get("x-requests-used", "?")
        logger.info(
            "odds_api quota — used=%s remaining=%s (après /sports)", used, remaining
        )
        return {s["key"] for s in data if s.get("active") and not s.get("has_outrights")}

    async def fetch_daily(self, sport: str, when: date) -> list[MatchInput]:
        all_keys = _SPORT_KEYS.get(sport, [])
        if not all_keys:
            return []

        api_key = get_settings().odds_api_key
        active = await self._active_sport_keys(api_key)
        keys_to_call = [k for k in all_keys if k in active]

        if not keys_to_call:
            logger.info(
                "odds_api : aucun sport actif pour %s parmi %s", sport, all_keys
            )
            return []

        day_start = datetime.combine(when, datetime.min.time(), tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)

        all_matches: list[MatchInput] = []
        for key in keys_to_call:
            url = f"{self.base_url}/sports/{key}/odds"
            params = {
                "apiKey": api_key,
                "regions": "eu",
                "markets": "h2h",
                "oddsFormat": "decimal",
                "dateFormat": "iso",
            }
            try:
                payload, headers = await self._get_with_quota(url, params)
            except Exception as exc:  # noqa: BLE001
                logger.warning("odds_api fetch failed for %s: %s", key, exc)
                continue

            remaining = headers.get("x-requests-remaining", "?")
            logger.info(
                "[%s] %d événements (quota restant : %s)",
                key,
                len(payload),
                remaining,
            )

            for event in payload:
                kickoff = datetime.fromisoformat(
                    event["commence_time"].replace("Z", "+00:00")
                )
                if not (day_start <= kickoff < day_end):
                    continue
                all_matches.append(self._normalize(event, sport, key))

        return all_matches

    def _normalize(
        self, event: dict[str, Any], sport: str, league_key: str
    ) -> MatchInput:
        odds = self._best_odds(event)
        return MatchInput(
            external_id=event["id"],
            source=self.name,
            sport=sport,
            league=league_key.replace("_", " ").title(),
            home_team=event["home_team"],
            away_team=event["away_team"],
            kickoff=datetime.fromisoformat(
                event["commence_time"].replace("Z", "+00:00")
            ),
            odds=odds,
            extra={"bookmakers_count": len(event.get("bookmakers", []))},
        )

    def _best_odds(self, event: dict[str, Any]) -> dict[str, float]:
        """Pour chaque issue (équipe ou Draw), prend la meilleure cote disponible."""
        best: dict[str, float] = {}
        for book in event.get("bookmakers", []):
            for market in book.get("markets", []):
                if market.get("key") != "h2h":
                    continue
                for outcome in market.get("outcomes", []):
                    name = outcome.get("name")
                    price = outcome.get("price")
                    if name and price:
                        best[name] = max(best.get(name, 0.0), float(price))
        return best
