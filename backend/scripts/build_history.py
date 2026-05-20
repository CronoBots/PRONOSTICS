#!/usr/bin/env python
"""Regénère backend/data/history.json + predictions/<today>.json à partir
de la liste curatée dans picks_data.py.

Usage :
    python scripts/build_history.py

À lancer après chaque mise à jour de picks_data.py.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

from app.config import DATA_DIR  # noqa: E402
from app.services.history import recompute_stats, save_history  # noqa: E402

import picks_data  # noqa: E402


def compute_profit(stake: float, odds: float, outcome: str) -> float:
    if outcome == "win":
        return round(stake * (odds - 1), 2)
    if outcome == "loss":
        return -round(stake, 2)
    return 0.0


def build_history() -> dict:
    picks_out = []
    bankroll = picks_data.STARTING_BANKROLL

    for p in picks_data.PICKS:
        odds = p["odds"]
        outcome = p["outcome"]
        stake = p.get("stake", picks_data.STAKE)
        profit = compute_profit(stake, odds, outcome)
        bankroll = round(bankroll + profit, 2)
        book_prob = round(1 / odds, 4) if odds > 0 else 0.0
        model_prob = p["model_probability"]
        ev = round(model_prob * odds - 1, 4)

        picks_out.append({
            "date": p["date"],
            "match": {
                "sport": p["sport"],
                "league": p["league"],
                "home_team": p["home_team"],
                "away_team": p["away_team"],
                "kickoff": p["kickoff"],
            },
            "pick": p["pick"],
            "odds": odds,
            "model_probability": model_prob,
            "book_probability": book_prob,
            "expected_value": ev,
            "engine": "claude_curated@1.0",
            "headline": p.get("headline"),
            "rationale": p["rationale"],
            "sources": p.get("sources", []),
            "stake": stake,
            "outcome": outcome,
            "profit": profit,
            "bankroll_after": bankroll,
            "result": p.get("result"),
            "comparison": p.get("comparison"),
            "profile_tags": p.get("profile_tags", []),
        })

    history = {
        "picks": picks_out,
        "stats": {
            "starting_bankroll": picks_data.STARTING_BANKROLL,
            "current_bankroll": bankroll,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return recompute_stats(history)


def build_today_payload(history: dict) -> tuple[str, dict] | None:
    """Trouve le pick pending le plus récent → produit le predictions/<date>.json."""
    pending = [p for p in history["picks"] if p["outcome"] == "pending"]
    if not pending:
        return None
    pick = max(pending, key=lambda p: p["date"])

    safe_pick = {
        "match_id": 1,
        "sport": pick["match"]["sport"],
        "league": pick["match"]["league"],
        "home_team": pick["match"]["home_team"],
        "away_team": pick["match"]["away_team"],
        "kickoff": pick["match"]["kickoff"],
        "pick": pick["pick"],
        "odds": pick["odds"],
        "model_probability": pick["model_probability"],
        "book_probability": pick["book_probability"],
        "expected_value": pick["expected_value"],
        "confidence": pick["model_probability"],
        "engine": pick["engine"],
        "headline": pick.get("headline"),
        "rationale": pick["rationale"],
        "sources": pick.get("sources", []),
        "stake": pick["stake"],
        "potential_profit": round(pick["stake"] * (pick["odds"] - 1), 2),
        "potential_return": round(pick["stake"] * pick["odds"], 2),
        "kind": "value_bet" if pick["expected_value"] > 0.05 else "safe_favorite",
        "comparison": pick.get("comparison"),
        "profile_tags": pick.get("profile_tags", []),
    }

    payload = {
        "date": pick["date"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "safe_pick": safe_pick,
        "value_picks": [safe_pick],
        "matches": [],
    }
    return pick["date"], payload


def main() -> None:
    history = build_history()
    save_history(history)
    s = history["stats"]
    print(
        f"History → {s['total_picks']} picks ({s['won']}V/{s['lost']}D/{s['pending']}P), "
        f"win rate {s['win_rate']}%, profit {s['profit']:+.2f}€, "
        f"ROI {s['roi_percent']:+.2f}%, bankroll {s['current_bankroll']:.2f}€"
    )

    today = build_today_payload(history)
    pred_dir = DATA_DIR / "predictions"
    pred_dir.mkdir(parents=True, exist_ok=True)
    # Purge des anciens predictions/*.json (un seul actif = le pick pending courant)
    for old in pred_dir.glob("*.json"):
        old.unlink()
    if today:
        date, payload = today
        out_path = pred_dir / f"{date}.json"
        out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
        sp = payload["safe_pick"]
        print(
            f"Today → {sp['home_team']} vs {sp['away_team']} | {sp['pick']} @ {sp['odds']} "
            f"({sp['kind']}, EV {sp['expected_value']*100:+.1f}%)"
        )
    else:
        print("Today → aucun pick pending dans picks_data.PICKS")


if __name__ == "__main__":
    main()
