#!/usr/bin/env python3
"""NEXBET auto-settlement orchestrator.

Three modes:

    python scripts/auto_settle.py --dry-run    # compute + log to stdout, no writes
    python scripts/auto_settle.py              # SHADOW (default): writes a proposal
                                              # JSON + Telegram admin diff. No
                                              # mutation of picks_data.py.
    python scripts/auto_settle.py --live       # writes picks_data.py +
                                              # picks_translations_en.py via
                                              # libcst, regenerates history.json,
                                              # and creates a git commit.

The cron schedule runs SHADOW by default so the operator can monitor
proposals before promoting to live.

Provider: SofaScore (see scripts/sofascore.py). Markets covered:
tennis (match_winner / exact_sets / total_games), football (ML 90 min
+ BTTS), basket (team ML / total points / player points). Anything
unrecognised goes to ``skipped_unknown[]`` and never touches the file.
"""

from __future__ import annotations

import argparse
import importlib
import json
import os
import re
import subprocess
import sys
import time
import traceback
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

ROOT = Path(__file__).resolve().parent.parent  # backend/
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

import picks_data  # noqa: E402
from settle_ast import update_en_translation, update_pick_outcome  # noqa: E402
from settle_rules import (  # noqa: E402
    BetSpec,
    MatchScore,
    apply_rule,
    parse_pick_label_full,
)

AUTO_DIR = ROOT / "data" / "auto_settle"
NOTIFIED_FILE = AUTO_DIR / ".notified.json"
PICKS_DATA_PATH = ROOT / "scripts" / "picks_data.py"
TRANSLATIONS_PATH = ROOT / "scripts" / "picks_translations_en.py"


# ---------------------------------------------------------------------------
# Combo aggregation (NEXBET-specific, deviates from industry standard)
# ---------------------------------------------------------------------------


def _aggregate_combo(leg_outcomes: list[str]) -> str:
    """Aggregate combo legs into one outcome.

    Per user spec (documented in CLAUDE.md §12):
      - all legs win → win
      - any leg void → void
      - else → loss

    This deviates from the industry standard (which would void only the
    voided leg and recompute net odds on remaining legs). We preserve
    user's house rule for now.
    """
    if not leg_outcomes:
        return "void"
    if all(o == "win" for o in leg_outcomes):
        return "win"
    if any(o == "void" for o in leg_outcomes):
        return "void"
    return "loss"


# ---------------------------------------------------------------------------
# Sport-aware market remap
# ---------------------------------------------------------------------------


def _remap_spec_for_sport(spec: BetSpec, sport: str) -> BetSpec:
    """The parser defaults ML to tennis_match_winner / generic_ml — re-tag
    based on pick.sport so basketball/football MLs use the correct market."""
    if spec.market in ("tennis_match_winner", "generic_ml"):
        if sport == "basketball":
            return BetSpec(
                market="basket_team_ml",
                target=spec.target,
                threshold=spec.threshold,
                direction=spec.direction,
                n_sets=spec.n_sets,
                extra=spec.extra,
                raw_label=spec.raw_label,
            )
        if sport == "football":
            return BetSpec(
                market="football_ml_regulation",
                target=spec.target,
                threshold=spec.threshold,
                direction=spec.direction,
                n_sets=spec.n_sets,
                extra=spec.extra,
                raw_label=spec.raw_label,
            )
        # tennis / fallback: generic_ml must become tennis_match_winner so
        # the tennis rule (which handles retired/walkover) applies.
        if spec.market == "generic_ml":
            return BetSpec(
                market="tennis_match_winner",
                target=spec.target,
                threshold=spec.threshold,
                direction=spec.direction,
                n_sets=spec.n_sets,
                extra=spec.extra,
                raw_label=spec.raw_label,
            )
    # Player props are basket-only by definition; nothing to remap there.
    return spec


# ---------------------------------------------------------------------------
# Provider — ESPN unofficial API (v1.2: replaces SofaScore)
# ---------------------------------------------------------------------------
# ESPN's public scoreboard endpoint passes from GitHub Actions cloud IPs
# (probe_providers.py confirmed 200 for tennis ATP/WTA, NBA, UEFA soccer).
# SofaScore returned 403 from the same runner. No API key needed.


_ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports"

# Map a (sport, free-text league string) to the ESPN league slug(s) to
# query. For tennis we always try both ATP and WTA. For football we infer
# from the pick's league string.
_FOOTBALL_LEAGUE_MAP = [
    ("premier league",      "eng.1"),
    ("la liga",             "esp.1"),
    ("primera división",    "esp.1"),
    ("bundesliga",          "ger.1"),
    ("serie a",             "ita.1"),
    ("ligue 1",             "fra.1"),
    ("champions league",    "uefa.champions"),
    ("europa league",       "uefa.europa"),
    ("conference league",   "uefa.europa.conf"),
]


def _espn_leagues_for(sport: str, league_str: str) -> list[str]:
    """Return the list of ESPN league slugs to query for this pick."""
    if sport == "tennis":
        return ["tennis/atp", "tennis/wta"]
    if sport == "basketball":
        return ["basketball/nba"]
    if sport == "football":
        ls = (league_str or "").lower()
        for needle, slug in _FOOTBALL_LEAGUE_MAP:
            if needle in ls:
                return [f"soccer/{slug}"]
        # Unknown football league → try the most common ones as fallback
        return [
            "soccer/eng.1", "soccer/esp.1", "soccer/ita.1",
            "soccer/ger.1", "soccer/fra.1",
            "soccer/uefa.champions", "soccer/uefa.europa",
        ]
    return []


