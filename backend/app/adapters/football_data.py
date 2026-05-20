"""Adapter football-data.org.

Doc : https://www.football-data.org/documentation/quickstart
Free tier : 10 req/min, ligues principales européennes.
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any

from app.adapters.base import BaseAdapter
from app.config import Settings, get_settings
from app.schemas import MatchInput

logger = logging.getLogger(__name__)


class FootballDataAdapter(BaseAdapter):
    name = "football_data"
    base_url = "https://api.football-data.org/v4"

    def is_configured(self, settings: Settings) -> bool:
        return bool(settings.football_data_token)

    @property
    def _headers(self) -> dict[str, str]:
        return {"X-Auth-Token": get_settings().football_data_token}

    async def fetch_daily(self, sport: str, when: date) -> list[MatchInput]:
        if sport != "football":
            return []

        url = f"{self.base_url}/matches"
        params = {"dateFrom": when.isoformat(), "dateTo": when.isoformat()}

        try:
            payload = await self._get(url, headers=self._headers, params=params)
        except Exception as exc:  # noqa: BLE001
            logger.warning("football_data fetch failed: %s", exc)
            return []

        matches = payload.get("matches", [])
        return [self._normalize(m) for m in matches]

    def _normalize(self, m: dict[str, Any]) -> MatchInput:
        return MatchInput(
            external_id=str(m["id"]),
            source=self.name,
            sport="football",
            league=(m.get("competition") or {}).get("name", "Unknown"),
            home_team=m["homeTeam"]["name"],
            away_team=m["awayTeam"]["name"],
            kickoff=datetime.fromisoformat(m["utcDate"].replace("Z", "+00:00")),
            stage=m.get("stage"),
            extra={"matchday": m.get("matchday")},
        )
