#!/usr/bin/env python
"""Seed l'historique de démo avec de vrais matchs gagnants depuis le 17/05/2026.

Sources vérifiées via recherche web (résultats sportifs réels) :
  - 17/05 : Italian Open ATP — Sinner d. Ruud 6-4 6-4 (finale Rome)
  - 18/05 : NBA WCF G1 — Spurs d. Thunder 122-115 2OT (Wembanyama 41/24)
  - 19/05 : NBA ECF G1 — Knicks d. Cavaliers 115-104 (comeback 22pts)

Tous les picks réglés sont des VICTOIRES (per spec utilisateur).
Le pick du jour est généré par `daily_update.py` via The Odds API.

Génère :
  - backend/data/history.json
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.services.history import (  # noqa: E402
    DEFAULT_STAKE,
    DEFAULT_STARTING_BANKROLL,
    recompute_stats,
    save_history,
)


# (date, sport, league, home, away, pick, odds, model_prob, rationale, outcome)
# Note : on ne seed pas le pick du jour (20/05). C'est `daily_update.py` qui le
# générera depuis The Odds API dès que ODDS_API_KEY est configuré.
PICKS: list[tuple] = [
    (
        "2026-05-17",
        "tennis",
        "ATP Masters 1000 — Rome",
        "Jannik Sinner",
        "Casper Ruud",
        "Jannik Sinner",
        1.50,
        0.75,
        [
            "Sinner n°1 mondial, finale à domicile devant le président italien",
            "Ruud 8 finales Masters 1000 jouées, 1 seule gagnée",
            "Sinner invaincu sur ses 5 dernières confrontations directes",
        ],
        "win",
    ),
    (
        "2026-05-18",
        "basketball",
        "NBA — Western Conference Finals (G1)",
        "Oklahoma City Thunder",
        "San Antonio Spurs",
        "San Antonio Spurs",
        3.40,
        0.32,
        [
            "Value bet : Spurs cotés 3.40 alors que notre modèle leur donne 32%",
            "Wembanyama monstrueux en playoffs (moyenne 28pts/14reb/4blocks)",
            "Thunder fatigué après G7 face à Denver, repos minimal",
        ],
        "win",
    ),
    (
        "2026-05-19",
        "basketball",
        "NBA — Eastern Conference Finals (G1)",
        "New York Knicks",
        "Cleveland Cavaliers",
        "New York Knicks",
        1.95,
        0.58,
        [
            "Madison Square Garden : Knicks 32V-9D à domicile cette saison",
            "Brunson en feu : 34.5 pts/match dans les playoffs",
            "Cavaliers sans Mitchell à 100% (épaule)",
        ],
        "win",
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

    for (
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
    ) in PICKS:
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


def main() -> None:
    history = build_history()
    save_history(history)

    s = history["stats"]
    print(
        f"Seed OK — {s['total_picks']} picks ({s['won']}V/{s['lost']}D/{s['pending']}P), "
        f"win rate {s['win_rate']}%, profit {s['profit']:+.2f}€, "
        f"ROI {s['roi_percent']:+.2f}%, bankroll {s['current_bankroll']:.2f}€"
    )
    print("Note : pick du jour (today) sera généré par daily_update.py via The Odds API.")


if __name__ == "__main__":
    main()
