#!/usr/bin/env python3
"""Generate structured AI insights for the current pending pick.

Reads the pending pick from picks_data.PICKS, builds a rich JSON
payload with per-leg probabilities, EV calculation, narrative
sections, risk flags, and source citations. Writes to
backend/data/insights/<date>.json (also copied to
frontend/public/data/insights/ by the prebuild hook).

Used by the <MatchInsights> frontend component to render a
SofaScore-Analyst-style insights panel on the /today page.

Usage:
    python backend/scripts/generate_insights.py            # current pending
    python backend/scripts/generate_insights.py --date 2026-05-29
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import picks_data  # noqa: E402
import picks_translations_en  # noqa: E402

INSIGHTS_DIR = ROOT / "data" / "insights"


def _parse_rationale_sections(rationale: list[str]) -> dict[str, list[str]]:
    """Group rationale lines by their ## section header.

    Input: ["## 🎯 Le contexte", "line 1", "line 2", "## 📊 L'analyse", "line 3"]
    Output: {"🎯 Le contexte": ["line 1", "line 2"], "📊 L'analyse": ["line 3"]}
    """
    sections: dict[str, list[str]] = {}
    current = "Intro"
    sections[current] = []
    for line in rationale:
        m = re.match(r"^##\s+(.+?)\s*$", line)
        if m:
            current = m.group(1)
            sections[current] = []
        else:
            sections[current].append(line)
    # Drop empty sections
    return {k: v for k, v in sections.items() if v}


# Maps the agent's emoji-prefixed section headers to friendlier titles
# that read naturally for someone who's never bet before.
_FRIENDLY_SECTION_TITLES = {
    "🎯 Le contexte": "🎯 La situation aujourd'hui",
    "🎯 Le match": "🎯 Le match en question",
    "📊 L'analyse": "📊 Pourquoi on y croit",
    "📊 L'analyse des 2 sélections": "📊 Pourquoi on y croit (par sélection)",
    "📊 L'analyse des 3 sélections": "📊 Pourquoi on y croit (par sélection)",
    "🎰 Le pari": "🎰 Le détail du pari",
    "🚨 Anti-bias appliqués": None,  # Already covered by the risk flags section
}


# Lightweight jargon scrub on the rationale prose — strips parenthetical
# AB-X annotations and replaces a small set of betting-trader terms with
# their plain-language equivalents.
_PROSE_REPLACEMENTS = [
    (re.compile(r"\(AB-\d[^)]*\)"), ""),
    (re.compile(r"\bAB-\d\b\s*:?\s*"), ""),
    (re.compile(r"\bv\d\.\d+(\.\d+)?\b", re.IGNORECASE), ""),
    (re.compile(r"\bEV NÉGATIF\b", re.IGNORECASE), "rentabilité négative"),
    (re.compile(r"\bEV POSITIF\b", re.IGNORECASE), "rentabilité positive"),
    (re.compile(r"\bEV\b(?=\s*[+-]?\d|\s*\W*$)"), "rentabilité de"),
    (re.compile(r"\bEV\b"), "rentabilité"),
    (re.compile(r"\bedge\b", re.IGNORECASE), "marge"),
    (re.compile(r"\bvalue\b", re.IGNORECASE), "rentabilité"),
    (re.compile(r"\bH2H\b"), "historique face-à-face"),
    (re.compile(r"\bkickoff\b", re.IGNORECASE), "début du match"),
    (re.compile(r"\bmatch-winner(s)?\b", re.IGNORECASE), r"pari sur le vainqueur"),
    (re.compile(r"\bupset\b", re.IGNORECASE), "surprise"),
    (re.compile(r"\bpivot stratégique\b", re.IGNORECASE), "changement d'angle"),
    (re.compile(r"\s{2,}"), " "),
    (re.compile(r"\s+([,.;:])"), r"\1"),
]


def _clean_prose(text: str, lang: str = "fr") -> str:
    """Strip trader jargon. FR-only — the dictionary maps French
    jargon to French plain language, so leave EN untouched."""
    if lang != "fr":
        return text.strip()
    out = text
    for pat, repl in _PROSE_REPLACEMENTS:
        out = pat.sub(repl, out)
    return out.strip()


_SOURCE_DISPLAY = {
    "dimers.com": "Dimers",
    "statsinsider": "Stats Insider",
    "tennistonic": "Tennis Tonic",
    "lastwordonsports": "Last Word",
    "si.com": "Sports Illustrated",
    "actionnetwork": "Action Network",
    "rotowire": "RotoWire",
    "pickswise": "Pickswise",
    "vsin.com": "VSIN",
    "olympics.com": "Olympics",
    "rolandgarros": "Roland Garros officiel",
    "wtatennis": "WTA Tour",
    "atptour": "ATP Tour",
    "cnn.com": "CNN",
    "thestatszone": "The Stats Zone",
    "bleachernation": "Bleacher Nation",
    "covers.com": "Covers",
    "sportytrader": "SportyTrader",
    "bettingexpert": "BettingExpert",
    "racingpost": "Racing Post",
    "williamhill": "William Hill",
    "draftkings": "DraftKings",
    "fanduel": "FanDuel",
    "scores24": "Scores24",
    "matchstat": "MatchStat",
    "goonersguide": "Sportsbook Lines",
}


def _humanize_source(url: str) -> str:
    """Strip URL → recognisable provider name."""
    for needle, name in _SOURCE_DISPLAY.items():
        if needle in url.lower():
            return name
    # Fallback: domain root
    m = re.match(r"https?://(?:www\.)?([^/]+)", url)
    return m.group(1) if m else url


def _extract_risk_flags(rationale: list[str]) -> list[dict]:
    """Extract anti-bias mentions as locale-agnostic structured records.

    Output format: [{code, context}] where code is the i18n key suffix
    (e.g. "AB-4") and context is the pick-specific note from the agent.
    The frontend renders title + description from i18n keys
    `insights.risk.<code>.title` / `.description`, and shows the
    context as a separate "Sur ce pari : <ctx>" line.

    Unrecognised ⚠️/🚨 lines get code "WARN" with the raw line as context.
    """
    flags: list[dict] = []
    seen_codes: set[str] = set()
    joined = "\n".join(rationale)
    # Line-by-line: the agent's dedicated "🚨 Anti-bias appliqués"
    # section has one AB-N per line in a clean "AB-N : context ✅" form.
    # That's our primary source. Strip the leading code + separator and
    # trailing markers/punctuation.
    line_pat = re.compile(
        r"^\s*\**\s*(AB-\d)\b(?:\s+v\d+(?:\.\d+){0,2})?\s*[:\-—]\s*(.+?)\s*[✅✓]?\s*\.?\s*\**\s*$"
    )
    for line in rationale:
        m = line_pat.match(line)
        if not m:
            continue
        code, context = m.group(1), m.group(2).strip()
        if code in seen_codes:
            continue
        seen_codes.add(code)
        flags.append({"code": code, "context": context or None})
    for line in rationale:
        # Skip section headers (## …) — they're not warnings.
        if line.lstrip().startswith("##"):
            continue
        if re.search(r"⚠️|🚨", line):
            cleaned = re.sub(r"^[*\s#]+", "", line).strip()
            if len(cleaned) > 5 and not any(
                (f.get("context") or "") == cleaned for f in flags
            ):
                flags.append({"code": "WARN", "context": cleaned})
    return flags[:6]


def _compute_ev_pct(probability: float, odds: float) -> float:
    return round((probability * odds - 1) * 100, 1)


def _leg_insights(leg: dict, pick: dict) -> dict[str, Any]:
    """Build per-leg insights for a combo entry."""
    odds = float(leg.get("odds", 0))
    # For a combo leg, we don't have per-leg model_probability stored.
    # Best heuristic: split the pick's overall model_probability across
    # legs as the geometric distribution (if pick model = 0.55, 2 legs,
    # each ~sqrt(0.55) = 0.74). Operator can override later.
    pick_model = float(pick.get("model_probability", 0.5))
    n_legs = max(1, len(pick.get("legs", [])))
    leg_model = round(pick_model ** (1.0 / n_legs), 3)
    market_implied = round(1.0 / odds, 3) if odds > 0 else 0.0
    return {
        "home_team": leg.get("home_team", ""),
        "away_team": leg.get("away_team", ""),
        "pick_label": leg.get("pick", ""),
        "kickoff": leg.get("kickoff", ""),
        "odds": odds,
        "model_probability": leg_model,
        "market_implied": market_implied,
        "ev_pct": _compute_ev_pct(leg_model, odds),
    }


def build_insights(pick: dict, lang: str = "fr") -> dict[str, Any]:
    """Generate the full insights payload for a pick in the requested
    locale. The rationale prose is taken as-is from the pick (FR if it's
    the source picks_data entry, EN if translated via picks_translations_en).
    Only the FR variant gets jargon scrubbing applied to its prose."""
    odds = float(pick.get("odds", 0))
    stake = float(pick.get("stake", 0))
    model_prob = float(pick.get("model_probability", 0))

    raw_sections = _parse_rationale_sections(pick.get("rationale", []))
    # Rename headers + scrub jargon. Drop sections we've explicitly mapped
    # to None (already covered by the risk-flags block). FR-only headers
    # are mapped to friendlier FR; EN headers come through as-is.
    sections: dict[str, list[str]] = {}
    for title, lines in raw_sections.items():
        if lang == "fr":
            friendly = _FRIENDLY_SECTION_TITLES.get(title, title)
            if friendly is None:
                continue
        else:
            # EN: skip the "Anti-bias checks applied" section (covered by
            # risk flags); use the title verbatim otherwise.
            if "Anti-bias" in title or "🚨" in title:
                continue
            friendly = title
        cleaned_lines = [_clean_prose(ln, lang=lang) for ln in lines if ln.strip()]
        if cleaned_lines:
            sections[friendly] = cleaned_lines

    risk_flags = _extract_risk_flags(pick.get("rationale", []))

    sources = [
        {"url": s, "name": _humanize_source(s)}
        for s in pick.get("sources", [])
    ]

    legs = [_leg_insights(leg, pick) for leg in pick.get("legs", [])]

    return {
        "date": pick["date"],
        "sport": pick.get("sport"),
        "league": pick.get("league"),
        "pick_label": pick.get("pick"),
        "headline": pick.get("headline"),
        "odds": odds,
        "stake": stake,
        "model_probability": model_prob,
        "market_implied": round(1.0 / odds, 3) if odds > 0 else 0.0,
        "ev_pct": _compute_ev_pct(model_prob, odds),
        "potential_return": round(stake * odds, 2),
        "potential_profit": round(stake * (odds - 1), 2),
        "legs": legs,
        "sections": sections,
        "risk_flags": risk_flags,
        "sources": sources,
        "verdict": _build_verdict(model_prob, odds),
    }


def _build_verdict(model: float, odds: float) -> dict[str, Any]:
    """Produce a locale-agnostic verdict structure.

    Output: {tone, key, params} — frontend renders via
    `t(\"insights.verdict.${key}.label\")` and the equivalent .text key
    with {prob, ev, odds} interpolations.
    """
    ev_pct = _compute_ev_pct(model, odds)
    if ev_pct >= 15:
        key, tone = "bonCoup", "green"
    elif ev_pct >= 5:
        key, tone = "ok", "yellow"
    elif ev_pct >= 0:
        key, tone = "limite", "yellow"
    else:
        key, tone = "eviter", "red"
    return {
        "tone": tone,
        "key": key,
        "params": {
            "prob": int(round(model * 100)),
            "ev": round(ev_pct, 1),
            "odds": round(odds, 2),
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--date",
        help="Generate for a specific pick date (YYYY-MM-DD). Default: latest pending.",
    )
    args = ap.parse_args()

    if args.date:
        pick = next((p for p in picks_data.PICKS if p["date"] == args.date), None)
    else:
        pending = [p for p in picks_data.PICKS if p.get("outcome") == "pending"]
        pick = max(pending, key=lambda p: p["date"]) if pending else None

    if pick is None:
        print("No matching pick found.", file=sys.stderr)
        return 1

    INSIGHTS_DIR.mkdir(parents=True, exist_ok=True)

    # FR (source) JSON
    insights_fr = build_insights(pick, lang="fr")
    out_fr = INSIGHTS_DIR / f"{pick['date']}.fr.json"
    out_fr.write_text(json.dumps(insights_fr, indent=2, ensure_ascii=False), encoding="utf-8")

    # EN (overlay) JSON — applies picks_translations_en.translate_pick
    # to the pick before parsing rationale into sections. Everything
    # else (legs, finance, verdict, risk codes) is identical.
    pick_en = picks_translations_en.translate_pick(pick)
    insights_en = build_insights(pick_en, lang="en")
    out_en = INSIGHTS_DIR / f"{pick['date']}.en.json"
    out_en.write_text(json.dumps(insights_en, indent=2, ensure_ascii=False), encoding="utf-8")

    # Legacy alias — keep <date>.json as a copy of the FR file so any
    # consumer still using the old name doesn't break. Drop later.
    legacy = INSIGHTS_DIR / f"{pick['date']}.json"
    legacy.write_text(json.dumps(insights_fr, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Insights → {out_fr.name} + {out_en.name}")
    print(
        f"  pick: {pick['date']} · model {insights_fr['model_probability']:.0%} · "
        f"odds {insights_fr['odds']:.2f} · EV {insights_fr['ev_pct']:+.1f}%"
    )
    print(
        f"  legs: {len(insights_fr['legs'])} · sources: {len(insights_fr['sources'])}"
        f" · risks: {len(insights_fr['risk_flags'])}"
        f" · EN rationale: {'YES' if insights_fr['sections'] != insights_en['sections'] else 'NO (fallback to FR)'}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
