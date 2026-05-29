#!/usr/bin/env python3
"""Shared client for the operator-hosted Roland Garros API.

A thin, dependency-light wrapper around the operator-hosted tennis data API
(a FastAPI service over the free SofaScore source). It is meant to be the
single shared coupling point to that API for two callers:

  - the NEXBET agent  → odds / analysis / h2h / player form (daily analysis)
  - auto_settle (later)→ :func:`fetch_match_score` returns a
                         ``settle_rules.MatchScore`` for the tennis path

This module is intentionally standalone: importing it does NOT pull in the
settlement stack (the ``MatchScore`` import is lazy, inside the one function
that needs it), so the agent can use the ``get_*`` wrappers without dragging
in ``settle_rules`` / ``picks_data``.

IMPORTANT — this does NOT modify auto_settle.py. auto_settle currently uses
its own ESPN provider; wiring this client in is a separate, opt-in step.

Scope
-----
The upstream API covers **Roland Garros singles** (ATP men / WTA women)
only. Labels that don't resolve to an RG singles match (football, basket,
doubles, other tournaments) return ``None`` — never an exception.

AB-7 (bookmaker-agnostic)
-------------------------
The upstream API exposes named-bookmaker odds. This client NEVER surfaces
the bookmaker name: odds are normalised to generic markets and every payload
reports ``source="rg-api"``.

Env
---
  NEXBET_RG_API_URL      base URL (default: https://api.betsfix.com)
  NEXBET_RG_API_KEY      optional bearer token (sent as Authorization)
  NEXBET_RG_API_TIMEOUT  per-request timeout, seconds (default: 20)

CLI (manual probe — run from a non-blocked / residential machine)
-----------------------------------------------------------------
    python3 rg_api.py "Alcaraz bat Sinner"
    python3 rg_api.py --kind odds      "Sinner vainqueur du match"
    python3 rg_api.py --kind analysis  "Świątek bat Gauff"
    python3 rg_api.py --kind parse     "Plus de 21.5 jeux — Alcaraz/Sinner"
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
from typing import Any, Optional

import requests

# --- config -----------------------------------------------------------------

BASE_URL = os.environ.get("NEXBET_RG_API_URL", "https://api.betsfix.com").rstrip("/")
API_KEY = os.environ.get("NEXBET_RG_API_KEY", "")
TIMEOUT = float(os.environ.get("NEXBET_RG_API_TIMEOUT", "20"))

#: Every payload this client returns is tagged with this source, never the
#: upstream bookmaker name (AB-7).
SOURCE = "rg-api"

#: Tours the upstream API knows about. Searches sweep both unless a tour is
#: already known (e.g. carried on a resolved match dict).
TOURS = ("atp", "wta")

_session = requests.Session()
_session.headers.update(
    {"Accept": "application/json", "User-Agent": "nexbet-rg-client/1.0"}
)
if API_KEY:
    _session.headers["Authorization"] = f"Bearer {API_KEY}"


class RGApiError(RuntimeError):
    """Hard provider failure (network down, 5xx, bad JSON).

    Distinct from "no data": a missing match / empty result is returned as
    ``None`` so a settlement caller can simply retry later. An ``RGApiError``
    means something is actually wrong and the operator should look.
    """


# --- low-level HTTP ---------------------------------------------------------


def _get(path: str, **params: Any) -> Any:
    """GET ``path`` and return parsed JSON; ``None`` when there is no data.

    404 / 422 → ``None`` (no data). 5xx / connection error / invalid JSON →
    :class:`RGApiError`.
    """
    url = f"{BASE_URL}{path}"
    clean = {k: v for k, v in params.items() if v is not None}
    try:
        resp = _session.get(url, params=clean, timeout=TIMEOUT)
    except requests.RequestException as exc:
        raise RGApiError(f"GET {path} failed: {exc}") from exc

    if resp.status_code in (404, 422):
        return None
    if resp.status_code >= 500:
        raise RGApiError(f"GET {path} -> HTTP {resp.status_code}")
    if resp.status_code != 200:
        return None
    try:
        return resp.json()
    except ValueError as exc:
        raise RGApiError(f"GET {path}: invalid JSON") from exc


# --- thin endpoint wrappers (full surface for the agent) --------------------


def get_matches(
    tour: str = "atp",
    *,
    season: Optional[int] = None,
    round: Optional[str] = None,  # noqa: A002 (mirrors the API query name)
    status: Optional[str] = None,
    player: Optional[str] = None,
) -> list[dict]:
    """``GET /matches`` — list matches, optionally filtered."""
    return _get(
        "/matches", tour=tour, season=season, round=round, status=status, player=player
    ) or []


def get_match(match_id: int, tour: str = "atp") -> Optional[dict]:
    """``GET /matches/{id}`` — full detail for one match."""
    return _get(f"/matches/{match_id}", tour=tour)


def get_tournament_info(tour: str = "atp") -> Optional[dict]:
    """``GET /matches/tournament`` — current edition info."""
    return _get("/matches/tournament", tour=tour)


def get_seasons(tour: str = "atp") -> list[dict]:
    """``GET /matches/seasons`` — available editions of the tournament."""
    return _get("/matches/seasons", tour=tour) or []


def get_odds(match_id: int) -> Optional[dict]:
    """``GET /matches/{id}/odds`` — source odds for a match."""
    return _get(f"/matches/{match_id}/odds")


def get_named_odds(match_id: int, tour: str = "atp") -> Optional[dict]:
    """``GET /matches/{id}/odds/unibet`` — named-bookmaker odds.

    Internal use only. Callers receive the AB-7-safe normalised form via
    :func:`fetch_odds`; the bookmaker name is never propagated outward.
    """
    return _get(f"/matches/{match_id}/odds/unibet", tour=tour)


def get_h2h(match_id: int, tour: str = "atp") -> Optional[dict]:
    """``GET /matches/{id}/h2h`` — head-to-head record (feeds AB-8)."""
    return _get(f"/matches/{match_id}/h2h", tour=tour)


def get_analysis(match_id: int, tour: str = "atp") -> Optional[dict]:
    """``GET /analysis/{id}`` — model probability + value bets + Kelly."""
    return _get(f"/analysis/{match_id}", tour=tour)


def get_player(player_id: int) -> Optional[dict]:
    """``GET /players/{id}`` — player bio + current ranking."""
    return _get(f"/players/{player_id}")


def get_player_statistics(
    player_id: int, tour: str = "atp", season: Optional[int] = None
) -> Optional[dict]:
    """``GET /players/{id}/statistics`` — aggregated form stats."""
    return _get(f"/players/{player_id}/statistics", tour=tour, season=season)


# --- name normalisation & matching -----------------------------------------


def _norm(text: str) -> str:
    """Lowercase, strip accents, collapse to alnum tokens separated by space."""
    text = unicodedata.normalize("NFKD", text or "")
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return text.strip()


def _tokens(text: str) -> list[str]:
    return [t for t in _norm(text).split() if len(t) > 1]


def _name_matches(query: str, candidate: str) -> bool:
    """True if ``query`` ("Alcaraz") names ``candidate`` ("Carlos Alcaraz").

    Every significant (>=3 char) token of the query must appear among the
    candidate's tokens. Surnames are distinctive, so this is precise while
    tolerating "C. Alcaraz" vs "Carlos Alcaraz" vs "Alcaraz".
    """
    q = _tokens(query)
    c = set(_tokens(candidate))
    if not q or not c:
        return False
    sig = [t for t in q if len(t) >= 3] or q
    return all(t in c for t in sig)


def _candidate_score(match: dict, a: str, b: Optional[str]) -> int:
    """Rank how well a match's two players fit (a, b). 2=both, 1=one, 0=none."""
    home = (match.get("home") or {}).get("name", "")
    away = (match.get("away") or {}).get("name", "")
    a_home, a_away = _name_matches(a, home), _name_matches(a, away)
    if b:
        b_home, b_away = _name_matches(b, home), _name_matches(b, away)
        if (a_home and b_away) or (a_away and b_home):
            return 2
        if a_home or a_away or b_home or b_away:
            return 1
        return 0
    return 1 if (a_home or a_away) else 0


