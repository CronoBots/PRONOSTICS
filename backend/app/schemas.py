"""Schémas Pydantic partagés entre adapters, engines et persistance."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TeamForm(BaseModel):
    """Forme récente compactée pour un compétiteur."""

    wins: int = 0
    draws: int = 0
    losses: int = 0
    goals_scored: int = 0
    goals_conceded: int = 0
    last_5: str = ""  # ex: "WWDLW"
    rank: Optional[int] = None
    rating: Optional[float] = None  # Elo, ATP points, etc.


class HeadToHead(BaseModel):
    home_wins: int = 0
    away_wins: int = 0
    draws: int = 0
    samples: int = 0


class MatchInput(BaseModel):
    """Représentation normalisée d'un match en provenance d'un adapter."""

    external_id: str
    source: str
    sport: str
    league: str
    home_team: str
    away_team: str
    kickoff: datetime
    stage: Optional[str] = None
    home_form: TeamForm = Field(default_factory=TeamForm)
    away_form: TeamForm = Field(default_factory=TeamForm)
    h2h: HeadToHead = Field(default_factory=HeadToHead)
    venue: Optional[str] = None
    importance: float = 0.5  # 0=amical, 1=finale
    odds: Optional[dict[str, float]] = None  # {outcome: decimal_odds}
    extra: Optional[dict] = None


class PredictionOutput(BaseModel):
    pick: str
    confidence: float
    probabilities: dict[str, float]
    rationale: list[str]
    expected_value: Optional[float] = None
    odds_snapshot: Optional[dict[str, float]] = None
    engine: str
