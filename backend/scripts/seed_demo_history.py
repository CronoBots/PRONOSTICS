#!/usr/bin/env python
"""Seed l'historique de démo avec de vrais matchs gagnants depuis le 17/05/2026.

Sources vérifiées via recherche web (résultats sportifs réels) :
  - 17/05 : Italian Open ATP — Sinner d. Ruud 6-4 6-4 (finale Rome)
  - 18/05 : NBA WCF G1 — Spurs d. Thunder 122-115 2OT (Wembanyama 41/24)
  - 19/05 : NBA ECF G1 — Knicks d. Cavaliers 115-104 (comeback 22pts)
  - 20/05 (pending) : NBA WCF G2 — Thunder vs Spurs à OKC

Tous les picks réglés sont des VICTOIRES (per spec utilisateur).

Génère :
  - backend/data/history.json
  - backend/data/predictions/2026-05-20.json
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


# (date, sport, league, home, away, pick, odds, model_prob, rationale, outcome)
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
    # 20/05 — Pending (pick du jour)
    (
        "2026-05-20",
        "basketball",
        "NBA — Western Conference Finals (G2)",
        "Oklahoma City Thunder",
        "San Antonio Spurs",
        "Oklahoma City Thunder",
        2.05,
        0.58,
        [
            "Thunder à domicile, MVP SGA toujours présent",
            "Réaction attendue après G1 perdu en 2OT à la maison",
            "Spurs ont laissé énormément d'énergie en G1 (48 min de double OT)",
        ],
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


def build_day_payload() -> dict:
    today = PICKS[-1]  # pending
    d, sport, league, home, away, pick_name, odds, model_prob, rationale, _ = today

    safe_pick = {
        "match_id": 1,
        "sport": sport,
        "league": league,
        "home_team": home,
        "away_team": away,
        "kickoff": f"{d}T19:30:00+00:00",
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

    s = history["stats"]
    print(
        f"Seed OK — {s['total_picks']} picks ({s['won']}V/{s['lost']}D/{s['pending']}P), "
        f"win rate {s['win_rate']}%, profit {s['profit']:+.2f}€, "
        f"ROI {s['roi_percent']:+.2f}%, bankroll {s['current_bankroll']:.2f}€"
    )


if __name__ == "__main__":
    main()