def _espn_get(path: str) -> dict | None:
    """GET an ESPN endpoint. Returns parsed JSON or None on any failure."""
    import urllib.request
    import urllib.error

    url = f"{_ESPN_BASE}/{path}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read())
    except (urllib.error.HTTPError, urllib.error.URLError, json.JSONDecodeError):
        return None
    except Exception:
        return None


def _strip_accents(s: str) -> str:
    import unicodedata

    return "".join(
        c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"
    )


def _name_match(a: str, b: str) -> bool:
    """Loose name match — strip accents + lowercase + substring contains.
    Handles 'Naomi Osaka' vs 'N. Osaka', 'Báez' vs 'Baez', etc."""
    if not a or not b:
        return False
    norm = lambda s: re.sub(r"[^a-z0-9 ]", "", _strip_accents(s).lower()).strip()
    na, nb = norm(a), norm(b)
    if not na or not nb:
        return False
    # Match if either is contained in the other, OR if all words of one
    # appear in the other (handles "Naomi Osaka" vs "Osaka").
    if na in nb or nb in na:
        return True
    wa, wb = set(na.split()), set(nb.split())
    if wa and wb and (wa.issubset(wb) or wb.issubset(wa)):
        return True
    # Last-name match (most reliable for tennis): if the LONGEST word in
    # one is in the other's word list, accept.
    longest_a = max(wa, key=len, default="")
    longest_b = max(wb, key=len, default="")
    if longest_a and longest_a in wb:
        return True
    if longest_b and longest_b in wa:
        return True
    return False


def _competitor_name(comp: dict) -> str:
    """ESPN competitors can be athletes (tennis) or teams (team sports)."""
    if comp.get("athlete"):
        return comp["athlete"].get("displayName", "")
    if comp.get("team"):
        return comp["team"].get("displayName", "")
    return ""


def _fetch_match_score(
    home: str, away: str, kickoff_iso: str, sport: str, league_str: str = ""
) -> Optional[MatchScore]:
    """Find an ESPN event matching home/away/kickoff_iso and convert it
    to a MatchScore. Returns None on any failure (ambiguous, missing,
    API error)."""
    # F10: pace API requests. 1s between ESPN calls is plenty (no
    # documented limit, but we stay conservative).
    time.sleep(1)
    date_part = kickoff_iso.split("T")[0].replace("-", "")  # ESPN expects YYYYMMDD
    leagues = _espn_leagues_for(sport, league_str)
    if not leagues:
        return None

    target_date_iso = kickoff_iso.split("T")[0]  # YYYY-MM-DD

    candidates: list[dict] = []
    for league_slug in leagues:
        data = _espn_get(f"{league_slug}/scoreboard?dates={date_part}")
        if not data:
            continue
        for ev in data.get("events", []):
            # Tennis: ESPN groups the entire tournament under a single
            # event (e.g. "Roland Garros"), with individual matches
            # nested in groupings[].competitions[]. Team sports: matches
            # are directly under event.competitions[].
            comps: list[dict] = []
            if sport == "tennis":
                for g in ev.get("groupings") or []:
                    for comp in g.get("competitions") or []:
                        comps.append(comp)
            comps.extend(ev.get("competitions") or [])

            for comp in comps:
                # For tennis: tournament event spans many days — filter
                # to competitions matching our target date.
                if sport == "tennis":
                    cd = (comp.get("date") or comp.get("startDate") or "")[:10]
                    if cd and cd != target_date_iso:
                        continue
                competitors = comp.get("competitors") or []
                names = [_competitor_name(c) for c in competitors]
                if len(names) < 2:
                    continue
                pair_match = (
                    (_name_match(home, names[0]) and _name_match(away, names[1]))
                    or (_name_match(home, names[1]) and _name_match(away, names[0]))
                )
                if pair_match:
                    candidates.append(comp)

    # Dedupe by competition.id — ESPN returns the same tournament event
    # under both tennis/atp and tennis/wta for Grand Slams, so each match
    # appears in 2 candidate lists with the same competition.id. Counting
    # without dedupe → false ambiguity → silent None.
    seen_ids: set[str] = set()
    unique: list[dict] = []
    for c in candidates:
        cid = str(c.get("id", ""))
        if cid and cid in seen_ids:
            continue
        if cid:
            seen_ids.add(cid)
        unique.append(c)

    if not unique:
        return None
    if len(unique) > 1:
        print(
            f"[auto-settle] AMBIGUOUS match for {home} vs {away} on "
            f"{kickoff_iso}: {len(unique)} candidates — skipping.",
            file=sys.stderr,
        )
        return None
    return _event_to_score(unique[0], sport, home, away)


