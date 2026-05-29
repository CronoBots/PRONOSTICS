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


def _clean_prose(text: str) -> str:
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


_AB_DESCRIPTIONS = {
    "AB-1": {
        "title": "Pas de pari sur un top-10 en warm-up Grand Chelem",
        "description": "Les meilleurs joueurs gardent leurs jambes pour le tournoi majeur. Leur cote n'intègre pas cette baisse de motivation.",
    },
    "AB-3": {
        "title": "Méfiance avec un outsider en feu en playoffs",
        "description": "Les équipes underdog qui surperforment en playoffs sont souvent surcotées — le marché extrapole trop vite.",
    },
    "AB-4": {
        "title": "Combo limité à 2 sélections maximum",
        "description": "Chaque sélection ajoutée multiplie le risque. À partir de 3 jambes, la probabilité de tout valider chute trop fort pour rester rentable.",
    },
    "AB-5": {
        "title": "Pas de MLB à cote > 2.50 sans analyse du lanceur",
        "description": "Les paris baseball dépendent du pitcher du jour. Sans cette analyse spécifique, on s'abstient.",
    },
    "AB-7": {
        "title": "Vérification fatigue au tour précédent",
        "description": "Si un joueur a fait un marathon au tour d'avant (5 sets, 3h+), sa cote ne reflète pas sa baisse de forme. On regarde toujours.",
    },
    "AB-8": {
        "title": "H2H croisé sur 2 sources pour un pari handicap",
        "description": "Les stats face-à-face sont parfois fausses sur une seule source. On croise pour éviter les fausses tendances.",
    },
    "AB-9": {
        "title": "Pas de réutilisation d'un joueur déjà engagé",
        "description": "Si un joueur figure déjà dans un pari en cours, on ne le remet pas dans un nouveau le même jour — pour éviter que deux paris dépendent du même résultat.",
    },
}


def _extract_risk_flags(rationale: list[str]) -> list[dict]:
    """Find anti-bias mentions in rationale and return plain-language
    title + description objects. Falls back to the raw text for warning
    lines that aren't a recognised AB code."""
    flags: list[dict] = []
    seen_codes: set[str] = set()
    joined = "\n".join(rationale)
    # AB-X flags
    for m in re.finditer(r"\b(AB-\d)\b\s*[:\-—]?\s*([^\n.]*)\.?", joined):
        code, context = m.group(1), m.group(2).strip()
        if code in seen_codes:
            continue
        seen_codes.add(code)
        meta = _AB_DESCRIPTIONS.get(code, {})
        flags.append({
            "code": code,
            "title": meta.get("title") or context or code,
            "description": meta.get("description") or "",
            "context": context if context else None,
        })
    # Explicit warnings (⚠️/🚨) not tied to an AB code
    for line in rationale:
        if re.search(r"⚠️|🚨", line):
            cleaned = re.sub(r"^[*\s#]+", "", line).strip()
            if len(cleaned) > 5 and not any(f["title"] == cleaned for f in flags):
                flags.append({
                    "code": "WARN",
                    "title": cleaned,
                    "description": "",
                    "context": None,
                })
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


def build_insights(pick: dict) -> dict[str, Any]:
    """Generate the full insights payload for a pick."""
    odds = float(pick.get("odds", 0))
    stake = float(pick.get("stake", 0))
    model_prob = float(pick.get("model_probability", 0))

    raw_sections = _parse_rationale_sections(pick.get("rationale", []))
    # Rename headers + scrub jargon. Drop sections we've explicitly mapped
    # to None (already covered by the risk-flags block).
    sections: dict[str, list[str]] = {}
    for title, lines in raw_sections.items():
        friendly = _FRIENDLY_SECTION_TITLES.get(title, title)
        if friendly is None:
            continue
        cleaned_lines = [_clean_prose(ln) for ln in lines if ln.strip()]
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


def _build_verdict(model: float, odds: float) -> dict[str, str]:
    """Produce a short label + tone (green/yellow/red) + plain-language
    explanation for non-experts."""
    ev_pct = _compute_ev_pct(model, odds)
    if ev_pct >= 15:
        return {
            "tone": "green",
            "label": "BON COUP",
            "text": (
                f"Sur 100 paris similaires, tu en gagnerais en moyenne "
                f"{int(round(model * 100))} et tu finirais en bénéfice "
                f"d'environ {ev_pct:.0f}% de ta mise. Le bookmaker "
                f"sous-estime nos chances."
            ),
        }
    if ev_pct >= 5:
        return {
            "tone": "yellow",
            "label": "OK",
            "text": (
                f"Petite marge en notre faveur ({ev_pct:.1f}% sur la durée). "
                f"Pari acceptable si tu joues régulièrement, sans surenchère."
            ),
        }
    if ev_pct >= 0:
        return {
            "tone": "yellow",
            "label": "À LA LIMITE",
            "text": (
                f"L'écart entre notre analyse et la cote est trop fin "
                f"({ev_pct:.1f}%). Mieux vaut passer ou diviser la mise."
            ),
        }
    return {
        "tone": "red",
        "label": "À ÉVITER",
        "text": (
            f"La cote ({odds:.2f}) est trop courte pour ta probabilité "
            f"de gain ({int(round(model * 100))}%). À long terme, ce type "
            f"de pari te fait perdre de l'argent. Skip."
        ),
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
