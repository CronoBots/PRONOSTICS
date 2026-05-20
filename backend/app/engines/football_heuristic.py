"""Moteur heuristique pour le football (1X2)."""

from __future__ import annotations

import math

from app.engines.base import BasePredictionEngine
from app.schemas import MatchInput, PredictionOutput


class FootballHeuristicEngine(BasePredictionEngine):
    name = "football_heuristic"
    version = "1.0"

    HOME_ADVANTAGE = 0.10
    FORM_WEIGHT = 0.35
    RANK_WEIGHT = 0.25
    H2H_WEIGHT = 0.15
    RATING_WEIGHT = 0.25

    def predict(self, match: MatchInput) -> PredictionOutput:
        # Pas de données équipes : on s'aligne sur les cotes (pas de value hallu)
        if not self._has_input_data(match):
            return self._book_aligned(match)

        rationale: list[str] = []

        # 1) Force "brute" tirée de la forme
        home_form = self._form_strength(match.home_form.last_5)
        away_form = self._form_strength(match.away_form.last_5)
        rationale.append(
            f"Forme L5 : {match.home_team} {match.home_form.last_5 or '?'} ({home_form:.2f}) "
            f"vs {match.away_team} {match.away_form.last_5 or '?'} ({away_form:.2f})"
        )

        # 2) Classement (rank bas = fort)
        def rank_score(rank: int | None) -> float:
            if not rank:
                return 0.5
            return max(0.0, 1 - (rank - 1) / 20)

        home_rank = rank_score(match.home_form.rank)
        away_rank = rank_score(match.away_form.rank)
        if match.home_form.rank or match.away_form.rank:
            rationale.append(
                f"Classement : {match.home_form.rank or '?'} vs {match.away_form.rank or '?'}"
            )

        # 3) H2H
        h2h_home = h2h_away = h2h_draw = 0.33
        if match.h2h.samples > 0:
            total = max(match.h2h.samples, 1)
            h2h_home = match.h2h.home_wins / total
            h2h_away = match.h2h.away_wins / total
            h2h_draw = match.h2h.draws / total
            rationale.append(
                f"H2H ({match.h2h.samples} matchs) : "
                f"{match.h2h.home_wins}V / {match.h2h.draws}N / {match.h2h.away_wins}D"
            )

        # 4) Rating si dispo (Elo proxy)
        if match.home_form.rating and match.away_form.rating:
            diff = match.home_form.rating - match.away_form.rating
            home_rating = 1 / (1 + math.pow(10, -diff / 400))
            away_rating = 1 - home_rating
            rationale.append(
                f"Rating : {match.home_form.rating:.0f} vs {match.away_form.rating:.0f} "
                f"→ P(home)={home_rating:.2f}"
            )
        else:
            home_rating = 0.5
            away_rating = 0.5

        # Combinaison
        home_score = (
            self.FORM_WEIGHT * home_form
            + self.RANK_WEIGHT * home_rank
            + self.H2H_WEIGHT * h2h_home
            + self.RATING_WEIGHT * home_rating
            + self.HOME_ADVANTAGE
        )
        away_score = (
            self.FORM_WEIGHT * away_form
            + self.RANK_WEIGHT * away_rank
            + self.H2H_WEIGHT * h2h_away
            + self.RATING_WEIGHT * away_rating
        )

        # Probabilité de nul basée sur l'écart de niveau (plus c'est serré, plus le nul est probable)
        gap = abs(home_score - away_score)
        draw_score = max(0.05, 0.30 - gap) + self.H2H_WEIGHT * h2h_draw

        probs = {
            match.home_team: max(home_score, 0.01),
            "Draw": max(draw_score, 0.05),
            match.away_team: max(away_score, 0.01),
        }

        rationale.append(f"Avantage domicile appliqué : +{self.HOME_ADVANTAGE:.2f}")

        return self._build(probs, rationale, match.odds)
