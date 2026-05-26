"""Adapter Sofascore — endpoints publics non-officiels (api.sofascore.com).

Sofascore expose une API HTTP publique non-documentée mais accessible sans clé,
utilisée par leur frontend. Source extrêmement riche : lineups officielles,
H2H, stats matchs live, best players. Particulièrement utile pour :
  - **Lineups officielles ~1h avant kickoff** → détecter "joueur clé out"
    (anti-bias soccer/NBA/NHL)
  - **H2H précis** par compétition (vs les fuzzy lookups Odds API)
  - **Stats live** (xG, possession, shots) pendant un match

⚠️ Protections Cloudflare : User-Agent réaliste obligatoire, rate-limit
   conservateur (sinon 403). Pas d'auth requise pour le read public.

Pas de clé API requise. Endpoints documentés via le frontend Sofascore et
le repo open-source `tunjayoff/sofascore_scraper` (MIT).

Endpoints utilisés :
  GET /api/v1/sport/{sport}/scheduled-events/{date}
  GET /api/v1/event/{event_id}
  GET /api/v1/event/{event_id}/lineups
  GET /api/v1/event/{event_id}/h2h/events
  GET /api/v1/event/{event_id}/statistics

Mapping sport interne → sport Sofascore :
  football        → "football"
  basketball      → "basketball"
  tennis          → "tennis"
  nhl             → "ice-hockey"
  mlb             → "baseball"
  nfl             → "american-football"
"""

from __future__ import annotations

import asyncio
import logging
from datetime import date as _date_t
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import get_settings

logger = logging.getLogger(__name__)


BASE_URL = "https://api.sofascore.com/api/v1"

# User-Agent navigateur récent — Cloudflare bloque les UA Python par défaut
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.sofascore.com/",
    "Origin": "https://www.sofascore.com",
}

# Mapping sport interne → slug Sofascore
SPORT_SLUGS: dict[str, str] = {
    "football": "football",
    "basketball": "basketball",
    "tennis": "tennis",
    "nhl": "ice-hockey",
    "mlb": "baseball",
    "nfl": "american-football",
    "rugby_league": "rugby",
    "cricket": "cricket",
    "mma": "mma",
}

# Rate-limit : ne pas dépasser ~5 req/sec pour éviter Cloudflare
_RATE_LIMIT_SEMAPHORE: asyncio.Semaphore | None = None
_RATE_LIMIT_DELAY_S = 0.25  # ~4 req/sec safe


def _get_semaphore() -> asyncio.Semaphore:
    global _RATE_LIMIT_SEMAPHORE
    if _RATE_LIMIT_SEMAPHORE is None:
        _RATE_LIMIT_SEMAPHORE = asyncio.Semaphore(3)
    return _RATE_LIMIT_SEMAPHORE


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
)
async def _fetch_json(endpoint: str, params: dict | None = None) -> dict | None:
    url = f"{BASE_URL}{endpoint}"
    timeout = get_settings().request_timeout_seconds
    sem = _get_semaphore()
    async with sem:
        async with httpx.AsyncClient(timeout=timeout, headers=DEFAULT_HEADERS, follow_redirects=True) as client:
            resp = await client.get(url, params=params or {})
            if resp.status_code == 404:
                return None
            if resp.status_code == 403:
                logger.warning("sofascore 403 (Cloudflare?) on %s — skip", endpoint)
                return None
            resp.raise_for_status()
            await asyncio.sleep(_RATE_LIMIT_DELAY_S)
            return resp.json()


async def fetch_scheduled_events(sport: str, when: _date_t) -> list[dict]:
    """Tous les matchs programmés pour un sport et une date donnée.

    Format ISO date (YYYY-MM-DD). Retourne liste normalisée minimaliste.
    """
    slug = SPORT_SLUGS.get(sport)
    if not slug:
        logger.warning("sofascore: sport non supporté: %s", sport)
        return []
    date_iso = when.isoformat()
    try:
        data = await _fetch_json(f"/sport/{slug}/scheduled-events/{date_iso}")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore scheduled-events KO for %s %s: %s", sport, date_iso, exc)
        return []
    if not data:
        return []
    events = data.get("events", []) if isinstance(data, dict) else []
    return [_normalize_event(e, sport) for e in events]


def _normalize_event(event: dict, sport: str) -> dict:
    home = event.get("homeTeam", {})
    away = event.get("awayTeam", {})
    tournament = event.get("tournament", {})
    status = event.get("status", {})
    return {
        "sport": sport,
        "event_id": event.get("id"),
        "slug": event.get("slug", ""),
        "home_team": home.get("name", ""),
        "home_team_id": home.get("id"),
        "away_team": away.get("name", ""),
        "away_team_id": away.get("id"),
        "tournament_name": tournament.get("name", ""),
        "tournament_id": tournament.get("id"),
        "kickoff_ts": event.get("startTimestamp"),
        "status_code": status.get("code"),
        "status_description": status.get("description", ""),
        "winner_code": event.get("winnerCode"),  # 1=home, 2=away, 3=draw, None=pending
    }


