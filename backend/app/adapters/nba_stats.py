"""Adapter NBA Stats API officielle (stats.nba.com).

API publique gratuite, pas de clé requise. Mais headers User-Agent stricts
sinon 403. Rate-limit non documenté mais ~10 req/min sans risque.

Endpoints utilisés :
  - /stats/leaguestandings : standings + records home/away
  - /stats/teaminfocommon : info équipe + record contre conférence
  - /stats/teamgamelog : 10 derniers matchs
  - /stats/leaguedashteamstats : stats agrégées (off/def rating)

Doc non-officielle : https://github.com/swar/nba_api
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import get_settings

logger = logging.getLogger(__name__)


BASE_URL = "https://stats.nba.com/stats"

# Headers nécessaires pour pas se faire 403 par Cloudflare
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://www.nba.com",
    "Referer": "https://www.nba.com/",
    "x-nba-stats-origin": "stats",
    "x-nba-stats-token": "true",
}


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
)
async def _fetch_json(endpoint: str, params: dict | None = None) -> dict:
    url = f"{BASE_URL}/{endpoint}"
    timeout = get_settings().request_timeout_seconds
    async with httpx.AsyncClient(timeout=timeout, headers=HEADERS) as client:
        resp = await client.get(url, params=params or {})
        resp.raise_for_status()
        return resp.json()


def _result_set_to_dicts(payload: dict, result_set_name: str | None = None) -> list[dict]:
    """Convertit un payload NBA API en liste de dicts.

    Format NBA API :
        {"resultSets": [{"name": "...", "headers": [...], "rowSet": [[...], [...]]}]}
    """
    result_sets = payload.get("resultSets") or payload.get("resultSet") or []
    if isinstance(result_sets, dict):
        result_sets = [result_sets]
    if not result_sets:
        return []
    target = result_sets[0]
    if result_set_name:
        for rs in result_sets:
            if rs.get("name") == result_set_name:
                target = rs
                break
    headers = target.get("headers", [])
    rows = target.get("rowSet", [])
    return [dict(zip(headers, row)) for row in rows]


async def fetch_team_standings(season: str = "2025-26") -> list[dict]:
    """Récupère le classement complet avec records home/away."""
    payload = await _fetch_json(
        "leaguestandings",
        params={"LeagueID": "00", "Season": season, "SeasonType": "Regular Season"},
    )
    return _result_set_to_dicts(payload, "Standings")


async def fetch_team_recent_games(team_id: int, season: str = "2025-26", last_n: int = 10) -> list[dict]:
    """Récupère les N derniers matchs d'une équipe."""
    payload = await _fetch_json(
        "teamgamelog",
        params={"TeamID": team_id, "Season": season, "SeasonType": "Regular Season"},
    )
    games = _result_set_to_dicts(payload, "TeamGameLog")
    return games[:last_n]


def compute_team_form_score(games: list[dict]) -> dict[str, Any]:
    """À partir des N derniers matchs, calcule un 'form score' simple.

    Returns dict avec : wins, losses, win_pct, point_diff_avg, last_5_form ("WWLWL")
    """
    if not games:
        return {"wins": 0, "losses": 0, "win_pct": 0, "point_diff_avg": 0, "last_5_form": ""}

    wins = sum(1 for g in games if g.get("WL") == "W")
    losses = sum(1 for g in games if g.get("WL") == "L")
    n = len(games)
    win_pct = round(wins / n, 3) if n else 0

    point_diffs = []
    for g in games:
        pts = g.get("PTS") or 0
        # NBA gamelog n'a pas le score adverse direct, mais a PLUS_MINUS
        pm = g.get("PLUS_MINUS")
        if pm is not None:
            point_diffs.append(float(pm))
    avg_pm = round(sum(point_diffs) / len(point_diffs), 1) if point_diffs else 0

    last_5 = "".join(g.get("WL", "?") for g in games[:5])

    return {
        "wins": wins,
        "losses": losses,
        "n_games": n,
        "win_pct": win_pct,
        "point_diff_avg": avg_pm,
        "last_5_form": last_5,
    }


def find_team_id_by_name(standings: list[dict], team_name: str) -> int | None:
    """Trouve le TeamID NBA par nom (matching substring case-insensitive)."""
    norm = team_name.lower()
    for team in standings:
        tn = (team.get("TeamName", "") + " " + team.get("TeamCity", "")).lower()
        if norm in tn or tn.startswith(norm):
            return team.get("TeamID")
    # Fallback : last word match
    last = norm.split()[-1] if norm.split() else norm
    for team in standings:
        tn = (team.get("TeamName", "")).lower()
        if last in tn:
            return team.get("TeamID")
    return None


def standings_to_summary(standings: list[dict], team_id: int) -> dict | None:
    """Pour un TeamID, retourne un summary {record, home_record, conference_rank}."""
    for team in standings:
        if team.get("TeamID") == team_id:
            return {
                "team_name": team.get("TeamName"),
                "wins": team.get("WINS"),
                "losses": team.get("LOSSES"),
                "win_pct": team.get("WinPCT"),
                "home_record": team.get("HOME"),  # ex "28-13"
                "away_record": team.get("ROAD"),
                "last_10": team.get("L10"),
                "current_streak": team.get("CurrentStreak"),
                "conference_rank": team.get("PlayoffRank"),
                "off_rating": team.get("OffRating"),
                "def_rating": team.get("DefRating"),
                "net_rating": team.get("NetRating"),
            }
    return None


async def predict_match_from_stats(home_team: str, away_team: str, season: str = "2025-26") -> dict | None:
    """Prédiction simple basée sur net_rating + home advantage."""
    standings = await fetch_team_standings(season)
    if not standings:
        return None
    home_id = find_team_id_by_name(standings, home_team)
    away_id = find_team_id_by_name(standings, away_team)
    if not home_id or not away_id:
        logger.warning("nba_stats: team_id introuvable (home=%s, away=%s)", home_team, away_team)
        return None

    home_summary = standings_to_summary(standings, home_id)
    away_summary = standings_to_summary(standings, away_id)
    if not home_summary or not away_summary:
        return None

    # Modèle simpliste : net_rating + 3 points d'avantage maison
    home_net = home_summary.get("net_rating", 0) or 0
    away_net = away_summary.get("net_rating", 0) or 0
    HOME_ADVANTAGE = 3.0  # points typiques en NBA régulière
    margin = (home_net - away_net) + HOME_ADVANTAGE

    # Conversion margin → win prob via fonction logistique calibrée NBA
    # Approx : 1 pt margin ≈ +3% win prob
    win_prob_home = 1 / (1 + 10 ** (-margin / 14))
    return {
        "prob_home": round(win_prob_home, 4),
        "prob_away": round(1 - win_prob_home, 4),
        "margin_estimated": round(margin, 1),
        "home_summary": home_summary,
        "away_summary": away_summary,
        "source": "nba_stats_official",
    }
