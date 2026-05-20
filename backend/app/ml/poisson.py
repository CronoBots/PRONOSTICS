"""Esquisse d'un modèle Poisson bivarié pour le football.

À entraîner sur historique des saisons précédentes : pour chaque équipe on
estime un facteur d'attaque et de défense. Les buts sont supposés suivre
une loi de Poisson dont le lambda dépend de ces facteurs et de l'avantage
domicile. Voir Maher (1982), Dixon & Coles (1997).

Implémentation à compléter quand la table `results` contient suffisamment
de matchs (>1 saison).
"""

from __future__ import annotations

import math

from app.engines.base import BasePredictionEngine
from app.schemas import MatchInput, PredictionOutput


class PoissonFootballEngine(BasePredictionEngine):
    name = "football_poisson"
    version = "0.1-skeleton"

    def __init__(self, max_goals: int = 6, home_advantage: float = 0.30) -> None:
        self.max_goals = max_goals
        self.home_advantage = home_advantage
        # TODO : charger les coefficients pré-calculés depuis backend/data/ml/
        self.attack: dict[str, float] = {}
        self.defense: dict[str, float] = {}
        self.league_avg_goals: float = 1.35

    def _expected_goals(self, attacker: str, defender: str, is_home: bool) -> float:
        atk = self.attack.get(attacker, 1.0)
        defn = self.defense.get(defender, 1.0)
        base = self.league_avg_goals * atk * defn
        if is_home:
            base *= (1 + self.home_advantage)
        return max(base, 0.05)

    def predict(self, match: MatchInput) -> PredictionOutput:
        lam_home = self._expected_goals(match.home_team, match.away_team, is_home=True)
        lam_away = self._expected_goals(match.away_team, match.home_team, is_home=False)

        p_home = p_draw = p_away = 0.0
        for h in range(self.max_goals + 1):
            for a in range(self.max_goals + 1):
                p = self._poisson_pmf(h, lam_home) * self._poisson_pmf(a, lam_away)
                if h > a:
                    p_home += p
                elif h == a:
                    p_draw += p
                else:
                    p_away += p

        probs = {match.home_team: p_home, "Draw": p_draw, match.away_team: p_away}
        rationale = [
            f"λ buts attendus : {match.home_team}={lam_home:.2f} / {match.away_team}={lam_away:.2f}",
            "Modèle Poisson bivarié (squelette, à entraîner sur historique)",
        ]
        return self._build(probs, rationale, match.odds)

    @staticmethod
    def _poisson_pmf(k: int, lam: float) -> float:
        return math.exp(-lam) * lam**k / math.factorial(k)
