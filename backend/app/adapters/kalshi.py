"""Adapter Kalshi — prediction market US régulé CFTC.

Kalshi est l'équivalent US régulé de Polymarket. Markets binaires Yes/No
côtés en cents (0-100). Sources sharp pour : sports US (NBA/NHL/MLB/NFL/
tennis ATP/WTA grands tournois), élections, économie.

API publique : `https://api.elections.kalshi.com/trade-api/v2/`
Read-only n'a pas besoin d'auth pour les markets publics.

Doc : https://trading-api.readme.io/

Series tickers sports (à 2025) :
  - KXNBA : NBA series
  - KXNHL : NHL
  - KXMLB : MLB
  - KXNFL : NFL
  - KXATP : ATP tennis tournaments
  - KXWTA : WTA tennis tournaments
  - KXEPL : English Premier League

Format markets : { ticker, yes_bid, yes_ask, last_price, status, open_time,
                   close_time, sub_title, ... }
  - yes_bid / yes_ask en cents (0-100) → proba = (yes_bid + yes_ask) / 200
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


BASE_URL = "https://api.elections.kalshi.com/trade-api/v2"

# Series tickers sports → sport interne
SPORT_SERIES: dict[str, str] = {
    "KXNBA": "basketball",
    "KXNHL": "nhl",
    "KXMLB": "mlb",
    "KXNFL": "nfl",
    "KXATP": "tennis",
    "KXWTA": "tennis",
    "KXEPL": "football",
    "KXUCL": "football",
}


def is_configured(settings: Settings) -> bool:
    """Kalshi public read-only ne nécessite pas de clé. Toujours True."""
    return True  # noqa: ARG001 (signature pour cohérence)


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
)
async def _fetch_json(endpoint: str, params: dict | None = None) -> dict:
    url = f"{BASE_URL}{endpoint}"
    timeout = get_settings().request_timeout_seconds
    headers = {"Accept": "application/json"}
    api_key = getattr(get_settings(), "kalshi_key", "")
    if api_key:
        # Si une clé est fournie on l'utilise (limites + élevées) mais pas requis pour lecture publique
        headers["Authorization"] = f"Bearer {api_key}"
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        resp = await client.get(url, params=params or {}, headers=headers)
        resp.raise_for_status()
        return resp.json()


async def fetch_markets_for_series(series_ticker: str, status: str = "open", limit: int = 200) -> list[dict]:
    """Pull les markets actifs d'une series (ex: KXNBA) Kalshi."""
    try:
        data = await _fetch_json(
            "/markets",
            params={"series_ticker": series_ticker, "status": status, "limit": limit},
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("kalshi: markets fetch failed for %s: %s", series_ticker, exc)
        return []
    markets = data.get("markets") if isinstance(data, dict) else None
    if not isinstance(markets, list):
        return []
    return markets


async def fetch_all_sports_markets() -> list[dict]:
    """Pull les markets Kalshi pour toutes les series sports configurées.

    Retourne une liste normalisée :
    [{ sport, ticker, title, kalshi_prob, volume, close_time_iso, series }]
    """
    all_normalized: list[dict] = []
    for series, sport in SPORT_SERIES.items():
        markets = await fetch_markets_for_series(series)
        for m in markets:
            yes_bid = m.get("yes_bid")
            yes_ask = m.get("yes_ask")
            last = m.get("last_price")
            prob = _mid_price(yes_bid, yes_ask, last)
            if prob is None:
                continue
            all_normalized.append({
                "sport": sport,
                "series": series,
                "ticker": m.get("ticker", ""),
                "title": m.get("title", "") or m.get("yes_sub_title", ""),
                "sub_title": m.get("sub_title", ""),
                "kalshi_prob": round(prob, 4),
                "volume": float(m.get("volume", 0) or 0),
                "open_interest": float(m.get("open_interest", 0) or 0),
                "close_time_iso": m.get("close_time", ""),
            })
    logger.info("kalshi: %d markets sports normalisés", len(all_normalized))
    return all_normalized


def _mid_price(yes_bid: Any, yes_ask: Any, last_price: Any) -> float | None:
    """Convertit yes_bid/ask en proba (0-1). Cents Kalshi (0-100) → /100."""
    try:
        bid = float(yes_bid) if yes_bid is not None else None
        ask = float(yes_ask) if yes_ask is not None else None
        last = float(last_price) if last_price is not None else None
    except (TypeError, ValueError):
        return None

    if bid is not None and ask is not None and bid > 0 and ask > 0:
        return ((bid + ask) / 2) / 100.0
    if last is not None and last > 0:
        return last / 100.0
    return None


def find_prob_for_match(picks: list[dict], name_a: str, name_b: str) -> float | None:
    """Cherche dans les picks Kalshi un marché mentionnant A et B."""
    if not name_a or not name_b:
        return None
    norm_a = name_a.lower()
    norm_b = name_b.lower()
    for pick in picks:
        blob = " ".join([pick.get("title", ""), pick.get("sub_title", "")]).lower()
        if norm_a in blob and norm_b in blob:
            if blob.find(norm_a) < blob.find(norm_b):
                return pick["kalshi_prob"]
            return 1 - pick["kalshi_prob"]
        if norm_a in blob:
            return pick["kalshi_prob"]
    return None


def is_kickoff_within(iso_str: str, hours: int = 36) -> bool:
    """True si close_time du marché est dans les `hours` prochaines heures."""
    if not iso_str:
        return False
    try:
        if iso_str.endswith("Z"):
            iso_str = iso_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(iso_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        delta = (dt - datetime.now(timezone.utc)).total_seconds() / 3600
        return 0 <= delta <= hours
    except (ValueError, TypeError):
        return False