async def fetch_lineups(event_id: int) -> dict | None:
    """Lineups officielles pour un event (publiées ~1h avant kickoff)."""
    try:
        data = await _fetch_json(f"/event/{event_id}/lineups")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore lineups KO for %s: %s", event_id, exc)
        return None
    if not data:
        return None
    home_lineup = (data.get("home") or {}).get("players", [])
    away_lineup = (data.get("away") or {}).get("players", [])
    return {
        "confirmed": data.get("confirmed", False),
        "home_starters": [_extract_player(p) for p in home_lineup if not p.get("substitute")],
        "home_bench": [_extract_player(p) for p in home_lineup if p.get("substitute")],
        "away_starters": [_extract_player(p) for p in away_lineup if not p.get("substitute")],
        "away_bench": [_extract_player(p) for p in away_lineup if p.get("substitute")],
        "home_formation": (data.get("home") or {}).get("formation", ""),
        "away_formation": (data.get("away") or {}).get("formation", ""),
        "home_missing": [_extract_missing(p) for p in (data.get("home") or {}).get("missingPlayers", [])],
        "away_missing": [_extract_missing(p) for p in (data.get("away") or {}).get("missingPlayers", [])],
    }


def _extract_player(slot: dict) -> dict:
    player = slot.get("player", {})
    return {
        "id": player.get("id"),
        "name": player.get("name", ""),
        "position": slot.get("position", "") or player.get("position", ""),
        "jersey": slot.get("jerseyNumber") or player.get("jerseyNumber"),
        "captain": slot.get("captain", False),
    }


def _extract_missing(slot: dict) -> dict:
    """Player absent (injured/suspended). Key info pour AB joueur-clé-out."""
    player = slot.get("player", {})
    return {
        "id": player.get("id"),
        "name": player.get("name", ""),
        "reason": slot.get("reason", ""),  # ex "Injured", "Suspended"
        "type": slot.get("type", ""),
    }


async def fetch_h2h_events(event_id: int, limit: int = 10) -> list[dict]:
    """Liste des derniers matchs H2H entre les 2 équipes/joueurs de cet event.

    Stratégie : récupère le customId de l'event puis appelle /h2h/events.
    L'endpoint /h2h/events nécessite le customId (string hash), pas le
    numeric event_id.
    """
    custom_id = await _fetch_custom_id(event_id)
    if not custom_id:
        return []
    try:
        data = await _fetch_json(f"/event/{custom_id}/h2h/events")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore h2h KO for %s: %s", event_id, exc)
        return []
    if not data:
        return []
    events = data.get("events", []) if isinstance(data, dict) else []
    return [_normalize_h2h(e) for e in events[:limit]]


async def _fetch_custom_id(event_id: int) -> str | None:
    """Récupère le customId (string hash) d'un event à partir de son ID numérique.

    Utile pour les endpoints qui exigent le customId (h2h/events, etc.).
    """
    try:
        data = await _fetch_json(f"/event/{event_id}")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore custom_id fetch KO for %s: %s", event_id, exc)
        return None
    if not data:
        return None
    return (data.get("event") or {}).get("customId")


async def fetch_h2h_stats(event_id: int) -> dict | None:
    """Stats agrégées H2H (wins home/draws/wins away). Endpoint direct event_id.

    Différent de fetch_h2h_events qui liste les matchs.
    """
    try:
        data = await _fetch_json(f"/event/{event_id}/h2h")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore h2h-stats KO for %s: %s", event_id, exc)
        return None
    return data


def _normalize_h2h(event: dict) -> dict:
    home = event.get("homeTeam", {})
    away = event.get("awayTeam", {})
    return {
        "kickoff_ts": event.get("startTimestamp"),
        "home_team": home.get("name", ""),
        "away_team": away.get("name", ""),
        "home_score": (event.get("homeScore") or {}).get("display"),
        "away_score": (event.get("awayScore") or {}).get("display"),
        "winner_code": event.get("winnerCode"),
        "tournament": (event.get("tournament") or {}).get("name", ""),
    }


async def fetch_statistics(event_id: int) -> dict | None:
    """Stats live d'un match (xG, possession, shots, …). Marche pendant match."""
    try:
        data = await _fetch_json(f"/event/{event_id}/statistics")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore stats KO for %s: %s", event_id, exc)
        return None
    return data


async def search_event_by_teams(
    sport: str,
    home_team: str,
    away_team: str,
    when: _date_t,
) -> dict | None:
    """Trouve l'event Sofascore correspondant aux 2 équipes pour une date.

    Stratégie : pull les events du jour, fuzzy match sur les noms d'équipes.
    """
    events = await fetch_scheduled_events(sport, when)
    if not events:
        return None
    norm_h = home_team.lower().strip()
    norm_a = away_team.lower().strip()
    for ev in events:
        sof_h = ev["home_team"].lower()
        sof_a = ev["away_team"].lower()
        if _teams_match(norm_h, sof_h) and _teams_match(norm_a, sof_a):
            return ev
    # Fallback : essayer home et away inversés
    for ev in events:
        sof_h = ev["home_team"].lower()
        sof_a = ev["away_team"].lower()
        if _teams_match(norm_h, sof_a) and _teams_match(norm_a, sof_h):
            return ev
    return None


