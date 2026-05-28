"""Pure settlement rules for NEXBET picks.

Two responsibilities, NO I/O:

1. **Parser** — port of `frontend/src/components/HistoryList.tsx::parsePickLabel`
   (byte-identical regex grammar). Turns a French or English pick label into
   one or more `BetSpec` instances (compound singles split on " + ").

2. **Rules** — given a `BetSpec` and a `MatchScore` (canned facts about the
   match), return ``"win" | "loss" | "void"``. Pure function, no network.

This module is import-safe and has no side effects.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Literal, Optional

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

Market = Literal[
    "tennis_match_winner",
    "tennis_exact_sets",
    "tennis_total_games",
    "football_ml_regulation",
    "football_btts",
    "basket_team_ml",
    "basket_total_points",
    "basket_player_points",
    "unknown",
]

Outcome = Literal["win", "loss", "void"]


@dataclass
class BetSpec:
    """A single, atomic settlement question.

    A compound single (e.g. "Liverpool ML + BTTS") yields TWO BetSpec
    objects via :func:`parse_pick_label_full`.
    """

    market: Market
    target: Optional[str] = None  # entity name (player / team) or None
    threshold: Optional[float] = None
    direction: Optional[Literal["over", "under"]] = None
    n_sets: Optional[int] = None
    extra: dict[str, Any] = field(default_factory=dict)
    raw_label: str = ""


@dataclass
class MatchScore:
    """Canned facts about a match — what the settlement rules consume."""

    status: Literal["final", "in_progress", "postponed", "retired", "walkover"]
    home_team: str = ""
    away_team: str = ""
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    set_scores: Optional[list[tuple[int, int]]] = None  # tennis only
    regulation_score: Optional[tuple[int, int]] = None  # foot only (90'+stoppage)
    player_points: Optional[dict[str, int]] = None  # basket only
    started_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Parser — ported from HistoryList.tsx::parsePickLabel (byte-identical regex)
# ---------------------------------------------------------------------------


# Annotation parenthétique interne (notes de curation auteur)
_ANNOTATION_RE = re.compile(r"\s*\([^)]*\b(?:combo|maison)\b[^)]*\)\s*", re.IGNORECASE)

# ML 90 min / temps réglementaire / regulation time
_ML_REG_RE = re.compile(
    r"^(.+?)\s+(?:ML(?:\s+90\s*min)?\s*(?:\(temps\s+r[eé]glementaire\))?"
    r"|vainqueur(?:\s+du\s+match)?\s+\(?\s*(?:90\s*min|temps\s+r[eé]glementaire)\s*\)?"
    r"|to win in (?:regulation|regular time))\s*$",
    re.IGNORECASE,
)

# Match winner standard (FR fem/masc/pluriels + EN)
_ML_RE = re.compile(
    r"^(.+?)\s+(vainqueure?s?\s+du\s+match|vainqueure?s?|gagne|gagnante?s?"
    r"|to win match|to win|wins match|wins)\s*$",
    re.IGNORECASE,
)

# Win in N sets exactly
_SETS_RE = re.compile(
    r"^(.+?)\s+(?:in|en)\s+(\d)\s+sets?(?:\s+(?:exactement|exactly))?$",
    re.IGNORECASE,
)

# Total Over/Under (standalone — no entity prefix)
_TOTAL_STANDALONE_RE = re.compile(
    r"^(over|under|plus de|moins de)\s+([\d.]+)(?:\s+(?:jeux|games|points?|pts?)(?:\s+totaux?)?)?$",
    re.IGNORECASE,
)

# Handicap (entity ±N.N jeux/games)
_HCP_RE = re.compile(
    r"^(.+?)\s+([+-]\d+\.?\d*)\s*(jeux|games)?$",
    re.IGNORECASE,
)

# Player-prop Over/Under points (e.g. "Edwards Over 28.5 pts")
_PLAYER_PROP_RE = re.compile(
    r"^(.+?)\s+(over|under|plus de|moins de)\s+([\d.]+)\s*(pts?|points?)$",
    re.IGNORECASE,
)

# Total games / points (entity-less, with units)
_TOTAL_GAMES_RE = re.compile(
    r"^(over|under|plus de|moins de)\s+([\d.]+)\s+(?:jeux|games)(?:\s+totaux?)?$",
    re.IGNORECASE,
)

_TOTAL_POINTS_RE = re.compile(
    r"^(over|under|plus de|moins de)\s+([\d.]+)\s+(?:total\s+)?(?:points?|pts?)(?:\s+totaux?)?$",
    re.IGNORECASE,
)

# BTTS
_BTTS_RE = re.compile(
    r"^(?:both\s+teams\s+to\s+score|les\s+deux\s+[ée]quipes\s+marquent|btts)$",
    re.IGNORECASE,
)


def _strip_win_suffix(name: str) -> str:
    """Mirror of HistoryList.tsx::stripWinSuffix."""
    out = re.sub(
        r"\s+(vainqueure?s?\s+du\s+match|vainqueure?s?|gagne|gagnante?s?)\s*$",
        "",
        name,
        flags=re.IGNORECASE,
    )
    out = re.sub(
        r"\s+(to win match|to win|wins match|wins)\s*$",
        "",
        out,
        flags=re.IGNORECASE,
    )
    return out.strip()


def _direction(token: str) -> Literal["over", "under"]:
    return "over" if re.search(r"over|plus", token, re.IGNORECASE) else "under"


def _normalise(label: str) -> str:
    """Strip internal annotations + collapse whitespace."""
    out = _ANNOTATION_RE.sub(" ", label).strip()
    out = re.sub(r"\s+", " ", out)
    return out


def _infer_market_from_threshold_kind(label: str, fragment: str) -> Market:
    """Decide whether 'Over 28.5 pts' is basket points or tennis games.

    Heuristic: explicit "pts"/"points" → basket; explicit "jeux"/"games" →
    tennis; bare numeric → tennis_total_games (most common in our picks).
    """
    if re.search(r"\b(pts?|points?)\b", fragment, re.IGNORECASE):
        return "basket_total_points"
    if re.search(r"\b(jeux|games)\b", fragment, re.IGNORECASE):
        return "tennis_total_games"
    # Bare "Under 14.5" — context (other leg / pick.sport) would clarify,
    # but with no context we default to tennis_total_games (typical usage).
    return "tennis_total_games"


def _parse_single_spec(fragment: str, lang: Literal["fr", "en"] = "fr") -> BetSpec:
    """Parse ONE fragment (no " + " inside) into a BetSpec."""
    raw = fragment
    text = fragment.strip()

    # 1. ML 90 min / regulation
    m = _ML_REG_RE.match(text)
    if m:
        return BetSpec(
            market="football_ml_regulation",
            target=m.group(1).strip(),
            raw_label=raw,
        )

    # 2. BTTS
    if _BTTS_RE.match(text):
        return BetSpec(market="football_btts", raw_label=raw)

    # 3. Sets exact
    m = _SETS_RE.match(text)
    if m:
        return BetSpec(
            market="tennis_exact_sets",
            target=_strip_win_suffix(m.group(1).strip()),
            n_sets=int(m.group(2)),
            raw_label=raw,
        )

    # 4. Player prop (basket): "Edwards Over 28.5 pts"
    m = _PLAYER_PROP_RE.match(text)
    if m:
        return BetSpec(
            market="basket_player_points",
            direction=_direction(m.group(2)),
            threshold=float(m.group(3)),
            extra={"player": m.group(1).strip()},
            raw_label=raw,
        )

    # 5. Total games (entity-less, with units)
    m = _TOTAL_GAMES_RE.match(text)
    if m:
        return BetSpec(
            market="tennis_total_games",
            direction=_direction(m.group(1)),
            threshold=float(m.group(2)),
            raw_label=raw,
        )

    # 6. Total points (entity-less, with units)
    m = _TOTAL_POINTS_RE.match(text)
    if m:
        return BetSpec(
            market="basket_total_points",
            direction=_direction(m.group(1)),
            threshold=float(m.group(2)),
            raw_label=raw,
        )

    # 7. Total Over/Under (entity-less, no unit) — infer market
    m = _TOTAL_STANDALONE_RE.match(text)
    if m:
        return BetSpec(
            market=_infer_market_from_threshold_kind(text, raw),
            direction=_direction(m.group(1)),
            threshold=float(m.group(2)),
            raw_label=raw,
        )

    # 8. Handicap (entity ±X.X jeux)
    m = _HCP_RE.match(text)
    if m:
        # Skip false positives like "Edwards Over 28.5 pts" handled above
        return BetSpec(
            market="unknown",
            target=_strip_win_suffix(m.group(1).strip()),
            threshold=float(m.group(2)),
            extra={"handicap_unit": (m.group(3) or "").lower()},
            raw_label=raw,
        )

    # 9. Match winner — must be AFTER specific markets so "X vainqueur en 2
    #    sets" doesn't get caught here.
    m = _ML_RE.match(text)
    if m:
        target = m.group(1).strip()
        # Tennis vs basket vs foot match-winner can't be distinguished here.
        # Default to tennis_match_winner; auto_settle uses pick["sport"] to
        # remap to basket_team_ml or football_ml_regulation as needed.
        return BetSpec(
            market="tennis_match_winner",
            target=target,
            raw_label=raw,
        )

    # 10. Fallback
    return BetSpec(market="unknown", raw_label=raw)


def parse_pick_label(label: str, lang: Literal["fr", "en"] = "fr") -> BetSpec:
    """Parse a single (non-compound) pick label into ONE BetSpec.

    For compound labels (containing " + "), use parse_pick_label_full
    which returns a list.
    """
    norm = _normalise(label)
    if " + " in norm:
        # Compound — return the FIRST spec but the caller is expected to
        # have used parse_pick_label_full instead.
        return _parse_single_spec(norm.split(" + ", 1)[0], lang)
    return _parse_single_spec(norm, lang)


def parse_pick_label_full(
    label: str,
    lang: Literal["fr", "en"] = "fr",
) -> list[BetSpec]:
    """Parse a (possibly compound) single pick into a list of BetSpec.

    A compound single like "Liverpool ML + BTTS" yields TWO specs.
    Combos (with their own `legs[]` field) are NOT handled here — the
    caller iterates `legs[].pick` directly.
    """
    norm = _normalise(label)
    parts = [p.strip() for p in re.split(r"\s+\+\s+", norm) if p.strip()]
    if len(parts) <= 1:
        return [_parse_single_spec(norm, lang)]
    return [_parse_single_spec(p, lang) for p in parts]


# ---------------------------------------------------------------------------
# Rules
# ---------------------------------------------------------------------------


def _name_matches(a: str, b: str) -> bool:
    """Loose name match: case-insensitive substring either way after
    accent normalisation."""
    if not a or not b:
        return False
    norm = lambda s: re.sub(r"[^a-z0-9 ]", "", _strip_accents(s).lower()).strip()
    na, nb = norm(a), norm(b)
    if not na or not nb:
        return False
    # Use the last token (surname) as a fast fallback for "Naomi Osaka" → "Osaka"
    return na in nb or nb in na or na.split()[-1] in nb or nb.split()[-1] in na


def _strip_accents(s: str) -> str:
    import unicodedata

    return "".join(
        c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"
    )


def _resolve_side(target: str, score: MatchScore) -> Optional[Literal["home", "away"]]:
    """Identify whether ``target`` refers to home or away."""
    if _name_matches(target, score.home_team):
        return "home"
    if _name_matches(target, score.away_team):
        return "away"
    return None


def _sets_total_games(set_scores: list[tuple[int, int]]) -> int:
    """Sum games across all sets. A 7-6 set counts as 13 (NOT the TB
    mini-score)."""
    return sum(h + a for h, a in set_scores)


def apply_rule(spec: BetSpec, score: MatchScore) -> Outcome:  # noqa: C901
    """Settle one BetSpec against canned match facts.

    Pure function. ``"win"``, ``"loss"`` or ``"void"``. Postponed picks
    are voided only if more than 48h have elapsed since the original
    kickoff (caller should pass status="postponed" + started_at).
    """

    # Postponed: void if > 48h, else caller should defer (returns void here
    # to signal "settled as void" — only when started_at is sufficiently old)
    if score.status == "postponed":
        now = datetime.now(timezone.utc)
        if score.started_at is not None:
            age = now - score.started_at
            if age > timedelta(hours=48):
                return "void"
        # Otherwise caller skips — but the rule layer doesn't know that,
        # so we still return "void" as the conservative end-state. Auto-
        # settle.py checks the 48h gate BEFORE calling apply_rule().
        return "void"

    market = spec.market

    # ---- tennis_match_winner ---------------------------------------
    if market == "tennis_match_winner":
        # Retired/walkover: void unless ≥1 set completed → settle to advancer
        if score.status in {"retired", "walkover"}:
            if score.set_scores and len(score.set_scores) >= 1:
                # Determine advancer: whoever won more sets (or whoever has
                # higher home_score/away_score if encoded as sets-won)
                if score.home_score is not None and score.away_score is not None:
                    side = _resolve_side(spec.target or "", score)
                    if side is None:
                        return "void"
                    if score.home_score == score.away_score:
                        return "void"  # incomplete data
                    home_advances = score.home_score > score.away_score
                    return (
                        "win"
                        if (side == "home" and home_advances)
                        or (side == "away" and not home_advances)
                        else "loss"
                    )
            return "void"
        if score.status != "final":
            return "void"
        if score.home_score is None or score.away_score is None:
            return "void"
        side = _resolve_side(spec.target or "", score)
        if side is None:
            return "void"
        home_wins = score.home_score > score.away_score
        return (
            "win"
            if (side == "home" and home_wins) or (side == "away" and not home_wins)
            else "loss"
        )

    # ---- basket_team_ml (resolved from match_winner by auto_settle) -
    if market == "basket_team_ml":
        if score.status != "final":
            return "void"
        if score.home_score is None or score.away_score is None:
            return "void"
        side = _resolve_side(spec.target or "", score)
        if side is None:
            return "void"
        home_wins = score.home_score > score.away_score
        return (
            "win"
            if (side == "home" and home_wins) or (side == "away" and not home_wins)
            else "loss"
        )

    # ---- tennis_exact_sets ----------------------------------------
    if market == "tennis_exact_sets":
        # ALWAYS void on retired/walkover regardless of stage
        if score.status in {"retired", "walkover"}:
            return "void"
        if score.status != "final":
            return "void"
        if not score.set_scores:
            return "void"
        side = _resolve_side(spec.target or "", score)
        if side is None:
            return "void"
        # Whoever won more sets is the match winner
        home_sets = sum(1 for h, a in score.set_scores if h > a)
        away_sets = sum(1 for h, a in score.set_scores if a > h)
        winner_side = "home" if home_sets > away_sets else "away"
        target_won = winner_side == side
        if not target_won:
            return "loss"
        if spec.n_sets is None:
            return "loss"
        return "win" if len(score.set_scores) == spec.n_sets else "loss"

    # ---- tennis_total_games ---------------------------------------
    if market == "tennis_total_games":
        if score.status in {"retired", "walkover"}:
            return "void"
        if score.status != "final":
            return "void"
        if not score.set_scores or spec.threshold is None:
            return "void"
        total = _sets_total_games(score.set_scores)
        if total == spec.threshold:
            return "void"
        is_over = total > spec.threshold
        return "win" if (is_over == (spec.direction == "over")) else "loss"

    # ---- football_ml_regulation -----------------------------------
    if market == "football_ml_regulation":
        if score.status != "final":
            return "void"
        reg = score.regulation_score
        if reg is None and score.home_score is not None and score.away_score is not None:
            reg = (score.home_score, score.away_score)
        if reg is None:
            return "void"
        h, a = reg
        side = _resolve_side(spec.target or "", score)
        if side is None:
            return "void"
        # 3-way: a draw means BOTH home_pick and away_pick LOSE
        if h == a:
            return "loss"
        home_wins = h > a
        return (
            "win"
            if (side == "home" and home_wins) or (side == "away" and not home_wins)
            else "loss"
        )

    # ---- football_btts --------------------------------------------
    if market == "football_btts":
        if score.status != "final":
            return "void"
        reg = score.regulation_score
        if reg is None and score.home_score is not None and score.away_score is not None:
            reg = (score.home_score, score.away_score)
        if reg is None:
            return "void"
        h, a = reg
        return "win" if (h >= 1 and a >= 1) else "loss"

    # ---- basket_total_points --------------------------------------
    if market == "basket_total_points":
        if score.status != "final":
            return "void"
        if score.home_score is None or score.away_score is None:
            return "void"
        if spec.threshold is None:
            return "void"
        total = score.home_score + score.away_score
        if total == spec.threshold:
            return "void"
        is_over = total > spec.threshold
        return "win" if (is_over == (spec.direction == "over")) else "loss"

    # ---- basket_player_points -------------------------------------
    if market == "basket_player_points":
        if score.status != "final":
            return "void"
        if spec.threshold is None or spec.direction is None:
            return "void"
        player = (spec.extra or {}).get("player")
        if not player or not score.player_points:
            # Caller treats absence as un-settleable (returns void here so a
            # caller's combo aggregator votes void; auto_settle.py checks
            # data presence BEFORE calling apply_rule for this market).
            return "void"
        # Loose lookup: surname match
        pp = score.player_points
        pts: Optional[int] = pp.get(player)
        if pts is None:
            # Surname fallback
            for k, v in pp.items():
                if _name_matches(player, k):
                    pts = v
                    break
        if pts is None:
            return "void"
        if pts == spec.threshold:
            return "void"
        is_over = pts > spec.threshold
        return "win" if (is_over == (spec.direction == "over")) else "loss"

    # ---- unknown --------------------------------------------------
    return "void"