def _event_to_score(ev: dict, sport: str, want_home: str = "", want_away: str = "") -> Optional[MatchScore]:
    """Map an ESPN competition (or wrapping event) dict to our MatchScore.

    For tennis, `ev` is already a competition (extracted from
    event.groupings[].competitions[] in _fetch_match_score). For team
    sports, `ev` is the event itself and we walk into competitions[0].

    want_home/want_away: the pick's perspective (we re-orient the score so
    `home_score` matches the player/team the pick called "home_team", to
    keep the rules.apply_rule logic provider-agnostic).
    """
    status_obj = ev.get("status", {}).get("type", {})
    status_name = (status_obj.get("name") or "").lower()
    status_completed = bool(status_obj.get("completed"))

    if "postponed" in status_name or "canceled" in status_name or "cancelled" in status_name:
        mapped = "postponed"
    elif "final" in status_name or status_completed:
        mapped = "final"
    elif "halftime" in status_name or "progress" in status_name or "delayed" in status_name:
        mapped = "in_progress"
    else:
        mapped = "in_progress"

    # Tennis: `ev` is already a competition (has `competitors` directly).
    # Team sports: walk into event.competitions[0] for backwards compat
    # with tests that pass full event dicts.
    if "competitors" in ev:
        competition = ev
    else:
        competition = (ev.get("competitions") or [{}])[0]
    competitors = competition.get("competitors", [])
    if len(competitors) < 2:
        return None

    # Re-orient so competitors[0] is the pick's "home_team" perspective.
    c0, c1 = competitors[0], competitors[1]
    if want_home and _name_match(want_home, _competitor_name(c1)):
        c0, c1 = c1, c0

    home = _competitor_name(c0)
    away = _competitor_name(c1)

    started_at: Optional[datetime] = None
    date_str = ev.get("date")
    if date_str:
        try:
            started_at = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except Exception:
            started_at = None

    # Retirement / walkover detection for tennis
    if sport == "tennis":
        note = (status_obj.get("description") or "").lower() + " " + status_name
        if re.search(r"\b(ret|retired|w\.?o\.?|walkover)\b", note, re.IGNORECASE):
            mapped = "retired"

    try:
        c0_total = int(c0.get("score", 0) or 0)
        c1_total = int(c1.get("score", 0) or 0)
    except (TypeError, ValueError):
        c0_total = c1_total = 0

    if sport == "tennis":
        # ESPN tennis linescores = per-set games for each competitor.
        c0_sets = c0.get("linescores") or []
        c1_sets = c1.get("linescores") or []
        set_scores = []
        for i in range(min(len(c0_sets), len(c1_sets))):
            try:
                h_g = int(c0_sets[i].get("value", 0))
                a_g = int(c1_sets[i].get("value", 0))
                set_scores.append((h_g, a_g))
            except (TypeError, ValueError):
                continue
        # For tennis, ESPN's competitor .score field is often empty
        # or a non-numeric string in finished singles matches → c0_total
        # and c1_total both fall to 0 and the downstream "home_won"
        # check breaks. Fall back to deriving sets won from the
        # per-set tally when the totals look bogus (i.e. both zero
        # while set_scores show actual play).
        h_sets = sum(1 for h, a in set_scores if h > a)
        a_sets = sum(1 for h, a in set_scores if a > h)
        if set_scores and c0_total == 0 and c1_total == 0:
            c0_total, c1_total = h_sets, a_sets
        return MatchScore(
            status=mapped,
            home_team=home,
            away_team=away,
            home_score=c0_total,
            away_score=c1_total,
            set_scores=set_scores or None,
            started_at=started_at,
        )

    if sport == "football":
        # ESPN soccer linescores typically = [1st half, 2nd half, ET1, ET2].
        c0_periods = c0.get("linescores") or []
        c1_periods = c1.get("linescores") or []

        def _safe_int(x):
            try:
                return int(x.get("value", 0))
            except Exception:
                return 0

        reg: Optional[tuple[int, int]] = None
        et_present = len(c0_periods) > 2 or len(c1_periods) > 2
        if len(c0_periods) >= 2 and len(c1_periods) >= 2:
            reg = (
                _safe_int(c0_periods[0]) + _safe_int(c0_periods[1]),
                _safe_int(c1_periods[0]) + _safe_int(c1_periods[1]),
            )
        elif not et_present and mapped == "final":
            # Fallback to total score when no ET signal
            reg = (c0_total, c1_total)
        return MatchScore(
            status=mapped,
            home_team=home,
            away_team=away,
            home_score=c0_total,
            away_score=c1_total,
            regulation_score=reg,
            started_at=started_at,
        )

    if sport == "basketball":
        return MatchScore(
            status=mapped,
            home_team=home,
            away_team=away,
            home_score=c0_total,
            away_score=c1_total,
            player_points=None,  # ESPN scoreboard doesn't include per-player; need separate endpoint
            started_at=started_at,
        )

    return None


# ---------------------------------------------------------------------------
# Result prose rendering (FR / EN)
# ---------------------------------------------------------------------------


def _render_fr_result(
    sport: str, pick_label: str, outcome: str, score: MatchScore
) -> dict:
    """Build a result dict in FR matching CLAUDE.md §1 schema."""
    score_text = _format_score_text(sport, score)
    if outcome == "win":
        bet_outcome = "Pari gagné : conditions du pronostic remplies."
        summary = f"Match terminé — {score_text}."
    elif outcome == "loss":
        bet_outcome = "Pari perdu : conditions du pronostic non remplies."
        summary = f"Match terminé — {score_text}."
    else:
        bet_outcome = "Pari annulé : conditions non vérifiables (match interrompu, postponed, ou push)."
        summary = f"Issue indéterminée — {score_text}."

    if sport in {"tennis"}:
        score_home = (
            " ".join(f"{h}-{a}" for h, a in (score.set_scores or []))
            if score.set_scores
            else ""
        )
        return {
            "score_home": score_home,
            "score_away": "",
            "score_text": score_text,
            "summary": summary,
            "bet_outcome": bet_outcome,
        }
    return {
        "score_home": score.home_score if score.home_score is not None else "",
        "score_away": score.away_score if score.away_score is not None else "",
        "score_text": score_text,
        "summary": summary,
        "bet_outcome": bet_outcome,
    }


