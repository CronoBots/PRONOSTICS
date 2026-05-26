"""Match context aggregator — combine tous les endpoints SofaScore en 1 appel.

Pour un event donné, fait des appels parallèles vers les endpoints
pertinents et retourne un objet riche unique. Utilisé par l'agent
nexbet-analyst pour éviter ~10 appels séquentiels.

Usage :
    from app.adapters.match_context import build_match_context

    ctx = await build_match_context(event_id=12345678)
    # ctx["event"], ctx["lineups"], ctx["h2h"], ctx["win_probability"], ...

Smart fields : selon le sport détecté dans event_details, certains champs
sont skip (ex: win_probability/pregame_form non appelés sur tennis car
toujours vides).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.adapters import sofascore

logger = logging.getLogger(__name__)


# Sports où win_probability + pregame_form retournent des données
_WP_PG_SUPPORTED = {"football", "basketball", "ice-hockey", "american-football"}


def _detect_sport(event_details: dict | None) -> str:
    """Devine le sport depuis event_details (via tournament category)."""
    if not event_details:
        return ""
    # event_details n'expose pas directement le sport, on l'infère du contexte
    # En pratique l'agent fournit déjà sport en input — c'est un best-effort.
    return ""


async def build_match_context(
    event_id: int,
    sport: str | None = None,
    include_lineups: bool = True,
    include_h2h: bool = True,
    include_player_bios: bool = False,
) -> dict[str, Any]:
    """Aggregator principal — retourne un dict avec tous les blocs disponibles.

    Args:
        event_id: ID Sofascore de l'event
        sport: nom du sport interne ('tennis', 'football', 'basketball') —
            permet de skip les endpoints non supportés (ex: win_probability
            sur tennis). Si None, tous les endpoints sont tentés.
        include_lineups: appeler fetch_lineups (foot/basket surtout)
        include_h2h: appeler fetch_h2h_events + fetch_h2h_stats
        include_player_bios: pour tennis, fetch_player_details des 2
            joueurs (requiert 1 round-trip supplémentaire pour avoir les IDs)

    Returns:
        dict avec les clés event, lineups, h2h_events, h2h_stats,
        win_probability, pregame_form, team_streaks, match_votes,
        incidents, managers, players (si tennis + include_player_bios).
        Les clés vides → valeur None.
    """
    out: dict[str, Any] = {
        "event_id": event_id,
        "sport": sport,
    }

    # === Phase 1 : appels parallèles toujours faits ===
    tasks: dict[str, Any] = {
        "event": sofascore.fetch_event_details(event_id),
        "match_votes": sofascore.fetch_match_votes(event_id),
        "team_streaks": sofascore.fetch_team_streaks(event_id),
        "incidents": sofascore.fetch_incidents(event_id),
        "managers": sofascore.fetch_event_managers(event_id),
    }

    if include_h2h:
        tasks["h2h_events"] = sofascore.fetch_h2h_events(event_id)
        tasks["h2h_stats"] = sofascore.fetch_h2h_stats(event_id)

    if include_lineups:
        tasks["lineups"] = sofascore.fetch_lineups(event_id)

    # Endpoints conditionnels au sport
    wp_pg_likely = (sport is None) or (sport in _WP_PG_SUPPORTED)
    if wp_pg_likely:
        tasks["win_probability"] = sofascore.fetch_win_probability(event_id)
        tasks["pregame_form"] = sofascore.fetch_pregame_form(event_id)

    keys = list(tasks.keys())
    coros = list(tasks.values())
    results = await asyncio.gather(*coros, return_exceptions=True)

    for key, res in zip(keys, results):
        if isinstance(res, Exception):
            logger.warning("match_context: %s a échoué pour %s: %s", key, event_id, res)
            out[key] = None
        else:
            out[key] = res

    # === Phase 2 : player bios (tennis) — séquentiel après event ===
    if include_player_bios and out.get("event"):
        ev = out["event"]
        home_id = ev.get("home_team_id")
        away_id = ev.get("away_team_id")
        if home_id and away_id:
            bios = await asyncio.gather(
                sofascore.fetch_player_details(home_id),
                sofascore.fetch_player_details(away_id),
                return_exceptions=True,
            )
            out["home_player"] = bios[0] if not isinstance(bios[0], Exception) else None
            out["away_player"] = bios[1] if not isinstance(bios[1], Exception) else None

    return out


async def build_match_context_by_teams(
    sport: str,
    home_team: str,
    away_team: str,
    when,  # date
    **kwargs,
) -> dict[str, Any] | None:
    """Cherche d'abord l'event Sofascore par nom des équipes/joueurs, puis aggrège.

    Pratique quand on a juste les noms (ex: depuis Odds API) et pas l'event_id.
    """
    ev = await sofascore.search_event_by_teams(sport, home_team, away_team, when)
    if not ev or not ev.get("event_id"):
        return None
    return await build_match_context(ev["event_id"], sport=sport, **kwargs)


def summarize_for_agent(ctx: dict[str, Any]) -> dict[str, Any]:
    """Vue condensée d'un match_context pour utilisation directe par l'agent.

    Réduit le volume de données à l'essentiel utile pour le pricing
    (event meta, win-prob, forme, key absents, sentiment public).
    """
    event = ctx.get("event") or {}
    wp = ctx.get("win_probability") or {}
    pg = ctx.get("pregame_form") or {}
    votes = ctx.get("match_votes") or {}
    lineups = ctx.get("lineups") or {}
    h2h_stats = ctx.get("h2h_stats") or {}
    streaks = ctx.get("team_streaks") or {}

    has_out_home, names_out_home = sofascore.has_key_player_out(
        {"home_missing": lineups.get("home_missing", []), "away_missing": []}
    ) if lineups else (False, [])
    has_out_away, names_out_away = sofascore.has_key_player_out(
        {"home_missing": [], "away_missing": lineups.get("away_missing", [])}
    ) if lineups else (False, [])

    summary = {
        "event_id": event.get("event_id"),
        "home": event.get("home_team"),
        "away": event.get("away_team"),
        "tournament": event.get("tournament"),
        "round": event.get("round_name") or event.get("round"),
        "venue": event.get("venue_name"),
        "ground_type": event.get("ground_type"),
        "kickoff_ts": event.get("kickoff_ts"),
        # Win-prob (foot/basket)
        "win_prob_home": wp.get("home_win"),
        "win_prob_away": wp.get("away_win"),
        "win_prob_draw": wp.get("draw"),
        # Forme (foot/basket)
        "home_form": pg.get("home_form"),
        "home_position": pg.get("home_position"),
        "away_form": pg.get("away_form"),
        "away_position": pg.get("away_position"),
        # Sentiment public
        "public_vote_home": votes.get("vote_home"),
        "public_vote_draw": votes.get("vote_draw"),
        "public_vote_away": votes.get("vote_away"),
        # Absents clés
        "home_key_out": names_out_home if has_out_home else [],
        "away_key_out": names_out_away if has_out_away else [],
        # H2H
        "h2h_recent_count": len(ctx.get("h2h_events") or []),
        "h2h_aggregate": h2h_stats,
        # Streaks
        "streaks_home": streaks.get("home_streaks", [])[:3],
        "streaks_away": streaks.get("away_streaks", [])[:3],
    }
    return summary
