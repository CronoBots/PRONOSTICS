"""Sélection du 'value pick' du jour.

Logique value bet :
  - Le pronostic du moteur (`pick`) doit avoir une cote bookmaker >= MIN_ODDS
  - Notre probabilité estimée doit être > 1/odds (= proba implicite du bookmaker)
  - L'EV (= proba * cote - 1) doit être positive
  - On trie par EV décroissant et on retourne le meilleur
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.models import Match


MIN_ODDS = 2.0
MIN_MODEL_PROBABILITY = 0.40
MIN_EV = 0.05


@dataclass
class ValuePick:
    match_id: int
    sport: str
    league: str
    home_team: str
    away_team: str
    kickoff_iso: str
    pick: str
    odds: float
    model_probability: float
    book_probability: float
    expected_value: float
    confidence: float
    engine: str
    rationale: list[str]

    def to_dict(self) -> dict:
        return {
            "match_id": self.match_id,
            "sport": self.sport,
            "league": self.league,
            "home_team": self.home_team,
            "away_team": self.away_team,
            "kickoff": self.kickoff_iso,
            "pick": self.pick,
            "odds": self.odds,
            "model_probability": self.model_probability,
            "book_probability": self.book_probability,
            "expected_value": self.expected_value,
            "confidence": self.confidence,
            "engine": self.engine,
            "rationale": self.rationale,
        }


def _value_score(prediction, odds_snapshot: dict[str, float]) -> Optional[tuple[float, float, float, float]]:
    """Retourne (ev, odds, model_prob, book_prob) si c'est un value bet, sinon None."""
    pick = prediction.pick
    odds = odds_snapshot.get(pick)
    if not odds or odds < MIN_ODDS:
        return None

    model_prob = prediction.confidence
    if model_prob < MIN_MODEL_PROBABILITY:
        return None

    book_prob = 1 / odds
    if model_prob <= book_prob:
        return None

    ev = round(model_prob * odds - 1, 4)
    if ev < MIN_EV:
        return None

    return (ev, odds, model_prob, book_prob)


def select_value_picks(matches: list[Match], limit: int = 5) -> list[ValuePick]:
    """Renvoie les meilleurs value bets parmi les matchs du jour, triés par EV."""
    candidates: list[tuple[float, ValuePick]] = []

    for m in matches:
        if not m.predictions:
            continue
        pred = m.predictions[-1]
        if not pred.odds_snapshot:
            continue
        result = _value_score(pred, pred.odds_snapshot)
        if result is None:
            continue
        ev, odds, model_prob, book_prob = result
        candidates.append(
            (
                ev,
                ValuePick(
                    match_id=m.id,
                    sport=m.sport,
                    league=m.league,
                    home_team=m.home_team,
                    away_team=m.away_team,
                    kickoff_iso=m.kickoff.isoformat(),
                    pick=pred.pick,
                    odds=round(odds, 2),
                    model_probability=round(model_prob, 4),
                    book_probability=round(book_prob, 4),
                    expected_value=ev,
                    confidence=round(model_prob, 4),
                    engine=pred.engine,
                    rationale=pred.rationale or [],
                ),
            )
        )

    candidates.sort(key=lambda x: x[0], reverse=True)
    return [c[1] for c in candidates[:limit]]


def select_safe_pick(matches: list[Match]) -> Optional[ValuePick]:
    """Le seul pick safe du jour : meilleur value bet, ou None."""
    picks = select_value_picks(matches, limit=1)
    return picks[0] if picks else None
