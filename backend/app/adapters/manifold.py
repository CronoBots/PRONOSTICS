"""Adapter Manifold Markets — prediction market gratuit, accessible partout.

Manifold est un prediction market en monnaie virtuelle (mana). Les marchés
binaires donnent une probabilité (0-1) qui agrège la sagesse des parieurs.
Utilisé comme **backup sharp** quand Polymarket est illiquide ou non
géolocalement accessible (en Belgique le frontend Polymarket est bloqué pour
le trading mais l'API publique reste accessible — Manifold sert de garde-fou).

API publique : pas de clé requise, REST JSON simple.

Doc : https://docs.manifold.markets/api
Endpoints :
  - GET /v0/markets        → liste marchés actifs
  - GET /v0/search-markets → search par terme
  - GET /v0/market/{id}    → détail d'un marché

Format markets : { id, question, probability, volume, closeTime, isResolved, ... }
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import get_settings

logger = logging.getLogger(__name__)


BASE_URL = "https://api.manifold.markets/v0"

# Mots-clés sports pour classification (alignée sur polymarket.py)
SPORTS_KEYWORDS: dict[str, list[str]] = {
    "basketball": ["nba", "basketball", "celtics", "lakers", "warriors", "nuggets"],
    "tennis": ["tennis", "atp", "wta", "djokovic", "alcaraz", "sinner", "swiatek"],
    "football": ["soccer", "epl", "premier league", "champions league", "uefa", "laliga", "bundesliga"],
    "nhl": ["nhl", "hockey", "stanley cup"],
    "mlb": ["mlb", "baseball", "world series"],
    "nfl": ["nfl", "american football", "super bowl"],
}


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
)
async def _fetch_json(url: str, params: dict | None = None) -> Any:
    timeout = get_settings().request_timeout_seconds
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        resp = await client.get(url, params=params or {})
        resp.raise_for_status()
        return resp.json()


def _classify_sport(text: str) -> str | None:
    haystack = text.lower()
    for sport, keywords in SPORTS_KEYWORDS.items():
        if any(k in haystack for k in keywords):
            return sport
    return None


async def search_markets(term: str, limit: int = 20) -> list[dict]:
    """Cherche les marchés Manifold par terme (ex: 'Alcaraz Sinner')."""
    try:
        data = await _fetch_json(f"{BASE_URL}/search-markets", {"term": term, "limit": limit})
    except Exception as exc:  # noqa: BLE001
        logger.warning("manifold search failed for '%s': %s", term, exc)
        return []
    return data if isinstance(data, list) else []


async def fetch_active_sports_markets(limit: int = 1000) -> list[dict]:
    """Pull les marchés Manifold actifs et filtre sur sports.

    Manifold a moins de markets sports que Polymarket — on récupère large
    puis on filtre côté client par mots-clés.
    """
    try:
        data = await _fetch_json(f"{BASE_URL}/markets", {"limit": limit})
    except Exception as exc:  # noqa: BLE001
        logger.warning("manifold: markets fetch failed: %s", exc)
        return []

    if not isinstance(data, list):
        logger.warning("manifold: unexpected shape: %r", type(data))
        return []

    now_ms = datetime.now(timezone.utc).timestamp() * 1000
    sports = []
    for m in data:
        if m.get("isResolved"):
            continue
        close_time = m.get("closeTime", 0)
        if close_time and close_time < now_ms:
            continue
        question = m.get("question", "")
        sport = _classify_sport(question)
        if not sport:
            continue
        prob = m.get("probability")
        if prob is None:
            continue
        sports.append({
            "sport": sport,
            "id": m.get("id", ""),
            "question": question,
            "manifold_prob": round(float(prob), 4),
            "volume": float(m.get("volume", 0) or 0),
            "close_time_ms": close_time,
            "url": m.get("url", ""),
        })
    logger.info("manifold: %d marchés sports retenus sur %d totaux", len(sports), len(data))
    return sports


def find_prob_for_match(picks: list[dict], name_a: str, name_b: str) -> float | None:
    """Cherche dans les picks Manifold un marché qui mentionne A et B.

    Retourne la proba pour A (le sujet de la question type 'Will A beat B?').
    """
    if not name_a or not name_b:
        return None
    norm_a = name_a.lower()
    norm_b = name_b.lower()
    for pick in picks:
        q = pick.get("question", "").lower()
        if norm_a in q and norm_b in q:
            if q.find(norm_a) < q.find(norm_b):
                return pick["manifold_prob"]
            return 1 - pick["manifold_prob"]
        if norm_a in q:
            return pick["manifold_prob"]
    return None
