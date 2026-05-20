"""Service d'ingestion : récupère les matches du jour pour chaque sport et persiste."""

from __future__ import annotations

import asyncio
import logging
from datetime import date

from sqlalchemy import select

from app.adapters import fetch_daily, resolve_adapter
from app.db import session_scope
from app.engines import ENGINES, get_engine
from app.models import Match, Prediction
from app.schemas import MatchInput, PredictionOutput

logger = logging.getLogger(__name__)

SUPPORTED_SPORTS = list(ENGINES.keys())


async def ingest_day(when: date, sports: list[str] | None = None) -> dict[str, int]:
    """Ingère les matches du jour pour les sports demandés.

    Returns un dict {sport: nb_matches_ingérés}.
    """
    sports = sports or SUPPORTED_SPORTS
    counts: dict[str, int] = {}

    fetch_tasks = {sport: asyncio.create_task(fetch_daily(sport, when)) for sport in sports}
    for sport, task in fetch_tasks.items():
        try:
            matches = await task
        except Exception as exc:  # noqa: BLE001
            logger.error("Ingestion %s a échoué : %s", sport, exc)
            counts[sport] = 0
            continue

        engine = get_engine(sport)
        if not engine:
            logger.warning("Pas de moteur pour le sport %s, skip prédictions", sport)
            counts[sport] = 0
            continue

        adapter_name = resolve_adapter(sport).name
        logger.info("[%s] %d matchs reçus depuis %s", sport, len(matches), adapter_name)
        _persist(matches, engine.predict)
        counts[sport] = len(matches)

    return counts


def _persist(matches: list[MatchInput], predict_fn) -> None:
    if not matches:
        return

    with session_scope() as session:
        for match_input in matches:
            db_match = _upsert_match(session, match_input)
            session.flush()
            prediction: PredictionOutput = predict_fn(match_input)
            session.add(
                Prediction(
                    match_id=db_match.id,
                    engine=prediction.engine,
                    pick=prediction.pick,
                    confidence=prediction.confidence,
                    probabilities=prediction.probabilities,
                    rationale=prediction.rationale,
                    expected_value=prediction.expected_value,
                    odds_snapshot=prediction.odds_snapshot,
                )
            )


def _upsert_match(session, match_input: MatchInput) -> Match:
    stmt = select(Match).where(
        Match.external_id == match_input.external_id, Match.source == match_input.source
    )
    db_match = session.execute(stmt).scalar_one_or_none()
    if db_match is None:
        db_match = Match(
            external_id=match_input.external_id,
            source=match_input.source,
            sport=match_input.sport,
            league=match_input.league,
            home_team=match_input.home_team,
            away_team=match_input.away_team,
            kickoff=match_input.kickoff,
            stage=match_input.stage,
            metadata_json={"venue": match_input.venue, "extra": match_input.extra},
        )
        session.add(db_match)
    else:
        db_match.league = match_input.league
        db_match.kickoff = match_input.kickoff
        db_match.stage = match_input.stage
        db_match.metadata_json = {"venue": match_input.venue, "extra": match_input.extra}
    return db_match
