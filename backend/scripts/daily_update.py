#!/usr/bin/env python
"""Pipeline quotidien : ingestion + prédictions + export JSON.

Usage:
    python scripts/daily_update.py             # aujourd'hui (UTC)
    python scripts/daily_update.py 2026-05-20  # date précise
"""

from __future__ import annotations

import asyncio
import json
import logging
import sys
from datetime import date, datetime, timezone
from pathlib import Path

# Permettre l'exécution depuis n'importe où
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.config import DATA_DIR  # noqa: E402
from app.db import init_db, session_scope  # noqa: E402
from app.services.ingestion import ingest_day  # noqa: E402
from app.services.predictions import list_matches  # noqa: E402

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("daily_update")


def parse_args() -> date:
    if len(sys.argv) > 1:
        return date.fromisoformat(sys.argv[1])
    return datetime.now(timezone.utc).date()


def export_json(when: date) -> Path:
    """Exporte les pronostics du jour dans backend/data/predictions/<date>.json.

    Pratique pour servir le contenu en statique depuis GitHub Pages ou pour
    versionner les pronostics dans le repo.
    """
    export_dir = DATA_DIR / "predictions"
    export_dir.mkdir(exist_ok=True)
    out_path = export_dir / f"{when.isoformat()}.json"

    with session_scope() as session:
        matches = list_matches(session, on_date=when, limit=500)
        payload = {
            "date": when.isoformat(),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "matches": [
                {
                    "id": m.id,
                    "sport": m.sport,
                    "league": m.league,
                    "home_team": m.home_team,
                    "away_team": m.away_team,
                    "kickoff": m.kickoff.isoformat(),
                    "stage": m.stage,
                    "source": m.source,
                    "prediction": (
                        {
                            "engine": m.predictions[-1].engine,
                            "pick": m.predictions[-1].pick,
                            "confidence": m.predictions[-1].confidence,
                            "expected_value": m.predictions[-1].expected_value,
                            "probabilities": m.predictions[-1].probabilities,
                            "rationale": m.predictions[-1].rationale,
                            "odds_snapshot": m.predictions[-1].odds_snapshot,
                        }
                        if m.predictions
                        else None
                    ),
                }
                for m in matches
            ],
        }

    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False, default=str))
    logger.info("Export JSON : %s (%d matchs)", out_path, len(payload["matches"]))
    return out_path


async def main() -> None:
    when = parse_args()
    logger.info("=== Daily update pour %s ===", when.isoformat())
    init_db()
    counts = await ingest_day(when)
    for sport, n in counts.items():
        logger.info("  %-12s : %d matchs", sport, n)
    export_json(when)
    logger.info("Done.")


if __name__ == "__main__":
    asyncio.run(main())