def _teams_match(a: str, b: str) -> bool:
    """Fuzzy match : substring OU au moins 1 token ≥ 4 chars en commun."""
    a, b = a.strip(), b.strip()
    if a in b or b in a:
        return True
    tokens_a = {t for t in a.split() if len(t) >= 4}
    tokens_b = {t for t in b.split() if len(t) >= 4}
    return bool(tokens_a & tokens_b)


def has_key_player_out(lineups: dict | None, threshold: int = 1) -> tuple[bool, list[str]]:
    """Détecte si une équipe a ≥ threshold joueur clé absent (titulaire/star).

    Retourne (a_player_out, [noms_absents]).
    Heuristique : un missing avec reason="Injured" est considéré clé si
    `type` est "missing" (vs "doubtful" qui est incertain).
    """
    if not lineups:
        return False, []
    out_names: list[str] = []
    for missing in lineups.get("home_missing", []) + lineups.get("away_missing", []):
        if missing.get("type") in {"missing", "out"} and missing.get("reason") not in {"", None}:
            out_names.append(missing["name"])
    return len(out_names) >= threshold, out_names


# =============================================================================
# v4.7 ENRICHISSEMENT — endpoints supplémentaires pour "max info"
# =============================================================================


async def fetch_event_details(event_id: int) -> dict | None:
    """Détails complets d'un event : venue, referee, weather, ground type, season.

    Pour le tennis, ground_type donne la surface (Clay/Hard/Grass).
    Pour le foot, weather peut contenir température + conditions au coup d'envoi.
    """
    try:
        data = await _fetch_json(f"/event/{event_id}")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore event KO for %s: %s", event_id, exc)
        return None
    if not data:
        return None
    event = data.get("event", {}) if isinstance(data, dict) else {}
    if not event:
        return None
    home = event.get("homeTeam", {})
    away = event.get("awayTeam", {})
    tournament = event.get("tournament", {})
    venue = event.get("venue") or {}
    season = event.get("season") or {}
    round_info = event.get("roundInfo") or {}
    return {
        "event_id": event.get("id"),
        "home_team": home.get("name", ""),
        "home_team_id": home.get("id"),
        "away_team": away.get("name", ""),
        "away_team_id": away.get("id"),
        "tournament": tournament.get("name", ""),
        "tournament_id": tournament.get("id"),
        "unique_tournament_id": (tournament.get("uniqueTournament") or {}).get("id"),
        "season_name": season.get("name", ""),
        "season_id": season.get("id"),
        "round": round_info.get("round"),
        "round_name": round_info.get("name", ""),
        "kickoff_ts": event.get("startTimestamp"),
        "status_code": (event.get("status") or {}).get("code"),
        "status_description": (event.get("status") or {}).get("description", ""),
        "venue_name": venue.get("name", ""),
        "venue_city": (venue.get("city") or {}).get("name", ""),
        "venue_country": (venue.get("country") or {}).get("name", ""),
        "venue_capacity": venue.get("capacity"),
        "referee_name": (event.get("referee") or {}).get("name", ""),
        "referee_country": ((event.get("referee") or {}).get("country") or {}).get("name", ""),
        "weather": event.get("weatherForecast"),
        "ground_type": event.get("groundType", ""),
        "best_of": event.get("defaultPeriodCount"),
        "home_score": (event.get("homeScore") or {}).get("display"),
        "away_score": (event.get("awayScore") or {}).get("display"),
        "winner_code": event.get("winnerCode"),
        "has_xg": event.get("hasXg"),
        "has_global_highlights": event.get("hasGlobalHighlights"),
    }


async def fetch_incidents(event_id: int) -> list[dict]:
    """Timeline des incidents (buts, cartons, subs, blessures, périodes).

    Utile post-match pour outcome verification (qui a marqué quand).
    Utile pré-match aussi pour H2H récents : voir comment se sont décidés
    les derniers matchs (penalty, prolongation, etc.).
    """
    try:
        data = await _fetch_json(f"/event/{event_id}/incidents")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore incidents KO for %s: %s", event_id, exc)
        return []
    if not data:
        return []
    incidents = data.get("incidents", []) if isinstance(data, dict) else []
    return [_normalize_incident(i) for i in incidents]


def _normalize_incident(inc: dict) -> dict:
    return {
        "type": inc.get("incidentType", ""),
        "class": inc.get("incidentClass", ""),
        "minute": inc.get("time"),
        "added_minute": inc.get("addedTime"),
        "player": (inc.get("player") or {}).get("name", ""),
        "player_in": (inc.get("playerIn") or {}).get("name", ""),
        "player_out": (inc.get("playerOut") or {}).get("name", ""),
        "assist1": (inc.get("assist1") or {}).get("name", ""),
        "is_home": inc.get("isHome"),
        "reason": inc.get("reason", ""),
        "description": inc.get("description", ""),
        "home_score": inc.get("homeScore"),
        "away_score": inc.get("awayScore"),
    }