def _render_en_result(
    sport: str, pick_label: str, outcome: str, score: MatchScore
) -> dict:
    score_text = _format_score_text(sport, score, lang="en")
    if outcome == "win":
        bet_outcome = "Bet won: prediction conditions met."
        summary = f"Match finished — {score_text}."
    elif outcome == "loss":
        bet_outcome = "Bet lost: prediction conditions not met."
        summary = f"Match finished — {score_text}."
    else:
        bet_outcome = "Bet voided: conditions not verifiable (interrupted, postponed, or push)."
        summary = f"Outcome undetermined — {score_text}."
    return {
        "score_text": score_text,
        "summary": summary,
        "bet_outcome": bet_outcome,
    }


def _format_score_text(
    sport: str, score: MatchScore, lang: str = "fr"
) -> str:
    if sport == "tennis" and score.set_scores:
        sep = "bat" if lang == "fr" else "def."
        # ESPN's competitor .score field is unreliable for tennis (often
        # missing / non-numeric → both ends up at 0). Derive the winner
        # from the actual per-set tally so the phrase orientation stays
        # consistent with the score numbers. F-fix observed on J12
        # (Andreeva 6-4 6-2 → narrative said "Bouzkova bat Andreeva").
        home_sets = sum(1 for h, a in score.set_scores if h > a)
        away_sets = sum(1 for h, a in score.set_scores if a > h)
        home_won = home_sets > away_sets
        if home_won:
            sets_str = " ".join(f"{h}-{a}" for h, a in score.set_scores)
            return f"{score.home_team} {sep} {score.away_team} {sets_str}"
        else:
            sets_str = " ".join(f"{a}-{h}" for h, a in score.set_scores)
            return f"{score.away_team} {sep} {score.home_team} {sets_str}"
    if score.home_score is not None and score.away_score is not None:
        return f"{score.home_team} {score.home_score} - {score.away_score} {score.away_team}"
    return f"{score.home_team} vs {score.away_team}"


def _combo_result(legs_settled: list[dict], lang: str = "fr") -> dict:
    """Build the combo's aggregate result dict from settled legs."""
    n = len(legs_settled)
    wins = sum(1 for leg in legs_settled if leg["outcome"] == "win")
    score_home = f"{wins}/{n}"
    if lang == "fr":
        score_text = f"{wins} sélections gagnées sur {n}"
        summary = f"Combo : {wins}/{n} sélections validées."
        if wins == n:
            bet_outcome = f"Pari gagné : combo {wins}/{n} validé."
        else:
            bet_outcome = f"Pari perdu : combo {wins}/{n} (au moins une sélection ratée)."
    else:
        score_text = f"{wins} selections won out of {n}"
        summary = f"Combo: {wins}/{n} selections validated."
        if wins == n:
            bet_outcome = f"Bet won: combo {wins}/{n} validated."
        else:
            bet_outcome = f"Bet lost: combo {wins}/{n} (at least one selection failed)."
    return {
        "score_home": score_home,
        "score_text": score_text,
        "summary": summary,
        "bet_outcome": bet_outcome,
    }


# ---------------------------------------------------------------------------
# Settlement core
# ---------------------------------------------------------------------------


def _is_due(pick: dict) -> bool:
    """A pick is due for settlement if kickoff was > 2h ago."""
    try:
        ko = datetime.fromisoformat(pick["kickoff"].replace("Z", "+00:00"))
    except Exception:
        return False
    return datetime.now(timezone.utc) - ko > timedelta(hours=2)


