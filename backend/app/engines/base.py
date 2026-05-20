from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from app.schemas import MatchInput, PredictionOutput


class BasePredictionEngine(ABC):
    """Interface commune des moteurs."""

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
        if not last_5:
            return 0.5
        score = sum({"W": 1.0, "D": 0.5, "L": 0.0}.get(ch, 0.5) for ch in last_5)
        return score / len(last_5)

    @staticmethod
    def _expected_value(prob: float, decimal_odds: Optional[float]) -> Optional[float]:
        if not decimal_odds:
            return None
        return round(prob * decimal_odds - 1, 3)

    @staticmethod
    def _has_input_data(match: MatchInput) -> bool:
        """True si on a au moins une info exploitable (forme/rank/h2h/rating)."""
        return bool(
            match.home_form.last_5
            or match.away_form.last_5
            or match.home_form.rank
            or match.away_form.rank
            or match.h2h.samples
            or (match.home_form.rating and match.away_form.rating)
        )

    def _book_aligned(self, match: MatchInput) -> PredictionOutput:
        """Quand on n'a pas de données équipes, on s'aligne sur les cotes du book
        (proba implicite normalisée pour retirer la marge).

        → model_prob ≈ book_prob → aucun value bet détecté → la sélection retombe
        sur le mode 'safe favorite' (cote la plus serrée du jour).
        """
        odds = match.odds or {}
        if not odds:
            # Pas de cotes non plus : on retourne une proba uniforme
            outcomes = [match.home_team, match.away_team]
            n = len(outcomes)
            probs = {o: 1 / n for o in outcomes}
            return PredictionOutput(
                pick=match.home_team,
                confidence=round(1 / n, 4),
                probabilities=probs,
                rationale=["Pas de données ni de cotes — proba uniforme"],
                expected_value=None,
                odds_snapshot=None,
                engine=f"{self.name}@{self.version}",
            )

        inv = {k: 1 / o for k, o in odds.items() if o > 0}
        total = sum(inv.values())
        probs = {k: round(v / total, 4) for k, v in inv.items()}
        pick = max(probs, key=probs.get)
        return PredictionOutput(
            pick=pick,
            confidence=probs[pick],
            probabilities=probs,
            rationale=[
                "Modèle aligné sur les cotes du bookmaker (pas de données équipes)",
            ],
            expected_value=self._expected_value(probs[pick], odds.get(pick)),
            odds_snapshot=odds,
            engine=f"{self.name}@{self.version}",
        )

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
