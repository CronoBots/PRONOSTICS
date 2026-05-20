"""Adapter API-Football (RapidAPI).

Doc : https://www.api-football.com/documentation-v3
Couvre principalement le football (soccer). Free tier : 100 req/jour.
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any

from app.adapters.base import BaseAdapter
from app.config import Settings, get_settings
from app.schemas import HeadToHead, MatchInput, TeamForm

logger = logging.getLogger(__name__)


class ApiFootballAdapter(BaseAdapter):
    name = "api_football"
    base_url = "https://v3.football.api-sports.io"

    def is_configured(self, settings: Settings) -> bool:
        return bool(settings.api_football_key)

    @property
    def _headers(self) -> dict[str, str]:
        return {"x-apisports-key": get_settings().api_football_key}

    async def fetch_daily(self, sport: str, when: date) -> list[MatchInput]:
        if sport != "football":
            return []

        url = f"{self.base_url}/fixtures"
        params = {"date": when.isoformat(), "timezone": "UTC"}

        try:
            payload = await self._get(url, headers=self._headers, params=params)
        except Exception as exc:  # noqa: BLE001
            logger.warning("api_football fetch failed: %s", exc)
            return []

        fixtures = payload.get("response", [])
        results: list[MatchInput] = []
        for fx in fixtures:
            try:
                results.append(self._normalize(fx))
            except (KeyError, ValueError) as exc:
                logger.debug("skip malformed fixture: %s", exc)
        return results

    def _normalize(self, fx: dict[str, Any]) -> MatchInput:
        fixture = fx["fixture"]
        league = fx["league"]
        teams = fx["teams"]

        return MatchInput(
            external_id=str(fixture["id"]),
            source=self.name,
            sport="football",
            league=f"{league.get('country', '')} - {league.get('name', '')}".strip(" -"),
            home_team=teams["home"]["name"],
            away_team=teams["away"]["name"],
            kickoff=datetime.fromisoformat(fixture["date"].replace("Z", "+00:00")),
            stage=league.get("round"),
            venue=(fixture.get("venue") or {}).get("name"),
            # forme/h2h : enrichissement lazy à faire dans un second appel
            # (endpoints /teams/statistics, /fixtures/headtohead). Volontairement
            # laissés vides ici pour limiter la conso de quota.
            home_form=TeamForm(),
            away_form=TeamForm(),
            h2h=HeadToHead(),
            extra={"raw_league_id": league.get("id"), "season": league.get("season")},
        )
