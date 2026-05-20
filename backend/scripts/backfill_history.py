#!/usr/bin/env python
"""Génère un historique de picks sur les N derniers jours.

Sert à amorcer le site avec un historique crédible avant le premier vrai run.
Réutilise l'ingestion + sélection du value pick + simulateur de résultats
existants. Idempotent : peut être relancé sans dupliquer les picks.

Usage:
    python scripts/backfill_history.py            # 60 jours par défaut
    python scripts/backfill_history.py 90         # N jours
"""

from __future__ import annotations

import asyncio
import logging
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.db import init_db, session_scope  # noqa: E402
from app.services.history import update_history_for_day  # noqa: E402
from app.services.ingestion import ingest_day  # noqa: E402
from app.services.picks import select_safe_pick  # noqa: E402
from app.services.predictions import list_matches  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backfill")


async def backfill(days: int) -> None:
    init_db()
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days)

    for offset in range(days + 1):
        when: date = start + timedelta(days=offset)
        logger.info("Backfill %s", when.isoformat())
        await ingest_day(when)
        with session_scope() as session:
            matches = list_matches(session, on_date=when, limit=500)
            pick = select_safe_pick(matches)
        update_history_for_day(when, pick)

    logger.info("Backfill terminé (%d jours).", days + 1)


def main() -> None:
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 60
    asyncio.run(backfill(days))


if __name__ == "__main__":
    main()
