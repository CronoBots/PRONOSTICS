"""Moteur heuristique tennis (pas de nul, surface ignorée en v1)."""

from __future__ import annotations

import math

from app.engines.base import BasePredictionEngine
from app.schemas import MatchInput, PredictionOutput


class TennisHeuristicEngine(BasePredictionEngine):
    name = "tennis_heuristic"
    version = "1.0"

    FORM_WEIGHT = 0.30
    RANK_WEIGHT = 0.20
    RATING_WEIGHT = 0.50

    def predict(self, match: MatchInput) -> PredictionOutput:
        if not self._has_input_data(match):
            return self._book_aligned(match)

        rationale: list[str] = []

        home_form = self._form_strength(match.home_form.last_5)
        away_form = self._form_strength(match.away_form.last_5)

        def rank_score(rank: int | None) -> float:
            if not rank:
                return 0.5
            # Rang ATP : top 1 = 1.0, top 100 ~ 0.3, top 200+ ~ 0
            return max(0.0, 1 - math.log10(max(rank, 1)) / 2.3)

        home_rank = rank_score(match.home_form.rank)
        away_rank = rank_score(match.away_form.rank)
        if match.home_form.rank and match.away_form.rank:
            rationale.append(
                f"Classement ATP/WTA : #{match.home_form.rank} vs #{match.away_form.rank}"
            )

        if match.home_form.rating and match.away_form.rating:
            diff = match.home_form.rating - match.away_form.rating
            home_rating = 1 / (1 + math.pow(10, -diff / 400))
            away_rating = 1 - home_rating
            rationale.append(f"Différentiel points : {diff:+.0f}")
        else:
            home_rating = 0.5
            away_rating = 0.5

        rationale.append(
            f"Forme récente : {match.home_form.last_5 or '?'} vs {match.away_form.last_5 or '?'}"
        )

        home_score = (
            self.FORM_WEIGHT * home_form
            + self.RANK_WEIGHT * home_rank
            + self.RATING_WEIGHT * home_rating
        )
        away_score = (
            self.FORM_WEIGHT * away_form
            + self.RANK_WEIGHT * away_rank
            + self.RATING_WEIGHT * away_rating
        )

        probs = {match.home_team: max(home_score, 0.01), match.away_team: max(away_score, 0.01)}
        return self._build(probs, rationale, match.odds)
