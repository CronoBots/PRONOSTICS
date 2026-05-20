"""Adapter The Odds API.

Doc : https://the-odds-api.com/liveapi/guides/v4/
Couvre tous les sports majeurs avec les cotes multi-bookmakers.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any

from app.adapters.base import BaseAdapter
from app.config import Settings, get_settings
from app.schemas import MatchInput

logger = logging.getLogger(__name__)

# Mapping de nos sport keys vers ceux de l'API
_SPORT_KEYS: dict[str, list[str]] = {
    "football": ["soccer_epl", "soccer_france_ligue_one", "soccer_spain_la_liga", "soccer_italy_serie_a", "soccer_uefa_champs_league"],
    "basketball": ["basketball_nba", "basketball_euroleague"],
    "tennis": ["tennis_atp_french_open", "tennis_wta_french_open"],
    "nfl": ["americanfootball_nfl"],
    "mlb": ["baseball_mlb"],
    "nhl": ["icehockey_nhl"],
}


class OddsApiAdapter(BaseAdapter):
    name = "odds_api"
    base_url = "https://api.the-odds-api.com/v4"

    def is_configured(self, settings: Settings) -> bool:
        return bool(settings.odds_api_key)

    async def fetch_daily(self, sport: str, when: date) -> list[MatchInput]:
        sport_keys = _SPORT_KEYS.get(sport, [])
        if not sport_keys:
            return []

        api_key = get_settings().odds_api_key
        day_start = datetime.combine(when, datetime.min.time(), tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)

        all_matches: list[MatchInput] = []
        for key in sport_keys:
            url = f"{self.base_url}/sports/{key}/odds"
            params = {
                "apiKey": api_key,
                "regions": "eu",
                "markets": "h2h",
                "oddsFormat": "decimal",
                "dateFormat": "iso",
            }
            try:
                payload = await self._get(url, params=params)
            except Exception as exc:  # noqa: BLE001
                logger.warning("odds_api fetch failed for %s: %s", key, exc)
                continue

            for event in payload:
                kickoff = datetime.fromisoformat(event["commence_time"].replace("Z", "+00:00"))
                if not (day_start <= kickoff < day_end):
                    continue
                all_matches.append(self._normalize(event, sport, key))

        return all_matches

    def _normalize(self, event: dict[str, Any], sport: str, league_key: str) -> MatchInput:
        odds = self._best_odds(event)
        return MatchInput(
            external_id=event["id"],
            source=self.name,
            sport=sport,
            league=league_key.replace("_", " ").title(),
            home_team=event["home_team"],
            away_team=event["away_team"],
            kickoff=datetime.fromisoformat(event["commence_time"].replace("Z", "+00:00")),
            odds=odds,
            extra={"bookmakers_count": len(event.get("bookmakers", []))},
        )

    def _best_odds(self, event: dict[str, Any]) -> dict[str, float]:
        """Agrège les cotes : pour chaque issue, prend la meilleure cote disponible."""
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