def _prefer(current: dict, other: dict) -> dict:
    """Tie-break two equally-scored candidates: keep the more recent one."""
    return (
        other
        if (other.get("start_time") or "") > (current.get("start_time") or "")
        else current
    )


def find_match(
    a: str,
    b: Optional[str] = None,
    *,
    tour: Optional[str] = None,
    status: Optional[str] = None,
) -> Optional[dict]:
    """Resolve a player pair to the single best-matching RG match, or ``None``.

    Searches by player ``a`` across the relevant tour(s), then ranks each
    returned match by how well both names line up. Ties break toward the most
    recent match.
    """
    tours = (tour,) if tour else TOURS
    best: Optional[dict] = None
    best_score = 0
    for t in tours:
        for match in get_matches(tour=t, player=a, status=status):
            score = _candidate_score(match, a, b)
            if score == 0:
                continue
            if score > best_score:
                best, best_score = match, score
            elif score == best_score and best is not None:
                best = _prefer(best, match)
    return best


# --- label parsing ----------------------------------------------------------

_BEATS = re.compile(r"\b(?:bat|beats?|def\.?|defeats?|d\.)\b", re.IGNORECASE)
_VS = re.compile(r"\b(?:vs?|contre)\b", re.IGNORECASE)

# Market phrases stripped to recover a bare player name.
_MARKET_NOISE = re.compile(
    r"(?ix)"
    r"vainqueur(?:\(e\))?(?:\s+du\s+match)?"
    r"|gagnant(?:e)?(?:\s+du\s+match)?"
    r"|gagne|to\s+win|wins?"
    r"|(?:en|in)\s+\d+\s+sets?"
    r"|temps\s+r[ée]glem\w*"
    r"|\bml\b(?:\s*90(?:\s*min)?)?"
    r"|over|under|plus\s+de|moins\s+de"
    r"|handicap"
    r"|[+\-]\d+(?:[.,]\d+)?"
    r"|\d+(?:[.,]\d+)?\s*(?:jeux|games?|sets?)",
)