async def fetch_win_probability(event_id: int) -> dict | None:
    """Win probability propriétaire Sofascore (sharp data, modèle interne).

    Renvoie {home_win, draw, away_win} en proba (0-1).
    Disponible pré-match et en live pour la plupart des matchs majeurs.
    """
    try:
        data = await _fetch_json(f"/event/{event_id}/win-probability")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore win-prob KO for %s: %s", event_id, exc)
        return None
    if not data:
        return None
    return {
        "home_win": data.get("homeWin"),
        "draw": data.get("draw"),
        "away_win": data.get("awayWin"),
    }


async def fetch_team_streaks(event_id: int) -> dict | None:
    """Streaks pré-match : séries en cours pour chaque équipe.

    Ex: "5 victoires d'affilée à domicile", "8 matchs sans encaisser",
    "0 victoire en 6 confrontations sur cette surface".
    """
    try:
        data = await _fetch_json(f"/event/{event_id}/team-streaks")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore team-streaks KO for %s: %s", event_id, exc)
        return None
    if not data:
        return None
    return {
        "home_streaks": data.get("home", []),
        "away_streaks": data.get("away", []),
        "general": data.get("general", []),
    }


async def fetch_pregame_form(event_id: int) -> dict | None:
    """Forme pré-match : 5 derniers résultats + position au classement.

    Pour le foot, renvoie ex: ["W","W","D","L","W"] et position dans la ligue.
    Pour le tennis, les "form values" reflètent la confiance Sofascore.
    """
    try:
        data = await _fetch_json(f"/event/{event_id}/pregame-form")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore pregame-form KO for %s: %s", event_id, exc)
        return None
    if not data:
        return None
    return {
        "home_form": (data.get("homeTeam") or {}).get("form", []),
        "home_position": (data.get("homeTeam") or {}).get("position"),
        "home_value": (data.get("homeTeam") or {}).get("value"),
        "away_form": (data.get("awayTeam") or {}).get("form", []),
        "away_position": (data.get("awayTeam") or {}).get("position"),
        "away_value": (data.get("awayTeam") or {}).get("value"),
        "label": data.get("label", ""),
    }


async def fetch_event_graph(event_id: int) -> dict | None:
    """Momentum graph — données de tempo pendant le match (post/live).

    Utilisé pour analyser comment s'est déroulée la dynamique.
    """
    try:
        return await _fetch_json(f"/event/{event_id}/graph")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore graph KO for %s: %s", event_id, exc)
        return None


async def fetch_event_odds(event_id: int) -> dict | None:
    """Cotes pré-match côté Sofascore (markets multiples, providers internes)."""
    try:
        return await _fetch_json(f"/event/{event_id}/odds/1/all")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore odds KO for %s: %s", event_id, exc)
        return None


async def fetch_best_players(event_id: int) -> dict | None:
    """Best players du match (note + key stats). Post-match uniquement."""
    try:
        return await _fetch_json(f"/event/{event_id}/best-players/summary")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore best-players KO for %s: %s", event_id, exc)
        return None


# =============================================================================
# PLAYER endpoints — bio, stats, derniers matchs
# =============================================================================


async def fetch_player_details(player_id: int) -> dict | None:
    """Bio joueur : âge, taille, pays, classement (tennis), équipe actuelle."""
    try:
        data = await _fetch_json(f"/player/{player_id}")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore player KO for %s: %s", player_id, exc)
        return None
    if not data:
        return None
    player = data.get("player", {}) if isinstance(data, dict) else {}
    if not player:
        return None
    team = player.get("team") or {}
    return {
        "player_id": player.get("id"),
        "name": player.get("name", ""),
        "short_name": player.get("shortName", ""),
        "slug": player.get("slug", ""),
        "position": player.get("position", ""),
        "jersey_number": player.get("jerseyNumber", ""),
        "height": player.get("height"),
        "preferred_foot": player.get("preferredFoot", ""),
        "country": (player.get("country") or {}).get("name", ""),
        "nationality": (player.get("country") or {}).get("alpha2", ""),
        "date_of_birth_ts": player.get("dateOfBirthTimestamp"),
        "ranking": player.get("ranking"),
        "current_team": team.get("name", ""),
        "current_team_id": team.get("id"),
        "market_value": player.get("proposedMarketValue"),
    }


async def fetch_player_last_year_summary(player_id: int) -> dict | None:
    """Résumé performance des 12 derniers mois (heatmap + forme)."""
    try:
        return await _fetch_json(f"/player/{player_id}/last-year-summary")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore player-summary KO for %s: %s", player_id, exc)
        return None