def _load_notified() -> dict[str, str]:
    if not NOTIFIED_FILE.exists():
        return {}
    try:
        return json.loads(NOTIFIED_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_notified(d: dict[str, str]) -> None:
    NOTIFIED_FILE.parent.mkdir(parents=True, exist_ok=True)
    NOTIFIED_FILE.write_text(json.dumps(d, indent=2), encoding="utf-8")


def _try_send_admin(text: str) -> None:
    """Telegram ADMIN ping. NEVER posts to the public channel.

    F3: Uses TELEGRAM_ADMIN_CHAT_ID (separate from TELEGRAM_CHANNEL_ID).
    Reusing publish_telegram.send_message would leak shadow-mode predicted
    outcomes to free subscribers hours before the official result. If
    TELEGRAM_ADMIN_CHAT_ID is unset, we log to stderr — never to the
    public channel.
    """
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    admin_chat = os.getenv("TELEGRAM_ADMIN_CHAT_ID", "").strip()
    if not bot_token or not admin_chat:
        print(f"[admin-ping fallback — no admin chat configured] {text}", file=sys.stderr)
        return
    try:
        import urllib.request as urlrequest

        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = json.dumps(
            {
                "chat_id": admin_chat,
                "text": text,
                "parse_mode": "Markdown",
                "disable_web_page_preview": True,
            }
        ).encode("utf-8")
        req = urlrequest.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlrequest.urlopen(req, timeout=15) as resp:
            resp.read()
    except Exception as exc:
        print(f"[admin-ping failed: {exc}] {text}", file=sys.stderr)


def _settle_one_leg(leg: dict) -> tuple[Optional[str], Optional[MatchScore], list[BetSpec], str]:
    """Settle one leg (or a single pick treated as a leg).

    Returns (outcome | None, score | None, specs, reason). ``None`` outcome
    means data unavailable (skipped to skipped_no_data).
    """
    label = leg.get("pick", "")
    specs = parse_pick_label_full(label)
    if any(s.market == "unknown" for s in specs):
        return None, None, specs, "unparseable"

    sport = leg.get("sport", "tennis")
    specs = [_remap_spec_for_sport(s, sport) for s in specs]

    score = _fetch_match_score(
        leg.get("home_team", ""),
        leg.get("away_team", ""),
        leg.get("kickoff", ""),
        sport,
        leg.get("league", ""),
    )
    if score is None:
        return None, None, specs, "no_data"

    # F4: enforce 48h postponed grace BEFORE apply_rule. apply_rule always
    # returns "void" on postponed status; we want to keep the pick pending
    # until 48h have elapsed since the originally scheduled kickoff so the
    # operator can manually decide. Past 48h: fall straight through to
    # apply_rule which voids on the postponed status (we don't run the
    # data-availability checks below since the match never happened).
    if score.status == "postponed":
        now = datetime.now(timezone.utc)
        ref = score.started_at
        if ref is None:
            try:
                ref = datetime.fromisoformat(
                    (leg.get("kickoff") or "").replace("Z", "+00:00")
                )
            except Exception:
                ref = None
        if ref is None or (now - ref) < timedelta(hours=48):
            return None, score, specs, "postponed_grace"
        outcomes = [apply_rule(s, score) for s in specs]
        if all(o == "win" for o in outcomes):
            outcome = "win"
        elif any(o == "void" for o in outcomes):
            outcome = "void"
        else:
            outcome = "loss"
        return outcome, score, specs, "ok"

    # F1: basket_player_points requires score.player_points; without it
    # apply_rule would return "void" silently and the whole compound
    # single auto-voids. Route to skipped_no_data so an operator settles
    # it manually.
    for spec in specs:
        if spec.market == "basket_player_points" and not score.player_points:
            _try_send_admin(
                f"manual settlement required: {label} "
                "(basket player prop, box score unavailable)"
            )
            return None, score, specs, "no_player_box_score"

    # F6: football_ml_regulation needs an explicit regulation_score (not a
    # fallback to current which may include ET/pens). If regulation_score
    # is None for a football leg, route to skipped_no_data so the operator
    # can settle manually rather than risk wrong settlement.
    for spec in specs:
        if spec.market == "football_ml_regulation" and score.regulation_score is None:
            _try_send_admin(
                f"manual settlement required: {label} "
                "(football ML — regulation score unavailable, ET/pens suspected)"
            )
            return None, score, specs, "no_regulation_score"

    outcomes = [apply_rule(s, score) for s in specs]
    # AND-aggregate (compound singles are conjunctions)
    if all(o == "win" for o in outcomes):
        outcome = "win"
    elif any(o == "void" for o in outcomes):
        outcome = "void"
    else:
        outcome = "loss"

    return outcome, score, specs, "ok"


def _settle_combo(pick: dict) -> Optional[dict]:
    """Settle a combo pick. Returns a proposal dict or None if no legs
    were settle-able."""
    leg_settles: list[dict] = []
    skipped_specs = []
    for leg in pick.get("legs", []):
        if leg.get("outcome") and leg["outcome"] != "pending":
            # Already settled — preserve
            leg_settles.append(
                {"outcome": leg["outcome"], "result": leg.get("result", {}), "_existing": True}
            )
            continue
        outcome, score, specs, reason = _settle_one_leg(leg)
        if outcome is None:
            # Data unavailable for this leg — abort combo settlement
            return {
                "_unsettleable": True,
                "reason": reason,
                "label": leg.get("pick"),
                "date": pick["date"],
            }
        sport = leg.get("sport", "tennis")
        result_fr = _render_fr_result(sport, leg.get("pick", ""), outcome, score)
        result_en = _render_en_result(sport, leg.get("pick", ""), outcome, score)
        leg_settles.append(
            {
                "outcome": outcome,
                "result": result_fr,
                "result_en": result_en,
            }
        )

    settled = [le for le in leg_settles if not le.get("_existing", False)]
    if not settled:
        return None  # everything already settled

    combo_outcome = _aggregate_combo([le["outcome"] for le in leg_settles])
    combo_result = _combo_result(leg_settles, lang="fr")
    combo_result_en = _combo_result(leg_settles, lang="en")
    return {
        "date": pick["date"],
        "outcome": combo_outcome,
        "result": combo_result,
        "result_en": combo_result_en,
        "legs": [
            {"outcome": le["outcome"], "result": le.get("result", {})}
            for le in leg_settles
        ],
        "legs_en": [
            {"outcome": le["outcome"], "result": le.get("result_en", {})}
            for le in leg_settles
        ],
    }


def _settle_single(pick: dict) -> Optional[dict]:
    outcome, score, specs, reason = _settle_one_leg(pick)
    if outcome is None:
        return {
            "_unsettleable": True,
            "reason": reason,
            "label": pick.get("pick"),
            "date": pick["date"],
        }
    sport = pick.get("sport", "tennis")
    return {
        "date": pick["date"],
        "outcome": outcome,
        "result": _render_fr_result(sport, pick.get("pick", ""), outcome, score),
        "result_en": _render_en_result(sport, pick.get("pick", ""), outcome, score),
    }


# ---------------------------------------------------------------------------
# Modes
# ---------------------------------------------------------------------------


def _gather_proposals() -> dict:
    proposed: list[dict] = []
    skipped_unknown: list[dict] = []
    skipped_no_data: list[dict] = []

    for pick in picks_data.PICKS:
        if pick.get("outcome") != "pending":
            continue
        if not _is_due(pick):
            continue

        if pick.get("legs"):
            res = _settle_combo(pick)
        else:
            res = _settle_single(pick)

        if res is None:
            continue
        if res.get("_unsettleable"):
            if res.get("reason") == "unparseable":
                skipped_unknown.append(res)
            else:
                skipped_no_data.append(res)
            continue
        proposed.append(res)

    return {
        "proposed": proposed,
        "skipped_unknown": skipped_unknown,
        "skipped_no_data": skipped_no_data,
    }


def _write_shadow_report(report: dict) -> Path:
    AUTO_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out_path = AUTO_DIR / f"{stamp}.json"
    # F15: atomic write — tmp file then rename. Prevents readers from
    # observing a half-written JSON if the writer is interrupted.
    tmp_path = out_path.with_suffix(out_path.suffix + ".tmp")
    tmp_path.write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    os.replace(tmp_path, out_path)
    return out_path


_FR_MONTHS = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]
_FR_DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
_SPORT_EMOJI = {"tennis": "🎾", "football": "⚽", "basketball": "🏀", "combo": "🎯"}
_OUTCOME_EMOJI = {"win": "🟢", "loss": "🔴", "void": "⚪", "pending": "🟡"}
_OUTCOME_LABEL_FR = {"win": "GAGNÉ", "loss": "PERDU", "void": "VOID", "pending": "EN COURS"}


