"""Adapter The Odds API.

Doc : https://the-odds-api.com/liveapi/guides/v4/
Free tier : 500 req/mois.

Stratégie :
  1. On découvre les sports actifs via /sports (1 req)
  2. On filtre ceux qui nous intéressent (préfixes sport_*) + actifs + non-outright
  3. Pour chaque sport actif, on récupère /odds (1 req par sport)
  4. On log le quota restant à chaque appel (header `x-requests-remaining`)

Budget : ~12-18 req/jour selon nb de sports actifs. Marge sur 500/mois free.
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

# Préfixes The Odds API que l'on considère pour chaque catégorie sportive WTF.
# Le filtre est appliqué APRÈS découverte des sports actifs via /sports, donc
# si Geneva ou Strasbourg apparaissent comme `tennis_atp_geneva` ou similaire,
# ils seront automatiquement inclus. Inclut désormais : NRL, AFL, IPL, MMA,
# soccer Sud-Am, Liga MX, et toutes les WTA/ATP actuellement actives.
_SPORT_PREFIXES: dict[str, list[str]] = {
    "football": ["soccer_"],          # toutes ligues soccer EU + Sud-Am + Liga MX + finales coupe
    "basketball": ["basketball_"],    # NBA, Euroleague, etc.
    "tennis": ["tennis_"],            # TOUS les ATP/WTA actifs (GS, 1000, 500, 250)
    "nfl": ["americanfootball_nfl"],
    "mlb": ["baseball_mlb"],
    "nhl": ["icehockey_nhl"],
    "cricket": ["cricket_"],          # IPL, PSL, etc.
    "rugby_league": ["rugbyleague_"], # NRL, Super League
    "aussie_rules": ["aussierules_"], # AFL
    "mma": ["mma_"],                  # UFC + autres orgs
    "boxing": ["boxing_"],            # combats individuels
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
        prefixes = _SPORT_PREFIXES.get(sport, [])
        if not prefixes:
            return []

        api_key = get_settings().odds_api_key
        active = await self._active_sport_keys(api_key)

        # Découverte dynamique : tous les sports actifs dont la clé commence par
        # l'un des préfixes WTF. Permet de couvrir Geneva, Strasbourg, Lyon,
        # Conference League, Libertadores, IPL etc. sans hardcoder chaque key.
        keys_to_call = sorted(
            k for k in active if any(k.startswith(p) for p in prefixes)
        )

        if not keys_to_call:
            logger.info(
                "odds_api : aucun sport actif pour %s parmi préfixes %s",
                sport,
                prefixes,
            )
            return []

        logger.info(
            "odds_api : %d sports actifs pour %s : %s",
            len(keys_to_call),
            sport,
            keys_to_call,
        )

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
