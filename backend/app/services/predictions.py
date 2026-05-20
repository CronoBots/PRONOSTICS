"""Services de lecture des prédictions persistées (utilisés par GraphQL)."""

from __future__ import annotations

from datetime import date, datetime, time, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Match, Prediction


def list_matches(
    session: Session,
    *,
    on_date: Optional[date] = None,
    sport: Optional[str] = None,
    min_confidence: float = 0.0,
    limit: int = 200,
) -> list[Match]:
    stmt = select(Match).options(selectinload(Match.predictions)).order_by(Match.kickoff.asc())

    if on_date:
        day_start = datetime.combine(on_date, time.min, tzinfo=timezone.utc)
        day_end = datetime.combine(on_date, time.max, tzinfo=timezone.utc)
        stmt = stmt.where(Match.kickoff >= day_start, Match.kickoff <= day_end)
    if sport:
        stmt = stmt.where(Match.sport == sport)

    matches = list(session.execute(stmt).scalars())

    if min_confidence > 0:
        matches = [
            m for m in matches if m.predictions and m.predictions[-1].confidence >= min_confidence
        ]

    return matches[:limit]


def top_picks(session: Session, on_date: date, limit: int = 10) -> list[Prediction]:
    """Retourne les meilleurs pronostics du jour, classés par confiance × EV (si dispo)."""
    day_start = datetime.combine(on_date, time.min, tzinfo=timezone.utc)
    day_end = datetime.combine(on_date, time.max, tzinfo=timezone.utc)

    stmt = (
        select(Prediction)
        .join(Match)
        .where(Match.kickoff >= day_start, Match.kickoff <= day_end)
        .options(selectinload(Prediction.match))
    )
    predictions = list(session.execute(stmt).scalars())

    def score(p: Prediction) -> float:
        ev = p.expected_value or 0.0
        return p.confidence * (1 + max(ev, 0))

    predictions.sort(key=score, reverse=True)
    return predictions[:limit]
