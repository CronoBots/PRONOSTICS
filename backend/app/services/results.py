"""Résolution du résultat d'un pari pour mise à jour de l'historique.

Stratégie :
  1. Si une source réelle est disponible (football-data.org pour le foot),
     on tente de récupérer le score final.
  2. Sinon (mock / pas de clé), on simule l'issue avec un tirage pondéré
     par les probabilités du modèle — résultat déterministe via seed
     (date + équipes) pour que la même date donne toujours le même résultat.

L'objectif est de produire un historique crédible en démo, sans casser
quand de vraies APIs sont branchées plus tard.
"""

from __future__ import annotations

import hashlib
import random
from typing import Literal

Outcome = Literal["win", "loss", "pending", "void"]


def simulate_outcome(
    pick: str,
    probabilities: dict[str, float],
    seed_parts: list[str],
) -> Outcome:
    """Tire l'issue d'un match selon les probas modélisées (déterministe via seed)."""
    if not probabilities:
        return "pending"

    seed = hashlib.md5("|".join(seed_parts).encode()).hexdigest()
    rng = random.Random(int(seed[:16], 16))

    outcomes = list(probabilities.keys())
    weights = [max(probabilities[o], 0.0) for o in outcomes]
    if sum(weights) <= 0:
        return "pending"

    drawn = rng.choices(outcomes, weights=weights, k=1)[0]
    return "win" if drawn == pick else "loss"


def compute_profit(stake: float, odds: float, outcome: Outcome) -> float:
    """Profit net en unités (peut être négatif)."""
    if outcome == "win":
        return round(stake * (odds - 1), 2)
    if outcome == "loss":
        return -round(stake, 2)
    return 0.0
