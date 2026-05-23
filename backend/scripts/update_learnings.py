"""Calibration helper pour NΞXBΞT learnings.

Calcule le Brier score moyen sur les picks résolus (win/loss) et suggère
un ajustement de seuil F2 si l'agent est systématiquement biaisé.

Lit `backend/scripts/picks_data.py` PICKS, garde les picks avec outcome
in {"win", "loss"}, calcule :
  - Brier = mean((outcome_binaire - model_probability)²)
  - Bias  = mean(outcome_binaire - model_probability)
    Positif = l'agent sous-estime ; négatif = surestime

Usage:
    python backend/scripts/update_learnings.py            # affiche stats
    python backend/scripts/update_learnings.py --suggest  # propose patch F2
"""

from __future__ import annotations

import sys
from pathlib import Path


PICKS_FILE = Path(__file__).parent / "picks_data.py"


def _load_picks() -> list[dict]:
    namespace: dict = {}
    exec(PICKS_FILE.read_text(), namespace)
    return namespace["PICKS"]


def _resolved(picks: list[dict]) -> list[dict]:
    return [p for p in picks if p.get("outcome") in {"win", "loss"}]


def compute_calibration(picks: list[dict]) -> dict:
    resolved = _resolved(picks)
    if not resolved:
        return {"n": 0}

    n = len(resolved)
    wins = sum(1 for p in resolved if p["outcome"] == "win")
    win_rate = wins / n

    brier = sum(
        ((1.0 if p["outcome"] == "win" else 0.0) - p.get("model_probability", 0.5)) ** 2
        for p in resolved
    ) / n

    bias = sum(
        (1.0 if p["outcome"] == "win" else 0.0) - p.get("model_probability", 0.5)
        for p in resolved
    ) / n

    avg_proba = sum(p.get("model_probability", 0.5) for p in resolved) / n
    avg_ev = sum(
        p.get("model_probability", 0.5) * p.get("odds", 1.0) - 1.0 for p in resolved
    ) / n

    return {
        "n": n,
        "wins": wins,
        "win_rate": win_rate,
        "avg_model_proba": avg_proba,
        "avg_ev_declared": avg_ev,
        "brier_score": brier,
        "bias": bias,
    }


def _suggest(stats: dict) -> str:
    if stats["n"] < 5:
        return "Pas assez de picks résolus (n<5) pour suggérer un ajustement."
    if stats["bias"] < -0.05:
        return (
            "L'agent SURESTIME systématiquement (bias < -5pts). "
            "Suggestion: relever F2 de 0.02 OU augmenter le poids du "
            "shrinkage vers book_proba dans criteria.md."
        )
    if stats["bias"] > 0.05:
        return (
            "L'agent SOUS-ESTIME (bias > +5pts). "
            "Suggestion: relâcher F2 de 0.02 OU diminuer le poids du "
            "shrinkage. À voir si c'est conservateur intentionnel."
        )
    return "Calibration correcte (|bias| < 5pts). Pas d'ajustement urgent."


def main() -> int:
    picks = _load_picks()
    stats = compute_calibration(picks)

    print("=== NΞXBΞT Calibration Report ===")
    if stats["n"] == 0:
        print("Aucun pick résolu (win/loss) à analyser.")
        return 0

    print(f"Picks résolus       : {stats['n']}")
    print(f"Wins                : {stats['wins']} ({stats['win_rate']*100:.1f}%)")
    print(f"Avg model_proba     : {stats['avg_model_proba']:.3f}")
    print(f"Avg EV déclaré      : {stats['avg_ev_declared']*100:+.2f}%")
    print(f"Brier score (lower=better) : {stats['brier_score']:.4f}")
    print(f"Bias (real - proba) : {stats['bias']*100:+.2f}pts")

    if "--suggest" in sys.argv:
        print()
        print("=== Suggestion ===")
        print(_suggest(stats))

    return 0


if __name__ == "__main__":
    sys.exit(main())