async def fetch_player_statistics_seasons(player_id: int) -> dict | None:
    """Liste des saisons avec stats disponibles (pour drilling sur une saison)."""
    try:
        return await _fetch_json(f"/player/{player_id}/statistics/seasons")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore player-seasons KO for %s: %s", player_id, exc)
        return None


async def fetch_player_last_events(player_id: int, page: int = 0) -> list[dict]:
    """Derniers matchs du joueur, ~20 par page. Tennis-friendly."""
    try:
        data = await _fetch_json(f"/player/{player_id}/events/last/{page}")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore player-events KO for %s: %s", player_id, exc)
        return []
    if not data:
        return []
    events = data.get("events", []) if isinstance(data, dict) else []
    return [_normalize_event_short(e) for e in events]


def _normalize_event_short(event: dict) -> dict:
    home = event.get("homeTeam", {})
    away = event.get("awayTeam", {})
    return {
        "event_id": event.get("id"),
        "kickoff_ts": event.get("startTimestamp"),
        "tournament": (event.get("tournament") or {}).get("name", ""),
        "home_team": home.get("name", ""),
        "home_team_id": home.get("id"),
        "away_team": away.get("name", ""),
        "away_team_id": away.get("id"),
        "home_score": (event.get("homeScore") or {}).get("display"),
        "away_score": (event.get("awayScore") or {}).get("display"),
        "winner_code": event.get("winnerCode"),
        "ground_type": event.get("groundType", ""),
        "round": (event.get("roundInfo") or {}).get("name", ""),
    }


# =============================================================================
# TEAM endpoints — bio, derniers matchs, perf globale
# =============================================================================


async def fetch_team_details(team_id: int) -> dict | None:
    """Bio équipe : pays, manager, stade, tournoi principal."""
    try:
        data = await _fetch_json(f"/team/{team_id}")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore team KO for %s: %s", team_id, exc)
        return None
    if not data:
        return None
    team = data.get("team", {}) if isinstance(data, dict) else {}
    if not team:
        return None
    venue = team.get("venue") or {}
    stadium = venue.get("stadium") or {}
    manager = team.get("manager") or {}
    primary = team.get("primaryUniqueTournament") or {}
    return {
        "team_id": team.get("id"),
        "name": team.get("name", ""),
        "short_name": team.get("shortName", ""),
        "country": (team.get("country") or {}).get("name", ""),
        "manager": manager.get("name", ""),
        "manager_id": manager.get("id"),
        "venue": stadium.get("name", ""),
        "venue_capacity": stadium.get("capacity"),
        "venue_city": (venue.get("city") or {}).get("name", ""),
        "primary_tournament": primary.get("name", ""),
        "primary_tournament_id": primary.get("id"),
        "founded": team.get("foundationDateTimestamp"),
    }


async def fetch_team_last_events(team_id: int, page: int = 0) -> list[dict]:
    """Derniers matchs joués par l'équipe (~20 par page)."""
    try:
        data = await _fetch_json(f"/team/{team_id}/events/last/{page}")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore team-events KO for %s: %s", team_id, exc)
        return []
    if not data:
        return []
    events = data.get("events", []) if isinstance(data, dict) else []
    return [_normalize_event_short(e) for e in events]


async def fetch_team_performance(team_id: int) -> dict | None:
    """Performance globale équipe (forme actuelle, ratio victoires sur saison)."""
    try:
        return await _fetch_json(f"/team/{team_id}/performance")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore team-perf KO for %s: %s", team_id, exc)
        return None


# =============================================================================
# RANKINGS & STANDINGS — classements ATP/WTA + standings ligues
# =============================================================================

RANKING_TYPE_IDS: dict[str, int] = {
    "atp": 5,
    "wta": 6,
    "atp_live": 2,
    "wta_live": 7,
}


async def fetch_rankings(category: str, limit: int = 100) -> list[dict]:
    """Classement ATP/WTA (live ou officiel).

    category: 'atp', 'wta', 'atp_live', 'wta_live'.
    """
    type_id = RANKING_TYPE_IDS.get(category.lower())
    if type_id is None:
        logger.warning("sofascore: ranking category inconnue: %s", category)
        return []
    try:
        data = await _fetch_json(f"/rankings/type/{type_id}")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore rankings KO for %s: %s", category, exc)
        return []
    if not data:
        return []
    rows = data.get("rankings", []) if isinstance(data, dict) else []
    return [_normalize_ranking(r) for r in rows[:limit]]


def _normalize_ranking(row: dict) -> dict:
    team = row.get("team") or {}
    return {
        "rank": row.get("ranking"),
        "previous_rank": row.get("previousRanking"),
        "points": row.get("points"),
        "best_ranking": row.get("bestRanking"),
        "player_id": team.get("id"),
        "name": team.get("name", ""),
        "country": (team.get("country") or {}).get("name", ""),
        "tournaments_played": row.get("tournamentsPlayed"),
    }


async def fetch_standings(tournament_id: int, season_id: int) -> list[dict]:
    """Classement complet d'un tournoi/saison (ex: Premier League 2025-26)."""
    return await _fetch_standings(tournament_id, season_id, "total")


