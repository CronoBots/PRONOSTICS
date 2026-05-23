"""Adapter API-SPORTS — multi-sport (football, tennis, basket, baseball, hockey).

Fallback couvrant les sports peu traités ailleurs (notamment tennis ATP 250
et coupes nationales soccer). Format JSON propre, doc fournie.

Free tier : 100 req/jour (suffisant pour 1-2 sports/jour).

API :
  - Football  : https://v3.football.api-sports.io
  - Tennis    : https://v1.tennis.api-sports.io
  - Basket    : https://v1.basketball.api-sports.io
  - Baseball  : https://v1.baseball.api-sports.io
  - Hockey    : https://v1.hockey.api-sports.io

Auth : header `x-apisports-key: <key>` (direct API) ou via RapidAPI.

Doc : https://api-sports.io/documentation/

Endpoints communs (varie par sport) :
  - GET /fixtures?date=YYYY-MM-DD
  - GET /teams/statistics
  - GET /players (foot/basket)
  - GET /standings
"""

from __future__ import annotations

import logging
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


HOSTS: dict[str, str] = {
    "football": "https://v3.football.api-sports.io",
    "tennis": "https://v1.tennis.api-sports.io",
    "basketball": "https://v1.basketball.api-sports.io",
    "mlb": "https://v1.baseball.api-sports.io",
    "nhl": "https://v1.hockey.api-sports.io",
}


def is_configured(settings: Settings) -> bool:
    return bool(getattr(settings, "api_sports_key", ""))


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
)
async def _fetch_json(sport: str, endpoint: str, params: dict | None = None) -> dict:
    base = HOSTS.get(sport)
    if not base:
        raise ValueError(f"api_sports: sport non supporté: {sport}")
    settings = get_settings()
    api_key = getattr(settings, "api_sports_key", "")
    if not api_key:
        raise RuntimeError("api_sports: clé absente (API_SPORTS_KEY)")
    headers = {"x-apisports-key": api_key, "Accept": "application/json"}
    timeout = settings.request_timeout_seconds
    url = f"{base}{endpoint}"
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        resp = await client.get(url, params=params or {}, headers=headers)
        resp.raise_for_status()
        return resp.json()


async def fetch_fixtures(sport: str, date_iso: str) -> list[dict]:
    """Tous les matchs d'une date pour un sport. Format normalisé minimal."""
    endpoint = "/fixtures" if sport in ("football", "nhl", "mlb") else "/games"
    if sport == "tennis":
        endpoint = "/fixtures"
    try:
        data = await _fetch_json(sport, endpoint, {"date": date_iso})
    except Exception as exc:  # noqa: BLE001
        logger.warning("api_sports %s fetch KO: %s", sport, exc)
        return []
    response = data.get("response", []) if isinstance(data, dict) else []
    if not isinstance(response, list):
        return []
    if data.get("errors") and isinstance(data["errors"], dict) and data["errors"]:
        logger.warning("api_sports %s renvoie errors: %s", sport, data["errors"])
    remaining = data.get("response", []) if isinstance(data, dict) else []
    logger.info("api_sports %s %s: %d fixtures", sport, date_iso, len(response))
    _log_quota(sport)
    return response


def _log_quota(sport: str) -> None:
    """Note: quota n'est plus dans la response ; il est dans les headers (consultable via API-Sports dashboard)."""
    return


async def fetch_team_h2h(sport: str, team_a_id: int, team_b_id: int) -> list[dict]:
    """Historique H2H entre 2 équipes (foot/basket/mlb/nhl)."""
    try:
        data = await _fetch_json(
            sport, "/fixtures/headtohead", {"h2h": f"{team_a_id}-{team_b_id}"}
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("api_sports h2h KO: %s", exc)
        return []
    return data.get("response", []) if isinstance(data, dict) else []


async def fetch_team_statistics(sport: str, team_id: int, league_id: int, season: int) -> dict:
    """Stats équipe pour une saison/ligue donnée."""
    try:
        data = await _fetch_json(
            sport,
            "/teams/statistics",
            {"team": team_id, "league": league_id, "season": season},
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("api_sports team_statistics KO: %s", exc)
        return {}
    return data.get("response", {}) if isinstance(data, dict) else {}


async def fetch_lineups(sport: str, fixture_id: int) -> list[dict]:
    """Lineups d'un match (foot principalement). Crucial pour cap-rotation."""
    if sport != "football":
        return []
    try:
        data = await _fetch_json(sport, "/fixtures/lineups", {"fixture": fixture_id})
    except Exception as exc:  # noqa: BLE001
        logger.warning("api_sports lineups KO: %s", exc)
        return []
    return data.get("response", []) if isinstance(data, dict) else []
