"""Adapter balldontlie.io — NBA stats joueurs + équipes, free tier généreux.

Complète `nba_stats.py` (NBA Stats officielle, parfois rate-limitée) avec
un format JSON propre et stable. Utile pour les props joueurs et la
récupération rapide des season averages.

API : `https://api.balldontlie.io/v1/`
Auth : header `Authorization: <api_key>` requis depuis 2024 (free signup).

Doc : https://docs.balldontlie.io/
Endpoints clés :
  - GET /teams
  - GET /players?search=lebron
  - GET /season_averages?season=2025&player_ids[]=237
  - GET /games?dates[]=2026-05-23
  - GET /stats?dates[]=2026-05-23
"""

from __future__ import annotations

import logging
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


BASE_URL = "https://api.balldontlie.io/v1"


def is_configured(settings: Settings) -> bool:
    return bool(getattr(settings, "balldontlie_key", ""))


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
)
async def _fetch_json(endpoint: str, params: dict | None = None) -> dict:
    settings = get_settings()
    api_key = getattr(settings, "balldontlie_key", "")
    if not api_key:
        raise RuntimeError("balldontlie: clé API absente (BALLDONTLIE_KEY)")
    headers = {"Authorization": api_key, "Accept": "application/json"}
    timeout = settings.request_timeout_seconds
    url = f"{BASE_URL}{endpoint}"
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        resp = await client.get(url, params=params or {}, headers=headers)
        resp.raise_for_status()
        return resp.json()


async def search_player(name: str) -> list[dict]:
    """Cherche un joueur NBA par nom (ex: 'LeBron')."""
    try:
        data = await _fetch_json("/players", {"search": name, "per_page": 25})
    except Exception as exc:  # noqa: BLE001
        logger.warning("balldontlie player search KO for '%s': %s", name, exc)
        return []
    return data.get("data", []) if isinstance(data, dict) else []


async def fetch_season_averages(player_ids: list[int], season: int = 2025) -> list[dict]:
    """Récupère season averages pour une liste de joueurs.

    Le free tier limite à 60 req/min — on batch quand possible.
    """
    if not player_ids:
        return []
    try:
        data = await _fetch_json(
            "/season_averages",
            {"season": season, "player_ids[]": player_ids},
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("balldontlie season_averages KO: %s", exc)
        return []
    return data.get("data", []) if isinstance(data, dict) else []


async def fetch_games_on_date(date_iso: str) -> list[dict]:
    """Tous les matchs NBA d'une date donnée (YYYY-MM-DD)."""
    try:
        data = await _fetch_json("/games", {"dates[]": date_iso, "per_page": 100})
    except Exception as exc:  # noqa: BLE001
        logger.warning("balldontlie games KO for %s: %s", date_iso, exc)
        return []
    return data.get("data", []) if isinstance(data, dict) else []


async def fetch_player_recent_stats(player_id: int, last_n: int = 10) -> list[dict]:
    """Stats des N dernières apparitions d'un joueur (props analysis)."""
    try:
        data = await _fetch_json(
            "/stats",
            {"player_ids[]": player_id, "per_page": last_n, "postseason": "false"},
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("balldontlie stats KO for player %d: %s", player_id, exc)
        return []
    return data.get("data", []) if isinstance(data, dict) else []


def compute_props_baseline(stats: list[dict]) -> dict[str, float]:
    """Pour une liste de game stats, calcule moyennes (pts, reb, ast, etc.)."""
    if not stats:
        return {}
    keys = ["pts", "reb", "ast", "stl", "blk", "min", "fg3m", "turnover"]
    averages: dict[str, float] = {}
    for k in keys:
        vals = [g.get(k, 0) or 0 for g in stats if g.get(k) is not None]
        if vals:
            averages[k] = round(sum(vals) / len(vals), 2)
    averages["n_games"] = len(stats)
    return averages
