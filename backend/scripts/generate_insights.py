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


def _extract_risk_flags(rationale: list[str]) -> list[str]:
    """Find anti-bias mentions + warning emojis in rationale."""
    flags: list[str] = []
    joined = "\n".join(rationale)
    # AB-X flags
    for m in re.finditer(r"\bAB-\d\b[^.\n]*\.?", joined):
        flags.append(m.group(0).strip().rstrip("."))
    # Explicit warnings
    for line in rationale:
        if re.search(r"⚠️|🚨", line):
            cleaned = re.sub(r"^[*\s]+", "", line).strip()
            if len(cleaned) > 5 and cleaned not in flags:
                flags.append(cleaned)
    # Dedupe + cap
    seen, out = set(), []
    for f in flags:
        if f not in seen:
            seen.add(f)
            out.append(f)
    return out[:5]


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


def build_insights(pick: dict) -> dict[str, Any]:
    """Generate the full insights payload for a pick."""
    odds = float(pick.get("odds", 0))
    stake = float(pick.get("stake", 0))
    model_prob = float(pick.get("model_probability", 0))

    sections = _parse_rationale_sections(pick.get("rationale", []))
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


def _build_verdict(model: float, odds: float) -> dict[str, str]:
    """Produce a short label + tone (green/yellow/red) for the EV."""
    ev_pct = _compute_ev_pct(model, odds)
    if ev_pct >= 15:
        return {"tone": "green", "label": "VALUE FORTE", "text": f"EV +{ev_pct}% — pari bien priced."}
    if ev_pct >= 5:
        return {"tone": "yellow", "label": "VALUE MODÉRÉE", "text": f"EV +{ev_pct}% — marge acceptable."}
    if ev_pct >= 0:
        return {"tone": "yellow", "label": "BREAK-EVEN", "text": f"EV +{ev_pct}% — marginalement positif."}
    return {"tone": "red", "label": "NÉGATIVE EV", "text": f"EV {ev_pct}% — le marché te bat sur cette ligne."}


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

    insights = build_insights(pick)
    INSIGHTS_DIR.mkdir(parents=True, exist_ok=True)
    out = INSIGHTS_DIR / f"{pick['date']}.json"
    out.write_text(json.dumps(insights, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Insights → {out}")
    print(
        f"  pick: {pick['date']} · model {insights['model_probability']:.0%} · "
        f"odds {insights['odds']:.2f} · EV {insights['ev_pct']:+.1f}%"
    )
    print(f"  legs: {len(insights['legs'])} · sources: {len(insights['sources'])} · risks: {len(insights['risk_flags'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
