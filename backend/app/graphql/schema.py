from __future__ import annotations

from datetime import date, datetime
from typing import Optional

import strawberry

from app.db import session_scope
from app.services import predictions as pred_service


@strawberry.type
class ProbabilityEntry:
    outcome: str
    probability: float


@strawberry.type
class PredictionType:
    engine: str
    pick: str
    confidence: float
    expected_value: Optional[float]
    rationale: list[str]
    probabilities: list[ProbabilityEntry]
    odds_snapshot: Optional[list[ProbabilityEntry]]
    created_at: datetime


@strawberry.type
class MatchType:
    id: int
    sport: str
    league: str
    home_team: str
    away_team: str
    kickoff: datetime
    stage: Optional[str]
    venue: Optional[str]
    source: str
    prediction: Optional[PredictionType]


def _to_prediction(p) -> PredictionType:
    return PredictionType(
        engine=p.engine,
        pick=p.pick,
        confidence=p.confidence,
        expected_value=p.expected_value,
        rationale=list(p.rationale or []),
        probabilities=[
            ProbabilityEntry(outcome=k, probability=v) for k, v in (p.probabilities or {}).items()
        ],
        odds_snapshot=(
            [ProbabilityEntry(outcome=k, probability=v) for k, v in p.odds_snapshot.items()]
            if p.odds_snapshot
            else None
        ),
        created_at=p.created_at,
    )


def _to_match(m) -> MatchType:
    last_pred = m.predictions[-1] if m.predictions else None
    venue = (m.metadata_json or {}).get("venue")
    return MatchType(
        id=m.id,
        sport=m.sport,
        league=m.league,
        home_team=m.home_team,
        away_team=m.away_team,
        kickoff=m.kickoff,
        stage=m.stage,
        venue=venue,
        source=m.source,
        prediction=_to_prediction(last_pred) if last_pred else None,
    )


@strawberry.type
class Query:
    @strawberry.field
    def matches(
        self,
        on_date: Optional[date] = None,
        sport: Optional[str] = None,
        min_confidence: float = 0.0,
        limit: int = 200,
    ) -> list[MatchType]:
        with session_scope() as session:
            matches = pred_service.list_matches(
                session,
                on_date=on_date,
                sport=sport,
                min_confidence=min_confidence,
                limit=limit,
            )
            return [_to_match(m) for m in matches]

    @strawberry.field
    def top_picks(self, on_date: date, limit: int = 10) -> list[MatchType]:
        with session_scope() as session:
            preds = pred_service.top_picks(session, on_date=on_date, limit=limit)
            return [_to_match(p.match) for p in preds]

    @strawberry.field
    def supported_sports(self) -> list[str]:
        from app.engines import ENGINES

        return list(ENGINES.keys())


schema = strawberry.Schema(query=Query)
