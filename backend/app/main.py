from __future__ import annotations

import logging
from datetime import date

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from app.config import get_settings
from app.db import init_db
from app.graphql.schema import schema
from app.services.ingestion import SUPPORTED_SPORTS, ingest_day

settings = get_settings()
logging.basicConfig(level=settings.log_level)

app = FastAPI(title="PRONOSTICS API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

graphql_router = GraphQLRouter(schema)
app.include_router(graphql_router, prefix="/graphql")


@app.on_event("startup")
async def _startup() -> None:
    init_db()


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "sports": SUPPORTED_SPORTS,
        "has_real_sources": settings.has_any_real_source,
    }


@app.post("/ingest/{on_date}")
async def trigger_ingest(on_date: date, sport: str | None = None) -> dict:
    """Endpoint manuel pour relancer l'ingestion d'un jour donné (utile en dev)."""
    sports = [sport] if sport else None
    counts = await ingest_day(on_date, sports)
    return {"date": on_date.isoformat(), "ingested": counts}
