"""Moteurs heuristiques pour les sports US (NFL, MLB, NHL).

Tous suivent la même structure : pas de nul, advantage à domicile modulé selon le sport.
"""

from __future__ import annotations

import math

from app.engines.base import BasePredictionEngine
from app.schemas import MatchInput, PredictionOutput


class _USHeuristicBase(BasePredictionEngine):
    HOME_ADVANTAGE = 0.05
    FORM_WEIGHT = 0.40
    RANK_WEIGHT = 0.25
    RATING_WEIGHT = 0.35

    def predict(self, match: MatchInput) -> PredictionOutput:
        if not self._has_input_data(match):
            return self._book_aligned(match)

        rationale: list[str] = []
        home_form = self._form_strength(match.home_form.last_5)
        away_form = self._form_strength(match.away_form.last_5)
        rationale.append(
            f"Forme L5 : {match.home_form.last_5 or '?'} vs {match.away_form.last_5 or '?'}"
        )

        def rank_score(rank: int | None) -> float:
            if not rank:
                return 0.5
            return max(0.0, 1 - (rank - 1) / 32)

        home_rank = rank_score(match.home_form.rank)
        away_rank = rank_score(match.away_form.rank)

        if match.home_form.rating and match.away_form.rating:
            diff = match.home_form.rating - match.away_form.rating
            home_rating = 1 / (1 + math.pow(10, -diff / 400))
            away_rating = 1 - home_rating
        else:
            home_rating = 0.5
            away_rating = 0.5

        rationale.append(f"Avantage domicile : +{self.HOME_ADVANTAGE:.2f}")

        home_score = (
            self.FORM_WEIGHT * home_form
            + self.RANK_WEIGHT * home_rank
            + self.RATING_WEIGHT * home_rating
            + self.HOME_ADVANTAGE
        )
        away_score = (
            self.FORM_WEIGHT * away_form
            + self.RANK_WEIGHT * away_rank
            + self.RATING_WEIGHT * away_rating
        )

        probs = {match.home_team: max(home_score, 0.01), match.away_team: max(away_score, 0.01)}
        return self._build(probs, rationale, match.odds)


class NFLHeuristicEngine(_USHeuristicBase):
    name = "nfl_heuristic"
    version = "1.0"
    HOME_ADVANTAGE = 0.07  # ~3 pts en NFL


class MLBHeuristicEngine(_USHeuristicBase):
    name = "mlb_heuristic"
    version = "1.0"
    HOME_ADVANTAGE = 0.04  # bénéfice à domicile faible au baseball


class NHLHeuristicEngine(_USHeuristicBase):
    name = "nhl_heuristic"
    version = "1.0"
    HOME_ADVANTAGE = 0.05
