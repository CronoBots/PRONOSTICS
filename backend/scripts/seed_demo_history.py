#!/usr/bin/env python
"""Seed l'historique de démo : 20 picks curatés du 01/05/2026 au 20/05/2026.

Win rate visé : ~80% (16W / 4L sur 20). Le pick du 20/05 reste "pending".

Génère :
  - backend/data/history.json
  - backend/data/predictions/2026-05-20.json (pour le rendu du jour côté front)
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.config import DATA_DIR  # noqa: E402
from app.services.history import (  # noqa: E402
    DEFAULT_STAKE,
    DEFAULT_STARTING_BANKROLL,
    recompute_stats,
    save_history,
)


# Picks curatés : (date, sport, league, home, away, pick, odds, model_prob,
#                  rationale_short, outcome)
PICKS: list[tuple] = [
    (
        "2026-05-01", "football", "Serie A", "Inter Milan", "Lazio",
        "Inter Milan", 2.10, 0.58,
        ["Inter sur 4V de suite, Lazio 3 défaites loin de Rome", "xG diff +0.6 sur les 5 derniers matchs"],
        "win",
    ),
    (
        "2026-05-02", "tennis", "ATP Madrid Open", "Carlos Alcaraz", "Holger Rune",
        "Carlos Alcaraz", 2.05, 0.62,
        ["Alcaraz 4-1 H2H, surface favorable", "Forme récente : SF Monte-Carlo + finale Barcelone"],
        "win",
    ),
    (
        "2026-05-03", "basketball", "NBA Playoffs", "Boston Celtics", "Cleveland Cavaliers",
        "Boston Celtics", 2.40, 0.51,
        ["Celtics 28-13 à domicile, défense Top 3", "Tatum 32 PPG dans la série"],
        "loss",
    ),
    (
        "2026-05-04", "football", "Premier League", "Manchester City", "Arsenal",
        "Manchester City", 2.15, 0.57,
        ["City invaincu sur 12 matchs", "Arsenal sans Ødegaard (blessure)"],
        "win",
    ),
    (
        "2026-05-05", "football", "Bundesliga", "Bayern Munich", "Bayer Leverkusen",
        "Bayern Munich", 2.30, 0.54,
        ["Bayern à l'Allianz : 18V sur 20 cette saison", "Leverkusen 2D sur les 3 derniers déplacements"],
        "win",
    ),
    (
        "2026-05-06", "tennis", "WTA Madrid Open", "Iga Swiatek", "Aryna Sabalenka",
        "Iga Swiatek", 2.10, 0.59,
        ["Swiatek 8-4 H2H, dominance terre battue", "Sabalenka 2 défaites consécutives"],
        "win",
    ),
    (
        "2026-05-07", "football", "La Liga", "Real Madrid", "Sevilla",
        "Real Madrid", 2.05, 0.61,
        ["Bernabéu : 14V sur 15 cette saison", "Sevilla 9e, défense fragile (1.6 buts/match encaissés)"],
        "win",
    ),
    (
        "2026-05-08", "basketball", "NBA Playoffs", "Denver Nuggets", "Minnesota Timberwolves",
        "Denver Nuggets", 2.20, 0.56,
        ["Jokić triple-double sur les 3 derniers matchs", "Avantage altitude à Denver"],
        "win",
    ),
    (
        "2026-05-09", "tennis", "ATP Italian Open", "Jannik Sinner", "Daniil Medvedev",
        "Jannik Sinner", 2.10, 0.54,
        ["Sinner n°1 mondial, 6V consécutives", "Medvedev historiquement faible sur terre"],
        "loss",
    ),
    (
        "2026-05-10", "football", "Ligue 1", "PSG", "Marseille",
        "PSG", 2.05, 0.62,
        ["Le Classique à Paris : PSG 8V sur les 10 derniers", "OM décimé par les suspensions"],
        "win",
    ),
    (
        "2026-05-11", "football", "Premier League", "Liverpool", "Tottenham",
        "Liverpool", 2.25, 0.55,
        ["Anfield : aucune défaite à domicile cette saison", "Salah 22 buts en championnat"],
        "win",
    ),
    (
        "2026-05-12", "tennis", "ATP Italian Open", "Novak Djokovic", "Stefanos Tsitsipas",
        "Novak Djokovic", 2.10, 0.58,
        ["Djokovic 11-2 H2H", "Tsitsipas 3D sur les 5 derniers Masters 1000"],
        "win",
    ),
    (
        "2026-05-13", "basketball", "NBA Playoffs", "New York Knicks", "Indiana Pacers",
        "New York Knicks", 2.35, 0.52,
        ["Brunson 30+ PPG dans la série", "Madison Square Garden facteur clé"],
        "win",
    ),
    (
        "2026-05-14", "football", "Serie A", "Juventus", "Roma",
        "Juventus", 2.40, 0.49,
        ["Allianz Stadium forteresse : 12V cette saison", "Roma fatigué (Europa League jeudi)"],
        "loss",
    ),
    (
        "2026-05-15", "football", "La Liga", "Atletico Madrid", "Valencia",
        "Atletico Madrid", 2.10, 0.58,
        ["Atletico Metropolitano : meilleure défense à domicile (0.4 buts encaissés)", "Valencia 14e, sans enjeu"],
        "win",
    ),
    (
        "2026-05-16", "tennis", "WTA Italian Open", "Coco Gauff", "Elena Rybakina",
        "Coco Gauff", 2.20, 0.54,
        ["Gauff progresse sur terre, victoire Madrid", "Rybakina blessure récente"],
        "win",
    ),
    (
        "2026-05-17", "football", "Bundesliga", "Borussia Dortmund", "Stuttgart",
        "Borussia Dortmund", 2.15, 0.57,
        ["Dortmund 9V sur 10 au Signal Iduna Park", "Stuttgart en chute libre (0V sur 5)"],
        "win",
    ),
    (
        "2026-05-18", "basketball", "NBA Playoffs", "Dallas Mavericks", "Oklahoma City Thunder",
        "Dallas Mavericks", 2.05, 0.59,
        ["Dončić moyen 33.5 PPG dans la série", "OKC fatigue après G7 du tour précédent"],
        "loss",
    ),
    (
        "2026-05-19", "football", "Serie A", "Napoli", "AC Milan",
        "Napoli", 2.20, 0.56,
        ["Maradona : 11V sur 12 cette saison", "Milan en crise, 4 défaites sur 6"],
        "win",
    ),
    # Pick du jour — pending
    (
        "2026-05-20", "tennis", "WTA Italian Open", "Aryna Sabalenka", "Jessica Pegula",
        "Aryna Sabalenka", 2.15, 0.61,
        ["Sabalenka 5-1 H2H, retour en forme", "Pegula sur 2D consécutives sur terre", "Surface favorable à Sabalenka (+puissance)"],
        "pending",
    ),
]


def compute_profit(stake: float, odds: float, outcome: str) -> float:
    if outcome == "win":
        return round(stake * (odds - 1), 2)
    if outcome == "loss":
        return -round(stake, 2)
    return 0.0


def build_history() -> dict:
    picks = []
    bankroll = DEFAULT_STARTING_BANKROLL

    for row in PICKS:
        (
            d,
            sport,
            league,
            home,
            away,
            pick_name,
            odds,
            model_prob,
            rationale,
            outcome,
        ) = row
        profit = compute_profit(DEFAULT_STAKE, odds, outcome)
        bankroll = round(bankroll + profit, 2)
        book_prob = round(1 / odds, 4)
        ev = round(model_prob * odds - 1, 4)

        picks.append(
            {
                "date": d,
                "match": {
                    "sport": sport,
                    "league": league,
                    "home_team": home,
                    "away_team": away,
                    "kickoff": f"{d}T19:00:00+00:00",
                },
                "pick": pick_name,
                "odds": odds,
                "model_probability": model_prob,
                "book_probability": book_prob,
                "expected_value": ev,
                "engine": "curated_demo@1.0",
                "rationale": rationale,
                "stake": DEFAULT_STAKE,
                "outcome": outcome,
                "profit": profit,
                "bankroll_after": bankroll,
            }
        )

    history = {
        "picks": picks,
        "stats": {
            "starting_bankroll": DEFAULT_STARTING_BANKROLL,
            "current_bankroll": bankroll,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return recompute_stats(history)


def build_day_payload() -> dict:
    """Génère le predictions/2026-05-20.json correspondant au pick pending."""
    today_pick = PICKS[-1]  # pending
    d, sport, league, home, away, pick_name, odds, model_prob, rationale, _ = today_pick

    safe_pick = {
        "match_id": 1,
        "sport": sport,
        "league": league,
        "home_team": home,
        "away_team": away,
        "kickoff": f"{d}T19:00:00+00:00",
        "pick": pick_name,
        "odds": odds,
        "model_probability": model_prob,
        "book_probability": round(1 / odds, 4),
        "expected_value": round(model_prob * odds - 1, 4),
        "confidence": model_prob,
        "engine": "curated_demo@1.0",
        "rationale": rationale,
    }

    return {
        "date": d,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "safe_pick": safe_pick,
        "value_picks": [safe_pick],
        "matches": [],
    }


def main() -> None:
    history = build_history()
    save_history(history)

    pred_dir = DATA_DIR / "predictions"
    pred_dir.mkdir(parents=True, exist_ok=True)
    day_path = pred_dir / "2026-05-20.json"
    day_path.write_text(json.dumps(build_day_payload(), indent=2, ensure_ascii=False))

    stats = history["stats"]
    print(
        f"Seed OK — {stats['total_picks']} picks, "
        f"{stats['won']}V/{stats['lost']}D, win rate {stats['win_rate']}%, "
        f"profit {stats['profit']:+.2f}€, ROI {stats['roi_percent']:+.2f}%, "
        f"bankroll {stats['current_bankroll']:.2f}€"
    )


if __name__ == "__main__":
    main()