def _format_fr_date(iso: str) -> str:
    """'2026-05-28' → 'Jeudi 28 mai 2026'."""
    try:
        d = datetime.fromisoformat(iso).date()
        return f"{_FR_DAYS[d.weekday()].capitalize()} {d.day} {_FR_MONTHS[d.month-1]} {d.year}"
    except Exception:
        return iso


def _find_pick(date: str) -> Optional[dict]:
    """Look up the pick metadata in picks_data.PICKS by date."""
    try:
        for p in picks_data.PICKS:
            if p.get("date") == date:
                return p
    except Exception:
        pass
    return None


def _format_proposal(p: dict, mode_tag: str) -> str:
    """Render a proposal as a multi-line Telegram message.

    Format: header (outcome + day#), date+sport+league, per-leg breakdown
    (with scores), financials (stake, odds, P/L), mode tag.
    """
    pick = _find_pick(p["date"]) or {}
    sport = pick.get("sport", "?")
    league = pick.get("league", "?")
    stake = float(pick.get("stake", 0) or 0)
    odds = float(pick.get("odds", 0) or 0)
    outcome = p["outcome"]

    # Day number — count this pick's index in PICKS (1-based)
    day_n = "?"
    try:
        for i, q in enumerate(picks_data.PICKS, start=1):
            if q.get("date") == p["date"]:
                day_n = str(i)
                break
    except Exception:
        pass

    if outcome == "win":
        net = round(stake * (odds - 1), 2)
        net_str = f"+{net:.2f}€"
    elif outcome == "loss":
        net_str = f"-{stake:.2f}€"
    else:
        net_str = "0.00€ (mise remboursée)"

    bet_kind = "Combiné" if pick.get("legs") else "Pari simple"
    header = f"{_OUTCOME_EMOJI.get(outcome,'❔')} *J{day_n} — {bet_kind} {_OUTCOME_LABEL_FR.get(outcome, outcome.upper())}*"

    lines = [header]
    lines.append(f"📅 {_format_fr_date(p['date'])}")
    lines.append(f"{_SPORT_EMOJI.get(sport,'🎯')} {league}")
    lines.append("")

    # Per-leg breakdown for combos
    legs = p.get("legs") or []
    if legs and pick.get("legs"):
        wins = sum(1 for l in legs if l.get("outcome") == "win")
        lines.append(f"*Sélections ({wins}/{len(legs)})*")
        for idx, (leg_settle, leg_meta) in enumerate(zip(legs, pick["legs"]), start=1):
            le_out = leg_settle.get("outcome", "?")
            emoji = _OUTCOME_EMOJI.get(le_out, "❔")
            home_t = leg_meta.get("home_team", "?")
            away_t = leg_meta.get("away_team", "?")
            score_text = (leg_settle.get("result") or {}).get("score_text", "")
            # Strip the long "X bat Y A-B C-D" prefix if present, keep just scores
            short_score = score_text
            for prefix in [f"{home_t} bat {away_t} ", f"{away_t} bat {home_t} "]:
                if prefix in score_text:
                    short_score = score_text.replace(prefix, "")
                    break
            lines.append(f"  {emoji} {home_t} vs {away_t}")
            if score_text:
                lines.append(f"      _{score_text}_")
    else:
        # Single bet
        lines.append(f"*Pick* : _{pick.get('pick', '?')}_")
        score_text = (p["result"] or {}).get("score_text", "")
        if score_text:
            lines.append(f"*Résultat* : _{score_text}_")

    lines.append("")
    lines.append(f"💰 Mise *{stake:.2f}€* · Cote *{odds:.2f}*")
    lines.append(f"📊 Net P/L : *{net_str}*")
    lines.append("")
    lines.append(f"_— {mode_tag}_")

    return "\n".join(lines)


