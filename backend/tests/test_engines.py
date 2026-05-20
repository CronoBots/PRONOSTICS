"""Tests basiques des moteurs de prédiction."""

from datetime import datetime, timezone

import pytest

from app.engines import (
    BasketballHeuristicEngine,
    FootballHeuristicEngine,
    MLBHeuristicEngine,
    NFLHeuristicEngine,
    NHLHeuristicEngine,
    TennisHeuristicEngine,
)
from app.schemas import HeadToHead, MatchInput, TeamForm


def _make_match(sport: str, home_strength: float = 0.7, away_strength: float = 0.3) -> MatchInput:
    return MatchInput(
        external_id="t1",
        source="mock",
        sport=sport,
        league="Test League",
        home_team="Home FC",
        away_team="Away FC",
        kickoff=datetime.now(timezone.utc),
        home_form=TeamForm(last_5="WWWWW" if home_strength > 0.5 else "LLLLL", rank=1, rating=1700),
        away_form=TeamForm(last_5="WWWWW" if away_strength > 0.5 else "LLLLL", rank=18, rating=1400),
        h2h=HeadToHead(home_wins=4, away_wins=1, draws=1, samples=6),
        odds={"Home FC": 1.5, "Draw": 4.0, "Away FC": 6.0},
    )


@pytest.mark.parametrize(
    "engine_cls,sport,expected_outcomes",
    [
        (FootballHeuristicEngine, "football", {"Home FC", "Draw", "Away FC"}),
        (BasketballHeuristicEngine, "basketball", {"Home FC", "Away FC"}),
        (TennisHeuristicEngine, "tennis", {"Home FC", "Away FC"}),
        (NFLHeuristicEngine, "nfl", {"Home FC", "Away FC"}),
        (MLBHeuristicEngine, "mlb", {"Home FC", "Away FC"}),
        (NHLHeuristicEngine, "nhl", {"Home FC", "Away FC"}),
    ],
)
def test_engine_outputs_normalized_probabilities(engine_cls, sport, expected_outcomes):
    engine = engine_cls()
    match = _make_match(sport)
    pred = engine.predict(match)

    assert set(pred.probabilities.keys()) == expected_outcomes
    total = sum(pred.probabilities.values())
    assert 0.98 <= total <= 1.02
    assert 0 <= pred.confidence <= 1
    assert pred.pick in expected_outcomes


def test_home_favorite_wins_when_clearly_stronger():
    engine = FootballHeuristicEngine()
    match = _make_match("football", home_strength=0.9, away_strength=0.1)
    pred = engine.predict(match)
    assert pred.pick == "Home FC"
    assert pred.probabilities["Home FC"] > pred.probabilities["Away FC"]


def test_expected_value_computed_when_odds_present():
    engine = FootballHeuristicEngine()
    match = _make_match("football")
    pred = engine.predict(match)
    assert pred.expected_value is not None
    # P(pick) * decimal_odds - 1
    assert pred.odds_snapshot is not None
