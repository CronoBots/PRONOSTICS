"""Adapter NHL Stats API officielle (api-web.nhle.com).

API publique gratuite, sans clé. Plus moderne et stable que stats.nba.com.

Endpoints principaux :
  - /v1/standings/now : classement actuel
  - /v1/club-stats/{team_abbrev}/now : stats équipe
  - /v1/club-schedule-season/{team_abbrev}/{season} : calendrier saison
  - /v1/score/{date} : scores du jour (YYYY-MM-DD)
"""

from __future__ import annotations

import logging
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import get_settings

logger = logging.getLogger(__name__)


BASE_URL = "https://api-web.nhle.com/v1"


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
)
async def _fetch_json(endpoint: str) -> dict:
    url = f"{BASE_URL}{endpoint}"
    timeout = get_settings().request_timeout_seconds
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()


async def fetch_standings() -> list[dict]:
    """Classement complet NHL avec records détaillés."""
    payload = await _fetch_json("/standings/now")
    return payload.get("standings", [])


async def fetch_team_recent_games(team_abbrev: str, season: str = "20252026") -> list[dict]:
    """Récupère les matchs de la saison pour une équipe (filtrage récent côté client)."""
    payload = await _fetch_json(f"/club-schedule-season/{team_abbrev}/{season}")
    games = payload.get("games", [])
    # Garde uniquement les matchs joués (homeTeam/awayTeam scores existent)
    played = [g for g in games if g.get("gameState") in ("OFF", "FINAL")]
    return played


def find_team_abbrev(standings: list[dict], team_name: str) -> str | None:
    """Trouve l'abbreviation NHL (ex: 'NYR') à partir du nom complet ('New York Rangers')."""
    norm = team_name.lower()
    for team in standings:
        team_name_full = (team.get("teamName", {}).get("default", "")).lower()
        if norm in team_name_full or team_name_full in norm:
            return team.get("teamAbbrev", {}).get("default")
    return None


def standings_summary(standings: list[dict], team_abbrev: str) -> dict | None:
    """Summary pour une équipe : record, points, home/away, last10."""
    for team in standings:
        if team.get("teamAbbrev", {}).get("default") == team_abbrev:
            return {
                "team_name": team.get("teamName", {}).get("default"),
                "wins": team.get("wins"),
                "losses": team.get("losses"),
                "otLosses": team.get("otLosses"),
                "points": team.get("points"),
                "win_pct": team.get("winPctg"),
                "home_wins": team.get("homeWins"),
                "home_losses": team.get("homeLosses"),
                "road_wins": team.get("roadWins"),
                "road_losses": team.get("roadLosses"),
                "l10_wins": team.get("l10Wins"),
                "l10_losses": team.get("l10Losses"),
                "streak": f"{team.get('streakCode', '')}{team.get('streakCount', '')}",
                "goal_diff": team.get("goalDifferential"),
                "goals_for_per_game": team.get("goalsForPerGame"),
                "goals_against_per_game": team.get("goalsAgainstPerGame"),
            }
    return None


def compute_team_form(games: list[dict], team_abbrev: str, last_n: int = 10) -> dict[str, Any]:
    """Forme des N derniers matchs."""
    recent = games[-last_n:] if len(games) > last_n else games
    wins = losses = otl = 0
    pf = pa = 0
    last_5 = []
    for g in recent[::-1]:  # plus récent en premier
        home = g.get("homeTeam", {})
        away = g.get("awayTeam", {})
        if home.get("abbrev") == team_abbrev:
            our_score = home.get("score", 0)
            opp_score = away.get("score", 0)
        else:
            our_score = away.get("score", 0)
            opp_score = home.get("score", 0)
        pf += our_score
        pa += opp_score
        if our_score > opp_score:
            wins += 1
            last_5.append("W")
        else:
            losses += 1
            # OT loss = period > 3 et notre score = opp_score - 1
            if g.get("periodDescriptor", {}).get("number", 3) > 3:
                otl += 1
            last_5.append("L")
    return {
        "n_games": len(recent),
        "wins": wins,
        "losses": losses,
        "ot_losses": otl,
        "goals_for_total": pf,
        "goals_against_total": pa,
        "goal_diff": pf - pa,
        "last_5_form": "".join(last_5[:5]),
    }


async def predict_match_from_stats(home_team: str, away_team: str) -> dict | None:
    """Prédiction simple basée sur points% + home advantage NHL."""
    standings = await fetch_standings()
    if not standings:
        return None
    home_abbrev = find_team_abbrev(standings, home_team)
    away_abbrev = find_team_abbrev(standings, away_team)
    if not home_abbrev or not away_abbrev:
        logger.warning("nhl_stats: team_abbrev introuvable (home=%s, away=%s)", home_team, away_team)
        return None

    home_summary = standings_summary(standings, home_abbrev)
    away_summary = standings_summary(standings, away_abbrev)
    if not home_summary or not away_summary:
        return None

    # Modèle simpliste : winPctg + home advantage NHL (~6% boost)
    home_pct = home_summary.get("win_pct") or 0.5
    away_pct = away_summary.get("win_pct") or 0.5
    HOME_ADVANTAGE = 0.055  # avantage moyen NHL régulière
    # Log-ratio normalisé
    import math
    home_strength = math.log((home_pct + 0.01) / (1 - home_pct + 0.01)) + HOME_ADVANTAGE
    away_strength = math.log((away_pct + 0.01) / (1 - away_pct + 0.01))
    diff = home_strength - away_strength
    home_prob = 1 / (1 + math.exp(-diff))

    return {
        "prob_home": round(home_prob, 4),
        "prob_away": round(1 - home_prob, 4),
        "home_summary": home_summary,
        "away_summary": away_summary,
        "source": "nhl_stats_official",
    }
