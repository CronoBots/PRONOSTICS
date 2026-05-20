from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from app.schemas import MatchInput, PredictionOutput


class BasePredictionEngine(ABC):
    """Interface commune des moteurs.

    Toute implémentation produit un PredictionOutput dont les probabilités
    somment à ~1. L'`expected_value` est calculée si des cotes sont fournies.
    """

    name: str = "base"
    version: str = "1.0"

    @abstractmethod
    def predict(self, match: MatchInput) -> PredictionOutput:
        ...

    # --- helpers communs ---------------------------------------------------

    @staticmethod
    def _normalize(probs: dict[str, float]) -> dict[str, float]:
        total = sum(probs.values())
        if total <= 0:
            n = len(probs)
            return {k: 1 / n for k in probs}
        return {k: round(v / total, 4) for k, v in probs.items()}

    @staticmethod
    def _form_strength(last_5: str) -> float:
        """Note de forme sur les 5 derniers matchs : W=1, D=0.5, L=0."""
        if not last_5:
            return 0.5
        score = sum({"W": 1.0, "D": 0.5, "L": 0.0}.get(ch, 0.5) for ch in last_5)
        return score / len(last_5)

    @staticmethod
    def _expected_value(prob: float, decimal_odds: Optional[float]) -> Optional[float]:
        if not decimal_odds:
            return None
        return round(prob * decimal_odds - 1, 3)

    def _build(
        self,
        probabilities: dict[str, float],
        rationale: list[str],
        odds: dict[str, float] | None,
    ) -> PredictionOutput:
        probabilities = self._normalize(probabilities)
        pick = max(probabilities, key=probabilities.get)
        confidence = probabilities[pick]
        ev = self._expected_value(confidence, (odds or {}).get(pick))
        return PredictionOutput(
            pick=pick,
            confidence=round(confidence, 4),
            probabilities=probabilities,
            rationale=rationale,
            expected_value=ev,
            odds_snapshot=odds,
            engine=f"{self.name}@{self.version}",
        )
