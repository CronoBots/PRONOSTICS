"""Adapter MLB Stats API officielle (statsapi.mlb.com).

API publique gratuite, sans clé. Très complète mais legacy structure.

Endpoints :
  - /api/v1/standings : classements
  - /api/v1/teams : liste équipes (avec IDs)
  - /api/v1/teams/{id}/stats : stats équipe
  - /api/v1/people/{id} : info joueur (pitcher)
  - /api/v1/schedule?sportId=1&date=YYYY-MM-DD : matchs du jour
"""

from __future__ import annotations

import logging
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import get_settings

logger = logging.getLogger(__name__)


BASE_URL = "https://statsapi.mlb.com/api/v1"
SEASON = "2026"


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
)
async def _fetch_json(endpoint: str, params: dict | None = None) -> dict:
    url = f"{BASE_URL}{endpoint}"
    timeout = get_settings().request_timeout_seconds
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        resp = await client.get(url, params=params or {})
        resp.raise_for_status()
        return resp.json()


async def fetch_standings(season: str = SEASON) -> list[dict]:
    """Standings complets MLB par division."""
    payload = await _fetch_json(
        "/standings",
        params={"leagueId": "103,104", "season": season, "standingsTypes": "regularSeason"},
    )
    records = payload.get("records", [])
    teams = []
    for division in records:
        for team_record in division.get("teamRecords", []):
            teams.append(team_record)
    return teams


def find_team_id(standings: list[dict], team_name: str) -> int | None:
    """Trouve teamId MLB par nom (ex: 'Detroit Tigers' → 116)."""
    norm = team_name.lower().strip()
    for team in standings:
        team_dict = team.get("team", {})
        full_name = team_dict.get("name", "").lower()
        if norm in full_name or full_name in norm:
            return team_dict.get("id")
        # Match sur le dernier mot (ex: "Tigers")
        last_word = norm.split()[-1] if norm.split() else norm
        if last_word in full_name:
            return team_dict.get("id")
    return None


def standings_summary(standings: list[dict], team_id: int) -> dict | None:
    """Summary pour une équipe MLB."""
    for team in standings:
        if team.get("team", {}).get("id") == team_id:
            records = team.get("records", {})
            return {
                "team_name": team.get("team", {}).get("name"),
                "wins": team.get("wins"),
                "losses": team.get("losses"),
                "win_pct": float(team.get("winningPercentage", 0)),
                "runs_scored": team.get("runsScored"),
                "runs_allowed": team.get("runsAllowed"),
                "run_diff": team.get("runDifferential"),
                "home_record": _record_to_str(records.get("splitRecords", []), "home"),
                "away_record": _record_to_str(records.get("splitRecords", []), "away"),
                "last_10": _record_to_str(records.get("splitRecords", []), "lastTen"),
                "streak": team.get("streak", {}).get("streakCode"),
                "elimination_number": team.get("eliminationNumber"),
            }
    return None


def _record_to_str(split_records: list[dict], record_type: str) -> str:
    for r in split_records:
        if r.get("type") == record_type:
            return f"{r.get('wins')}-{r.get('losses')}"
    return ""


async def fetch_schedule(date_iso: str) -> list[dict]:
    """Matchs MLB programmés pour une date (YYYY-MM-DD)."""
    payload = await _fetch_json(
        "/schedule",
        params={"sportId": 1, "date": date_iso, "hydrate": "probablePitcher"},
    )
    dates = payload.get("dates", [])
    games = []
    for d in dates:
        games.extend(d.get("games", []))
    return games


async def predict_match_from_stats(home_team: str, away_team: str, season: str = SEASON) -> dict | None:
    """Prédiction MLB basée sur win_pct + run_diff + home advantage.

    MLB est le sport avec le plus de variance match-to-match → predictions
    moins fiables que NBA/NHL. À utiliser comme une référence parmi d'autres.
    """
    standings = await fetch_standings(season)
    if not standings:
        return None
    home_id = find_team_id(standings, home_team)
    away_id = find_team_id(standings, away_team)
    if not home_id or not away_id:
        logger.warning("mlb_stats: team_id introuvable (home=%s, away=%s)", home_team, away_team)
        return None

    home_summary = standings_summary(standings, home_id)
    away_summary = standings_summary(standings, away_id)
    if not home_summary or not away_summary:
        return None

    # Modèle simpliste : Pythagorean expectation + home advantage MLB (~3%)
    import math

    def pythag_strength(rs, ra):
        if rs <= 0 or ra <= 0:
            return 0.5
        return (rs ** 1.83) / ((rs ** 1.83) + (ra ** 1.83))

    home_strength = pythag_strength(home_summary["runs_scored"], home_summary["runs_allowed"])
    away_strength = pythag_strength(away_summary["runs_scored"], away_summary["runs_allowed"])
    HOME_ADVANTAGE = 0.035  # avantage moyen MLB régulière

    # Log-ratio mix
    diff = math.log((home_strength + 0.01) / (1 - home_strength + 0.01))
    diff -= math.log((away_strength + 0.01) / (1 - away_strength + 0.01))
    diff += HOME_ADVANTAGE * 4  # convert proba boost → log-odds boost
    home_prob = 1 / (1 + math.exp(-diff))

    return {
        "prob_home": round(home_prob, 4),
        "prob_away": round(1 - home_prob, 4),
        "home_pythagorean": round(home_strength, 4),
        "away_pythagorean": round(away_strength, 4),
        "home_summary": home_summary,
        "away_summary": away_summary,
        "source": "mlb_stats_official",
        "note": "MLB picks ont haute variance — toujours croiser avec FanGraphs FIP du lanceur prévu",
    }
