"""Registre des moteurs de prédiction par sport."""

from app.engines.base import BasePredictionEngine
from app.engines.basketball_heuristic import BasketballHeuristicEngine
from app.engines.football_heuristic import FootballHeuristicEngine
from app.engines.tennis_heuristic import TennisHeuristicEngine
from app.engines.us_sports_heuristic import (
    MLBHeuristicEngine,
    NFLHeuristicEngine,
    NHLHeuristicEngine,
)

ENGINES: dict[str, BasePredictionEngine] = {
    "football": FootballHeuristicEngine(),
    "basketball": BasketballHeuristicEngine(),
    "tennis": TennisHeuristicEngine(),
    "nfl": NFLHeuristicEngine(),
    "mlb": MLBHeuristicEngine(),
    "nhl": NHLHeuristicEngine(),
}


def get_engine(sport: str) -> BasePredictionEngine | None:
    return ENGINES.get(sport)


__all__ = ["BasePredictionEngine", "ENGINES", "get_engine"]