async def fetch_standings_home(tournament_id: int, season_id: int) -> list[dict]:
    """Classement à domicile uniquement (foot)."""
    return await _fetch_standings(tournament_id, season_id, "home")


async def fetch_standings_away(tournament_id: int, season_id: int) -> list[dict]:
    """Classement à l'extérieur uniquement (foot)."""
    return await _fetch_standings(tournament_id, season_id, "away")


async def _fetch_standings(tournament_id: int, season_id: int, kind: str) -> list[dict]:
    try:
        data = await _fetch_json(
            f"/unique-tournament/{tournament_id}/season/{season_id}/standings/{kind}"
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore standings/%s KO for %s/%s: %s", kind, tournament_id, season_id, exc)
        return []
    if not data:
        return []
    standings = data.get("standings", []) if isinstance(data, dict) else []
    if not standings:
        return []
    rows = standings[0].get("rows", []) if standings else []
    return [_normalize_standing(r) for r in rows]


def _normalize_standing(row: dict) -> dict:
    team = row.get("team", {})
    return {
        "position": row.get("position"),
        "team": team.get("name", ""),
        "team_id": team.get("id"),
        "matches": row.get("matches"),
        "wins": row.get("wins"),
        "draws": row.get("draws"),
        "losses": row.get("losses"),
        "goals_for": row.get("scoresFor"),
        "goals_against": row.get("scoresAgainst"),
        "points": row.get("points"),
    }


# =============================================================================
# v4.7 CHERRY-PICK depuis tommhe14/sofascore-wrapper (MIT) — endpoints à fort ROI
# =============================================================================


async def search_entities(query: str, page: int = 0) -> dict:
    """Search universel : joueurs, équipes, matchs, ligues, managers.

    Endpoint clé pour résoudre un nom textuel en ID Sofascore.
    Retourne {results: [...]} avec un champ 'type' par résultat.
    """
    safe_q = query.strip().replace(" ", "%20")
    try:
        data = await _fetch_json(f"/search/all/?q={safe_q}&page={page}")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore search KO for '%s': %s", query, exc)
        return {"results": []}
    return data or {"results": []}


async def search_player_or_team(query: str, page: int = 0) -> dict:
    """Search ciblé joueur/équipe (plus précis que search_entities)."""
    safe_q = query.strip().replace(" ", "%20")
    try:
        data = await _fetch_json(f"/search/player-team-persons/?q={safe_q}&page={page}")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore search player/team KO for '%s': %s", query, exc)
        return {"results": []}
    return data or {"results": []}


async def fetch_league_info(league_id: int) -> dict | None:
    """Bio d'une ligue/tournoi (nom, pays, niveau, sport)."""
    try:
        data = await _fetch_json(f"/unique-tournament/{league_id}")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore league KO for %s: %s", league_id, exc)
        return None
    if not data:
        return None
    ut = data.get("uniqueTournament", {}) if isinstance(data, dict) else {}
    if not ut:
        return None
    return {
        "league_id": ut.get("id"),
        "name": ut.get("name", ""),
        "slug": ut.get("slug", ""),
        "country": (ut.get("category") or {}).get("name", ""),
        "sport": ((ut.get("category") or {}).get("sport") or {}).get("name", ""),
        "user_count": ut.get("userCount"),
        "has_position_graph": ut.get("hasPositionGraph"),
        "has_player_statistics": ut.get("hasEventPlayerStatistics"),
        "current_season_id": (ut.get("currentSeason") or {}).get("id"),
        "current_season_year": (ut.get("currentSeason") or {}).get("year", ""),
    }


async def fetch_league_seasons(league_id: int) -> list[dict]:
    """Liste de toutes les saisons disponibles pour une ligue.

    La 1ère entrée est typiquement la saison en cours (utile pour
    l'auto-discovery du season_id).
    """
    try:
        data = await _fetch_json(f"/unique-tournament/{league_id}/seasons")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore league-seasons KO for %s: %s", league_id, exc)
        return []
    if not data:
        return []
    seasons = data.get("seasons", []) if isinstance(data, dict) else []
    return [
        {"id": s.get("id"), "name": s.get("name", ""), "year": s.get("year", "")}
        for s in seasons
    ]


async def get_current_season_id(league_id: int) -> int | None:
    """Helper : retourne l'ID de la saison en cours d'une ligue.

    Stratégie 1 : `/unique-tournament/{id}` → currentSeason.id
    Fallback : `/unique-tournament/{id}/seasons` → premier élément
    """
    info = await fetch_league_info(league_id)
    if info and info.get("current_season_id"):
        return info["current_season_id"]
    seasons = await fetch_league_seasons(league_id)
    if seasons:
        return seasons[0].get("id")
    return None


async def fetch_league_rounds(league_id: int, season_id: int) -> dict | None:
    """Liste des journées d'une saison + journée en cours."""
    try:
        data = await _fetch_json(
            f"/unique-tournament/{league_id}/season/{season_id}/rounds"
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore rounds KO for %s/%s: %s", league_id, season_id, exc)
        return None
    if not data:
        return None
    return {
        "current_round": (data.get("currentRound") or {}).get("round"),
        "current_round_name": (data.get("currentRound") or {}).get("name", ""),
        "rounds": data.get("rounds", []),
    }


async def fetch_league_fixtures_round(
    league_id: int, season_id: int, round_number: int
) -> list[dict]:
    """Tous les matchs d'une journée précise (ex: J35 PL 2025-26)."""
    try:
        data = await _fetch_json(
            f"/unique-tournament/{league_id}/season/{season_id}/events/round/{round_number}"
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "sofascore fixtures-round KO for %s/%s/r%s: %s",
            league_id, season_id, round_number, exc,
        )
        return []
    if not data:
        return []
    events = data.get("events", []) if isinstance(data, dict) else []
    return [_normalize_event_short(e) for e in events]


async def fetch_top_players_league(
    league_id: int, season_id: int
) -> dict | None:
    """Top scorers / passeurs / etc. d'une saison de ligue.

    Format : {goals: [...], assists: [...], yellowCards: [...], ...}.
    """
    try:
        return await _fetch_json(
            f"/unique-tournament/{league_id}/season/{season_id}/top-players/overall"
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore top-players KO for %s/%s: %s", league_id, season_id, exc)
        return None


async def fetch_top_teams_league(
    league_id: int, season_id: int
) -> dict | None:
    """Top équipes d'une saison (ratings, goals scored, clean sheets, etc.)."""
    try:
        return await _fetch_json(
            f"/unique-tournament/{league_id}/season/{season_id}/top-teams/overall"
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore top-teams KO for %s/%s: %s", league_id, season_id, exc)
        return None


async def fetch_team_next_events(team_id: int, page: int = 0) -> list[dict]:
    """Prochains matchs programmés pour l'équipe (~20 par page)."""
    try:
        data = await _fetch_json(f"/team/{team_id}/events/next/{page}")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore team-next KO for %s: %s", team_id, exc)
        return []
    if not data:
        return []
    events = data.get("events", []) if isinstance(data, dict) else []
    return [_normalize_event_short(e) for e in events]


async def fetch_team_squad(team_id: int) -> list[dict]:
    """Effectif complet de l'équipe (joueurs avec position, âge, pays)."""
    try:
        data = await _fetch_json(f"/team/{team_id}/players")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore team-squad KO for %s: %s", team_id, exc)
        return []
    if not data:
        return []
    players = data.get("players", []) if isinstance(data, dict) else []
    out: list[dict] = []
    for entry in players:
        player = entry.get("player") or entry
        if not player:
            continue
        out.append({
            "player_id": player.get("id"),
            "name": player.get("name", ""),
            "short_name": player.get("shortName", ""),
            "position": player.get("position", ""),
            "jersey_number": player.get("jerseyNumber"),
            "country": (player.get("country") or {}).get("name", ""),
            "date_of_birth_ts": player.get("dateOfBirthTimestamp"),
            "market_value": player.get("proposedMarketValue"),
        })
    return out


async def fetch_team_transfers(team_id: int) -> dict | None:
    """Transferts in/out de l'équipe (mercato courant + précédents)."""
    try:
        return await _fetch_json(f"/team/{team_id}/transfers")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore team-transfers KO for %s: %s", team_id, exc)
        return None


async def fetch_team_league_stats(
    team_id: int, league_id: int, season_id: int
) -> dict | None:
    """Stats d'équipe dans une ligue/saison (xG, possession, shots, etc.)."""
    try:
        return await _fetch_json(
            f"/team/{team_id}/unique-tournament/{league_id}/season/{season_id}/statistics/overall"
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "sofascore team-league-stats KO for %s/%s/%s: %s",
            team_id, league_id, season_id, exc,
        )
        return None


async def fetch_match_votes(event_id: int) -> dict | None:
    """Votes des utilisateurs Sofascore avant le match (sentiment public).

    Format : {vote1: int, voteX: int, vote2: int} — utile pour détecter
    un excès de hype d'un côté (signal de pari contrarien).
    """
    try:
        data = await _fetch_json(f"/event/{event_id}/votes")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore votes KO for %s: %s", event_id, exc)
        return None
    if not data:
        return None
    vote = data.get("vote") or data
    return {
        "vote_home": vote.get("vote1"),
        "vote_draw": vote.get("voteX"),
        "vote_away": vote.get("vote2"),
    }


async def fetch_shotmap(event_id: int, team_id: int | None = None) -> dict | None:
    """Shotmap d'un match (post-match foot). Si team_id, filtre par équipe."""
    suffix = f"/{team_id}" if team_id else ""
    try:
        return await _fetch_json(f"/event/{event_id}/shotmap{suffix}")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore shotmap KO for %s: %s", event_id, exc)
        return None


async def fetch_event_managers(event_id: int) -> dict | None:
    """Managers/coachs du match."""
    try:
        return await _fetch_json(f"/event/{event_id}/managers")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore managers KO for %s: %s", event_id, exc)
        return None


async def fetch_event_comments(event_id: int) -> dict | None:
    """Commentaires textuels live du match (mini-rapport)."""
    try:
        return await _fetch_json(f"/event/{event_id}/comments")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore comments KO for %s: %s", event_id, exc)
        return None


async def fetch_win_probability_graph(event_id: int) -> dict | None:
    """Graphe temporel de la win-probability (évolution pendant le match)."""
    try:
        return await _fetch_json(f"/event/{event_id}/graph/win-probability")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore win-prob-graph KO for %s: %s", event_id, exc)
        return None


async def fetch_player_transfer_history(player_id: int) -> list[dict]:
    """Historique des transferts du joueur."""
    try:
        data = await _fetch_json(f"/player/{player_id}/transfer-history")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore transfer-history KO for %s: %s", player_id, exc)
        return []
    if not data:
        return []
    transfers = data.get("transferHistory", []) if isinstance(data, dict) else []
    return transfers


async def fetch_player_attributes(player_id: int) -> dict | None:
    """Attributs (style de jeu) du joueur : 'attacking', 'creativity', etc."""
    try:
        return await _fetch_json(f"/player/{player_id}/attribute-overviews")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore attributes KO for %s: %s", player_id, exc)
        return None


async def fetch_player_national_stats(player_id: int) -> dict | None:
    """Stats en sélection nationale du joueur."""
    try:
        return await _fetch_json(f"/player/{player_id}/national-team-statistics")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore national-stats KO for %s: %s", player_id, exc)
        return None


async def fetch_player_unique_tournaments(player_id: int) -> dict | None:
    """Liste des compétitions où le joueur a évolué (avec saison_ids associés)."""
    try:
        return await _fetch_json(f"/player/{player_id}/unique-tournaments")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore player-unique-tournaments KO for %s: %s", player_id, exc)
        return None


async def fetch_player_league_stats(
    player_id: int, league_id: int, season_id: int
) -> dict | None:
    """Stats joueur dans une ligue/saison précise (goals, assists, xG, rating)."""
    try:
        return await _fetch_json(
            f"/player/{player_id}/unique-tournament/{league_id}/season/{season_id}/statistics/overall"
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "sofascore player-league-stats KO for %s/%s/%s: %s",
            player_id, league_id, season_id, exc,
        )
        return None


# =============================================================================
# v4.7 — Cherry-pick depuis ScraperFC (oseymour/ScraperFC, MIT)
# Endpoints utilitaires foot/basket peu connus mais utiles pour l'analyse tactique
# =============================================================================


async def fetch_average_positions(event_id: int) -> dict | None:
    """Positions moyennes des joueurs sur le terrain pendant le match (foot).

    Renvoie pour chaque joueur les coordonnées x/y moyennes. Utile pour
    visualiser la formation réellement jouée (vs annoncée) et détecter
    si un joueur a tenu son poste ou a beaucoup décroché.
    """
    try:
        return await _fetch_json(f"/event/{event_id}/average-positions")
    except Exception as exc:  # noqa: BLE001
        logger.warning("sofascore avg-positions KO for %s: %s", event_id, exc)
        return None


async def fetch_player_heatmap(event_id: int, player_id: int) -> dict | None:
    """Heatmap individuelle d'un joueur sur un match donné (foot/basket).

    Renvoie une liste de points x/y avec densité de présence. Utile pour
    voir où un joueur clé a réellement joué (zones d'influence).
    """
    try:
        return await _fetch_json(f"/event/{event_id}/player/{player_id}/heatmap")
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "sofascore player-heatmap KO for %s/%s: %s", event_id, player_id, exc
        )
        return None


async def fetch_league_players(league_id: int, season_id: int) -> list[dict]:
    """Liste de TOUS les joueurs d'une saison de ligue (avec leurs équipes).

    Utile pour identifier le pool de joueurs à monitorer (top scorers,
    sleepers, retours de blessure imminents).
    """
    try:
        data = await _fetch_json(
            f"/unique-tournament/{league_id}/season/{season_id}/players"
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "sofascore league-players KO for %s/%s: %s", league_id, season_id, exc
        )
        return []
    if not data:
        return []
    return data.get("players", []) if isinstance(data, dict) else []


async def fetch_league_teams(league_id: int, season_id: int) -> list[dict]:
    """Liste de toutes les équipes d'une saison de ligue (avec IDs Sofascore).

    Permet de mapper rapidement nom → team_id pour une ligue donnée
    (alternative à search_player_or_team).
    """
    try:
        data = await _fetch_json(
            f"/unique-tournament/{league_id}/season/{season_id}/teams"
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "sofascore league-teams KO for %s/%s: %s", league_id, season_id, exc
        )
        return []
    if not data:
        return []
    return data.get("teams", []) if isinstance(data, dict) else []
