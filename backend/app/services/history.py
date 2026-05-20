"""Historique des picks + stats agrégées, persistés en JSON pour le frontend.

Format de `backend/data/history.json` :
    {
      "picks": [
        { "date": "...", "match": {...}, "pick": "...", "odds": ..., "stake": ...,
          "outcome": "win|loss|pending", "profit": ..., "bankroll_after": ... },
        ...
      ],
      "stats": { "total_picks": ..., "won": ..., "lost": ..., "pending": ...,
        "profit": ..., "roi_percent": ..., "average_odds": ...,
        "win_rate": ..., "current_streak": ..., "starting_bankroll": ... },
      "generated_at": "..."
    }

Stake par défaut : 10 unités plates. L'utilisateur surcharge dans l'UI s'il veut.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Optional

from app.config import DATA_DIR
from app.services.picks import ValuePick
from app.services.results import Outcome, compute_profit, simulate_outcome

HISTORY_FILE = DATA_DIR / "history.json"
DEFAULT_STAKE = 10.0
DEFAULT_STARTING_BANKROLL = 1000.0


def _empty_history() -> dict:
    return {
        "picks": [],
        "stats": {
            "total_picks": 0,
            "won": 0,
            "lost": 0,
            "pending": 0,
            "profit": 0.0,
            "roi_percent": 0.0,
            "average_odds": 0.0,
            "win_rate": 0.0,
            "current_streak": 0,
            "best_streak": 0,
            "worst_streak": 0,
            "starting_bankroll": DEFAULT_STARTING_BANKROLL,
            "current_bankroll": DEFAULT_STARTING_BANKROLL,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def load_history() -> dict:
    if not HISTORY_FILE.exists():
        return _empty_history()
    try:
        return json.loads(HISTORY_FILE.read_text())
    except (OSError, json.JSONDecodeError):
        return _empty_history()


def save_history(history: dict) -> Path:
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    history["generated_at"] = datetime.now(timezone.utc).isoformat()
    HISTORY_FILE.write_text(json.dumps(history, indent=2, ensure_ascii=False, default=str))
    return HISTORY_FILE


def append_pick(history: dict, when: date, pick: ValuePick, stake: float = DEFAULT_STAKE) -> dict:
    """Ajoute un pick pour la date donnée s'il n'existe pas déjà (status pending)."""
    existing_dates = {p["date"] for p in history["picks"]}
    if when.isoformat() in existing_dates:
        return history

    history["picks"].append(
        {
            "date": when.isoformat(),
            "match": {
                "sport": pick.sport,
                "league": pick.league,
                "home_team": pick.home_team,
                "away_team": pick.away_team,
                "kickoff": pick.kickoff_iso,
            },
            "pick": pick.pick,
            "odds": pick.odds,
            "model_probability": pick.model_probability,
            "book_probability": pick.book_probability,
            "expected_value": pick.expected_value,
            "engine": pick.engine,
            "rationale": pick.rationale,
            "stake": stake,
            "outcome": "pending",
            "profit": 0.0,
            "bankroll_after": history["stats"].get("current_bankroll", DEFAULT_STARTING_BANKROLL),
        }
    )
    history["picks"].sort(key=lambda p: p["date"])
    return history


def settle_pending_picks(history: dict, until: date) -> dict:
    """Marque comme 'win'/'loss' tous les picks 'pending' dont la date est passée.

    Utilise simulate_outcome (déterministe) si on n'a pas de source réelle.
    """
    for p in history["picks"]:
        if p["outcome"] != "pending":
            continue
        pick_date = date.fromisoformat(p["date"])
        if pick_date >= until:
            continue  # match du jour ou futur, on ne tranche pas encore

        # Reconstitution des probas pour le simulateur :
        # le pick a une model_probability ; le reste est partagé entre les autres outcomes.
        # On retombe sur un tirage pondéré simple.
        probas = {
            p["pick"]: p["model_probability"],
            "_other": max(0.0, 1.0 - p["model_probability"]),
        }
        outcome: Outcome = simulate_outcome(
            pick=p["pick"],
            probabilities=probas,
            seed_parts=[p["date"], p["match"]["home_team"], p["match"]["away_team"]],
        )
        p["outcome"] = outcome
        p["profit"] = compute_profit(p["stake"], p["odds"], outcome)
    return history


def recompute_stats(history: dict) -> dict:
    picks = history["picks"]
    starting = history["stats"].get("starting_bankroll", DEFAULT_STARTING_BANKROLL)

    won = sum(1 for p in picks if p["outcome"] == "win")
    lost = sum(1 for p in picks if p["outcome"] == "loss")
    pending = sum(1 for p in picks if p["outcome"] == "pending")
    total = len(picks)
    settled = won + lost

    profit = round(sum(p["profit"] for p in picks if p["outcome"] in ("win", "loss")), 2)
    total_stake = sum(p["stake"] for p in picks if p["outcome"] in ("win", "loss"))
    roi = round((profit / total_stake) * 100, 2) if total_stake else 0.0

    settled_picks = [p for p in picks if p["outcome"] in ("win", "loss")]
    avg_odds = (
        round(sum(p["odds"] for p in settled_picks) / len(settled_picks), 2)
        if settled_picks
        else 0.0
    )
    win_rate = round((won / settled) * 100, 2) if settled else 0.0

    # Bankroll cumulée pas-à-pas
    bankroll = starting
    current_streak = 0
    best_streak = 0
    worst_streak = 0
    running_streak = 0

    for p in sorted(picks, key=lambda x: x["date"]):
        if p["outcome"] in ("win", "loss"):
            bankroll = round(bankroll + p["profit"], 2)
            if p["outcome"] == "win":
                running_streak = max(running_streak + 1, 1)
                best_streak = max(best_streak, running_streak)
            else:
                running_streak = min(running_streak - 1, -1)
                worst_streak = min(worst_streak, running_streak)
            current_streak = running_streak
        p["bankroll_after"] = bankroll

    progression = round(((bankroll - starting) / starting) * 100, 2) if starting else 0.0

    history["stats"] = {
        "total_picks": total,
        "won": won,
        "lost": lost,
        "pending": pending,
        "profit": profit,
        "roi_percent": roi,
        "average_odds": avg_odds,
        "win_rate": win_rate,
        "current_streak": current_streak,
        "best_streak": best_streak,
        "worst_streak": worst_streak,
        "starting_bankroll": starting,
        "current_bankroll": bankroll,
        "progression_percent": progression,
    }
    return history


def update_history_for_day(when: date, pick: Optional[ValuePick]) -> dict:
    """Pipeline complet appelé chaque jour :
      1. Charge l'historique
      2. Règle les picks passés encore en pending
      3. Ajoute le pick du jour (si dispo)
      4. Recompute stats + bankroll
      5. Persiste
    """
    history = load_history()
    history = settle_pending_picks(history, until=when)
    if pick is not None:
        history = append_pick(history, when=when, pick=pick)
    history = recompute_stats(history)
    save_history(history)
    return history