def _clean_player(text: Optional[str]) -> Optional[str]:
    """Strip seeds, parentheticals and market phrases down to a player name."""
    if text is None:
        return None
    text = re.sub(r"\(.*?\)", " ", text)
    text = _MARKET_NOISE.sub(" ", text)
    text = re.sub(r"[—–/]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip(" .,-")
    return text or None


def parse_label_to_players(match_label: str) -> tuple[Optional[str], Optional[str]]:
    """Best-effort split of a pick label into ``(player_a, player_b)``.

    Handles the common NEXBET tennis label shapes::

        "Alcaraz bat Sinner"                 -> ("Alcaraz", "Sinner")
        "Alcaraz vainqueur du match"         -> ("Alcaraz", None)
        "Sinner gagne en 3 sets"             -> ("Sinner", None)
        "Plus de 21.5 jeux — Alcaraz/Sinner" -> ("Alcaraz", "Sinner")
        "Machac +6.5"                        -> ("Machac", None)
    """
    if not match_label:
        return (None, None)
    s = match_label.strip()

    # 1) explicit "A bat B" / "A beats B" / "A def. B"
    mb = _BEATS.search(s)
    if mb:
        return (_clean_player(s[: mb.start()]), _clean_player(s[mb.end():]))

    # 2) total-games / matchup form with a slash: "… — A/B" or "A/B"
    if "/" in s:
        tail = re.split(r"[—–-]", s)[-1]
        sl = re.search(r"([^/]+)/([^/]+)", tail)
        if sl:
            a, b = _clean_player(sl.group(1)), _clean_player(sl.group(2))
            if a and b:
                return (a, b)

    # 3) "A vs B" / "A contre B"
    mvs = _VS.search(s)
    if mvs:
        return (_clean_player(s[: mvs.start()]), _clean_player(s[mvs.end():]))

    # 4) single player (market keywords stripped)
    return (_clean_player(s), None)


# --- response mappers (pure) ------------------------------------------------


def _set_scores(match: dict) -> list[list[int]]:
    """Per-set [home_games, away_games] pairs from the two Score objects."""
    home = (match.get("home_score") or {}).get("sets") or []
    away = (match.get("away_score") or {}).get("sets") or []
    return [[h, a] for h, a in zip(home, away)]


def _map_score(match: dict) -> dict:
    """Map an upstream Match dict to a generic, provider-agnostic score dict."""
    home_score = match.get("home_score") or {}
    away_score = match.get("away_score") or {}
    return {
        "home": (match.get("home") or {}).get("name"),
        "away": (match.get("away") or {}).get("name"),
        "winner": match.get("winner"),
        "home_sets": home_score.get("sets_won"),
        "away_sets": away_score.get("sets_won"),
        "sets": _set_scores(match),
        "status": match.get("status"),
        "source": SOURCE,
        "match_id": match.get("id"),
    }


def _settle_status(match: dict) -> str:
    """Map upstream status (+ description) to settle_rules.MatchScore.status."""
    raw = (match.get("status") or "").lower()
    desc = (match.get("status_description") or "").lower()
    if re.search(r"\b(ret|retir)", desc):
        return "retired"
    if re.search(r"\b(w\.?o\.?|walkover)\b", desc):
        return "walkover"
    if "postpon" in raw or "postpon" in desc or "cancel" in raw:
        return "postponed"
    if raw in ("finished", "ended", "final") or "finished" in raw:
        return "final"
    return "in_progress"


def to_match_score(match: dict):
    """Build a ``settle_rules.MatchScore`` from an upstream Match dict.

    Tennis only (the RG API is a tennis API), so ``set_scores`` is populated
    and the football/basket fields stay ``None``. Lazy import keeps the
    settlement stack out of the agent-only import path.
    """
    from datetime import datetime

    from settle_rules import MatchScore  # lazy: pure module, no I/O

    set_scores = [(h, a) for h, a in _set_scores(match)] or None
    home_won = (match.get("winner") == "home")
    home_sets = (match.get("home_score") or {}).get("sets_won")
    away_sets = (match.get("away_score") or {}).get("sets_won")

    started_at = None
    st = match.get("start_time")
    if st:
        try:
            started_at = datetime.fromisoformat(str(st).replace("Z", "+00:00"))
        except ValueError:
            started_at = None

    return MatchScore(
        status=_settle_status(match),
        home_team=(match.get("home") or {}).get("name", ""),
        away_team=(match.get("away") or {}).get("name", ""),
        home_score=home_sets if home_sets is not None else (1 if home_won else 0),
        away_score=away_sets if away_sets is not None else (0 if home_won else 1),
        set_scores=set_scores,
        started_at=started_at,
    )


def _side_for(name: str, home: str, away: str) -> Optional[str]:
    if _name_matches(name, home):
        return "home"
    if _name_matches(name, away):
        return "away"
    return None


def _map_named_markets(odds: dict, home: str, away: str) -> list[dict]:
    """Normalise named-bookmaker markets to generic ``{name, choices}`` form.

    Bookmaker identity is dropped (AB-7). Match-winner outcomes are mapped to
    ``home`` / ``away``; everything else keeps its (generic) label.
    """
    markets: list[dict] = []
    for market in odds.get("markets") or []:
        label = (market.get("label") or "").strip()
        is_winner = (market.get("type") == "winner") or bool(
            re.search(r"(?i)winner|vainqueur|match\s*winner|1x2|moneyline", label)
        )
        choices = []
        for out in market.get("outcomes") or []:
            decimal = out.get("odds")
            if is_winner:
                side = _side_for(
                    out.get("participant") or out.get("label") or "", home, away
                )
                name = side or (out.get("label") or "")
            else:
                name = out.get("label") or ""
            choices.append({"name": name, "decimal": decimal})
        markets.append(
            {"name": "match_winner" if is_winner else label, "choices": choices}
        )
    return markets


def _map_generic_markets(odds: dict, home: str, away: str) -> list[dict]:
    """Normalise source odds markets to ``{name, choices}`` form.

    The match-winner market is identified by its *choices* (a 1/2 two-way
    with no handicap), not its name — source feeds label it "Full time",
    "Match", "Winner" etc. inconsistently. When recognised, "1"/"2" map to
    "home"/"away".
    """
    markets: list[dict] = []
    for market in odds.get("markets") or []:
        name = (market.get("name") or "").strip()
        raw_choices = market.get("choices") or []
        choice_names = {(c.get("name") or "").strip() for c in raw_choices}
        is_winner = (
            not market.get("handicap")
            and choice_names == {"1", "2"}
            or bool(re.search(r"(?i)\b(winner|vainqueur)\b", name))
            and not market.get("handicap")
        )
        choices = []
        for choice in raw_choices:
            raw = (choice.get("name") or "").strip()
            mapped = {"1": "home", "2": "away"}.get(raw, raw)
            choices.append(
                {"name": mapped if is_winner else raw, "decimal": choice.get("decimal")}
            )
        markets.append(
            {"name": "match_winner" if is_winner else name, "choices": choices}
        )
    return markets


# --- public contract --------------------------------------------------------


def fetch_score(match_label: str) -> Optional[dict]:
    """Final result for a match, by pick label, as a generic dict. ``None``
    if no data. ``status`` is always included so callers can decide whether
    the match is actually finished before acting."""
    a, b = parse_label_to_players(match_label)
    if not a:
        return None
    match = find_match(a, b, status="finished") or find_match(a, b)
    if match is None:
        return None
    return _map_score(match)


def fetch_match_score(match_label: str):
    """Resolve a pick label to a ``settle_rules.MatchScore`` (tennis), or
    ``None``. This is the shape ``auto_settle`` consumes — provided so the
    client can later back the settlement tennis path without a rewrite."""
    a, b = parse_label_to_players(match_label)
    if not a:
        return None
    match = find_match(a, b, status="finished") or find_match(a, b)
    if match is None:
        return None
    return to_match_score(match)


def fetch_odds(match_label: str) -> Optional[dict]:
    """Pre-match odds for the agent, by pick label. ``None`` if no data.

    Prefers the richer named-bookmaker feed (decimal prices) when the event
    is matched, falling back to source odds. Bookmaker identity is never
    surfaced (AB-7); the payload reports ``source="rg-api"``.
    """
    a, b = parse_label_to_players(match_label)
    if not a:
        return None
    match = find_match(a, b)
    if match is None:
        return None
    match_id = match.get("id")
    tour = match.get("tour", "atp")
    home = (match.get("home") or {}).get("name", "")
    away = (match.get("away") or {}).get("name", "")

    named = get_named_odds(match_id, tour=tour)
    if named and named.get("matched"):
        markets = _map_named_markets(named, home, away)
    else:
        generic = get_odds(match_id) or {}
        markets = _map_generic_markets(generic, home, away)

    return {"home": home, "away": away, "markets": markets, "source": SOURCE}


def fetch_analysis(match_label: str) -> Optional[dict]:
    """Model probabilities + value bets for the agent. ``None`` if no data.

    Only value bets flagged ``is_value`` upstream are forwarded.
    """
    a, b = parse_label_to_players(match_label)
    if not a:
        return None
    match = find_match(a, b)
    if match is None:
        return None
    data = get_analysis(match.get("id"), tour=match.get("tour", "atp"))
    if not data:
        return None
    value_bets = [
        {
            "side": v.get("side"),
            "edge": v.get("edge"),
            "recommended_stake_pct": v.get("recommended_stake_pct"),
        }
        for v in (data.get("value_bets") or [])
        if v.get("is_value")
    ]
    return {
        "home": (match.get("home") or {}).get("name"),
        "away": (match.get("away") or {}).get("name"),
        "model_home_probability": data.get("model_home_probability"),
        "model_away_probability": data.get("model_away_probability"),
        "value_bets": value_bets,
        "source": SOURCE,
    }


# --- CLI (manual probe) -----------------------------------------------------


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="NEXBET RG API client — manual probe."
    )
    parser.add_argument("label", help='pick label, e.g. "Alcaraz bat Sinner"')
    parser.add_argument(
        "--kind",
        choices=["score", "odds", "analysis", "parse"],
        default="score",
        help="what to fetch (default: score). 'parse' just shows label parsing.",
    )
    args = parser.parse_args(argv)

    if args.kind == "parse":
        print(json.dumps(parse_label_to_players(args.label), ensure_ascii=False))
        return 0

    fn = {"score": fetch_score, "odds": fetch_odds, "analysis": fetch_analysis}[args.kind]
    try:
        result = fn(args.label)
    except RGApiError as exc:
        print(f"rg-api error: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    return 0 if result else 1


if __name__ == "__main__":
    raise SystemExit(main())