def _build_telegram_diff(report: dict, mode: str = "shadow") -> str:
    mode_tag = "Proposition shadow (rien n'est écrit)" if mode == "shadow" else f"Auto-settle ({mode})"
    blocks: list[str] = []

    for p in report["proposed"]:
        blocks.append(_format_proposal(p, mode_tag))

    for p in report["skipped_unknown"]:
        blocks.append(
            f"❓ *Pari illisible — {p['date']}*\n"
            f"Le parser ne reconnaît pas : `{p['label']}`\n"
            f"_→ Settle manuellement per CLAUDE.md §1._"
        )
    for p in report["skipped_no_data"]:
        blocks.append(
            f"❓ *Données indisponibles — {p['date']}*\n"
            f"Pas de score trouvé pour : `{p['label']}`\n"
            f"_→ Match peut-être encore en cours, ou inconnu d'ESPN. Retry au prochain cron._"
        )

    return "\n\n———\n\n".join(blocks) if blocks else ""


def _is_file_dirty(path: Path) -> bool:
    """Return True if ``path`` has staged or unstaged uncommitted changes."""
    result = subprocess.run(
        ["git", "diff", "--quiet", "HEAD", "--", str(path)],
        cwd=str(ROOT.parent),
        check=False,
    )
    return result.returncode != 0


def _apply_live(report: dict) -> None:
    """Mutate picks_data.py + picks_translations_en.py + run build_history.

    F7: snapshot the file bytes BEFORE the libcst edits so we can do an
    in-memory rollback on failure instead of `git checkout --` (which
    would also wipe any uncommitted operator edits). The caller still
    pre-checks for dirty files before invoking us.
    """
    # Snapshot
    picks_snapshot = PICKS_DATA_PATH.read_bytes()
    trans_snapshot = (
        TRANSLATIONS_PATH.read_bytes() if TRANSLATIONS_PATH.exists() else None
    )
    try:
        for p in report["proposed"]:
            date = p["date"]
            leg_updates = p.get("legs")
            update_pick_outcome(
                PICKS_DATA_PATH, date, p["outcome"], p["result"], leg_updates
            )
            update_en_translation(
                TRANSLATIONS_PATH,
                date,
                p["result_en"]["score_text"],
                p["result_en"]["summary"],
                p["result_en"]["bet_outcome"],
                p.get("legs_en"),
            )

        # Verify import still works
        importlib.reload(picks_data)
        # Regenerate history.json
        subprocess.run(
            ["python", "scripts/build_history.py"], cwd=str(ROOT), check=True
        )
    except Exception:
        # F7: in-memory rollback. Restore the snapshot bytes so the working
        # tree is exactly as it was before our edits — bypasses git so
        # nothing else in the working tree is touched.
        PICKS_DATA_PATH.write_bytes(picks_snapshot)
        if trans_snapshot is not None:
            TRANSLATIONS_PATH.write_bytes(trans_snapshot)
        # Verify rollback restored a parseable module before re-raising.
        try:
            importlib.reload(picks_data)
        except Exception:
            print(
                "[auto-settle] CRITICAL: rollback restored bytes but module "
                "fails to import. Manual intervention required.",
                file=sys.stderr,
            )
        raise


def _git_commit(message: str) -> None:
    """F9: switch git add + git commit to check=True so failures surface
    immediately and the caller can roll back."""
    try:
        subprocess.run(
            ["git", "add", "backend/scripts/picks_data.py",
             "backend/scripts/picks_translations_en.py",
             "backend/data/history.json",
             "backend/data/predictions/"],
            cwd=str(ROOT.parent),
            check=True,
            capture_output=True,
            text=True,
        )
        subprocess.run(
            ["git", "commit", "-m", message],
            cwd=str(ROOT.parent),
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or "")[:500]
        _try_send_admin(
            f"auto-settle git_commit FAILED:\n```\n{stderr}\n```"
        )
        raise




