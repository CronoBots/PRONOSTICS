from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (UniqueConstraint("external_id", "source", name="uq_match_external"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str] = mapped_column(String(64), index=True)
    source: Mapped[str] = mapped_column(String(32), index=True)
    sport: Mapped[str] = mapped_column(String(32), index=True)
    league: Mapped[str] = mapped_column(String(128))
    home_team: Mapped[str] = mapped_column(String(128))
    away_team: Mapped[str] = mapped_column(String(128))
    kickoff: Mapped[datetime] = mapped_column(DateTime, index=True)
    stage: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    predictions: Mapped[list["Prediction"]] = relationship(
        back_populates="match", cascade="all, delete-orphan"
    )


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id", ondelete="CASCADE"), index=True)
    engine: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    pick: Mapped[str] = mapped_column(String(64))
    confidence: Mapped[float] = mapped_column(Float)
    probabilities: Mapped[dict] = mapped_column(JSON)
    rationale: Mapped[list] = mapped_column(JSON, default=list)
    expected_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    odds_snapshot: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    match: Mapped["Match"] = relationship(back_populates="predictions")


class Result(Base):
    """Résultat final d'un match, utilisé pour évaluer la performance des prédictions."""

    __tablename__ = "results"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(
        ForeignKey("matches.id", ondelete="CASCADE"), unique=True, index=True
    )
    outcome: Mapped[str] = mapped_column(String(64))
    score_home: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    score_away: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    settled_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
