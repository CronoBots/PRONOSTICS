#!/usr/bin/env python
"""Pipeline quotidien : ingestion + prédictions + sélection du value pick + history.

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

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.config import DATA_DIR  # noqa: E402
from app.db import init_db, session_scope  # noqa: E402
from app.services.history import update_history_for_day  # noqa: E402
from app.services.ingestion import ingest_day  # noqa: E402
from app.services.picks import select_safe_pick, select_value_picks  # noqa: E402
from app.services.predictions import list_matches  # noqa: E402

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("daily_update")


def parse_args() -> date:
    if len(sys.argv) > 1:
        return date.fromisoformat(sys.argv[1])
    return datetime.now(timezone.utc).date()


def export_day(when: date) -> None:
    """Exporte le détail des matchs + le pick du jour."""
    export_dir = DATA_DIR / "predictions"
    export_dir.mkdir(parents=True, exist_ok=True)
    out_path = export_dir / f"{when.isoformat()}.json"

    with session_scope() as session:
        matches = list_matches(session, on_date=when, limit=500)
        safe_pick = select_safe_pick(matches)
        all_value_picks = select_value_picks(matches, limit=10)

        payload = {
            "date": when.isoformat(),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "safe_pick": safe_pick.to_dict() if safe_pick else None,
            "value_picks": [vp.to_dict() for vp in all_value_picks],
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
    logger.info(
        "Export JSON : %s (%d matchs, %d value picks, safe pick=%s)",
        out_path,
        len(payload["matches"]),
        len(payload["value_picks"]),
        safe_pick.pick if safe_pick else "—",
    )

    # Mise à jour de l'historique global (règle les pendings, ajoute le pick du jour)
    update_history_for_day(when, safe_pick)


async def main() -> None:
    when = parse_args()
    logger.info("=== Daily update pour %s ===", when.isoformat())
    init_db()
    counts = await ingest_day(when)
    for sport, n in counts.items():
        logger.info("  %-12s : %d matchs", sport, n)
    export_day(when)
    logger.info("Done.")


if __name__ == "__main__":
    asyncio.run(main())