def _reminder_mode() -> int:
    """Settlement reminder — bypasses the provider entirely.

    Walks picks_data.PICKS for pending picks (and pending legs of combos)
    whose kickoff is more than 2h in the past. Sends ONE Telegram admin
    ping listing them so the operator settles manually per CLAUDE.md §1.

    Rationale: SofaScore (and most public sports APIs) block cloud IPs
    via Cloudflare. Until we wire a paying provider or run from a
    residential IP, the most valuable thing this cron can do is remind
    the operator "go settle these N picks now."

    Dedupe: one ping per pick per outcome state. Re-runs of the cron
    won't spam — the same pending pick on the same day is only flagged
    once. Once the operator settles, outcome != "pending" → drops off.
    """
    importlib.reload(picks_data)
    now_iso = datetime.now(timezone.utc).isoformat(timespec="minutes")
    due: list[dict] = []
    for pick in picks_data.PICKS:
        if pick.get("outcome") != "pending":
            continue
        if not _is_due(pick):
            continue
        # Build a compact human label per pick. For combos, list each
        # still-pending leg so the operator sees the actual work to do.
        legs_pending = []
        for leg in pick.get("legs", []) or []:
            if leg.get("outcome") == "pending":
                legs_pending.append(
                    f"{leg.get('home_team','?')} vs {leg.get('away_team','?')}"
                )
        due.append({
            "date": pick["date"],
            "sport": pick.get("sport", "?"),
            "league": pick.get("league", "?"),
            "label": pick.get("pick", "?"),
            "kickoff": pick["kickoff"],
            "legs_pending": legs_pending,
        })

    if not due:
        print(f"[reminder] {now_iso} — no pending picks past kickoff+2h")
        return 0

    # Dedupe: pings only when the (date → label) tuple changes from the
    # previous notification. A re-run on the same pending state is a no-op.
    notified = _load_notified()
    fresh = [
        p for p in due
        if notified.get(f"{p['date']}::reminder") != p["label"]
    ]
    if not fresh:
        print(f"[reminder] {now_iso} — {len(due)} due picks, all already notified")
        return 0

    lines = [f"📋 *Settlement reminder* — {len(due)} pick(s) à régler"]
    for p in due:
        lines.append("")
        lines.append(f"*{p['date']}* · {p['sport']} · {p['league']}")
        lines.append(f"  → {p['label']}")
        if p["legs_pending"]:
            for leg in p["legs_pending"]:
                lines.append(f"     · {leg}")
    lines.append("")
    lines.append("Settle manuellement per CLAUDE.md §1, puis re-run le workflow.")
    _try_send_admin("\n".join(lines))

    for p in due:
        notified[f"{p['date']}::reminder"] = p["label"]
    _save_notified(notified)
    print(f"[reminder] {now_iso} — pinged admin with {len(due)} due pick(s)")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="NEXBET auto-settlement")
    ap.add_argument("--dry-run", action="store_true", help="compute + log, no writes")
    ap.add_argument("--live", action="store_true", help="apply writes + commit")
    ap.add_argument(
        "--reminder",
        action="store_true",
        help="bypass provider, just Telegram-ping pending picks past kickoff+2h",
    )
    args = ap.parse_args()

    if sum([args.dry_run, args.live, args.reminder]) > 1:
        print("ERROR: --dry-run, --live, --reminder are mutually exclusive", file=sys.stderr)
        return 2

    if args.reminder:
        return _reminder_mode()

    try:
        report = _gather_proposals()
    except Exception as exc:
        traceback.print_exc()
        _try_send_admin(f"Auto-settle FAILED at gather step: {exc}")
        return 1

    print(json.dumps({k: len(v) for k, v in report.items()}, indent=2))

    if args.dry_run:
        print(json.dumps(report, indent=2, ensure_ascii=False, default=str))
        return 0

    out_path = _write_shadow_report(report)
    print(f"Shadow report → {out_path}")

    if not args.live:
        # Shadow mode: notify admin on any actionable bucket (proposals,
        # un-parseable labels, no-data picks). Dedupe per (date, kind) so a
        # match that stays no-data across many cron ticks pings only once.
        notified = _load_notified()
        new_proposals = [
            p for p in report["proposed"]
            if notified.get(p["date"]) != p["outcome"]
        ]
        new_unknown = [
            p for p in report["skipped_unknown"]
            if notified.get(f"{p['date']}::unknown") != p.get("label", "")
        ]
        new_no_data = [
            p for p in report["skipped_no_data"]
            if notified.get(f"{p['date']}::no_data") != p.get("label", "")
        ]
        if new_proposals or new_unknown or new_no_data:
            diff = _build_telegram_diff(report, mode="shadow")
            _try_send_admin(diff)
            for p in report["proposed"]:
                notified[p["date"]] = p["outcome"]
            for p in report["skipped_unknown"]:
                notified[f"{p['date']}::unknown"] = p.get("label", "")
            for p in report["skipped_no_data"]:
                notified[f"{p['date']}::no_data"] = p.get("label", "")
            _save_notified(notified)
        return 0

    # --live
    if not report["proposed"]:
        print("Nothing to settle.")
        return 0

    # v1.3 SAFETY: in live mode, refuse to half-settle a day. If any pick
    # has skipped_unknown OR skipped_no_data, abort with an admin ping so
    # the operator can settle the missing pick manually before live can
    # run. Prevents the workflow from committing partial results that
    # would then race with a manual edit.
    if report["skipped_unknown"] or report["skipped_no_data"]:
        unparseable = [p["date"] for p in report["skipped_unknown"]]
        no_data = [p["date"] for p in report["skipped_no_data"]]
        msg = (
            "auto-settle live ABORTED — some picks have data gaps.\n"
            f"unparseable: {unparseable}\n"
            f"no_data: {no_data}\n"
            "Settle these manually first (CLAUDE.md §1), then re-run live."
        )
        print(msg, file=sys.stderr)
        _try_send_admin(msg)
        return 1

    # F7 (a): refuse to run live if the operator has uncommitted edits in
    # progress on the source-of-truth files. Otherwise the rollback path
    # could in principle overwrite work-in-progress.
    for guard_path in (PICKS_DATA_PATH, TRANSLATIONS_PATH):
        if guard_path.exists() and _is_file_dirty(guard_path):
            msg = (
                f"auto-settle aborted: working tree dirty on "
                f"{guard_path.name} — operator edit in progress"
            )
            print(msg, file=sys.stderr)
            _try_send_admin(msg)
            return 1

    try:
        _apply_live(report)
        subject = ", ".join(p["date"] for p in report["proposed"])
        _git_commit(f"[auto] settle {subject}")
    except Exception as exc:
        traceback.print_exc()
        # F7: rollback already happened inside _apply_live's except. This
        # is just the admin notification + exit code.
        _try_send_admin(f"Auto-settle LIVE FAILED, reverted. Error: {exc}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
