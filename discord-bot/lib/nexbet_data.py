"""
Accès aux données NEXBET depuis le repo GitHub public.

Le bot fetch les fichiers JSON/MD directement depuis GitHub raw.
- Avantage : le bot peut tourner partout (Railway, VPS, local) sans
  partager de disque avec le backend.
- Cache léger en mémoire (TTL 5 min) pour éviter de spammer GitHub.

Si le repo devient privé un jour, ajouter GITHUB_TOKEN dans les headers.
"""

import asyncio
import json
import logging
import time
from typing import Any

import aiohttp

log = logging.getLogger("nexbet.data")

REPO = "CronoBots/PRONOSTICS"
BRANCH = "main"
RAW_BASE = f"https://raw.githubusercontent.com/{REPO}/{BRANCH}"

# Cache léger : { url: (timestamp, data) }
_CACHE: dict[str, tuple[float, Any]] = {}
CACHE_TTL = 300  # 5 minutes


async def _fetch(path: str, as_json: bool = True) -> Any:
    """Fetch un fichier depuis GitHub raw avec cache 5 min."""
    url = f"{RAW_BASE}/{path}"
    now = time.time()

    if url in _CACHE:
        ts, data = _CACHE[url]
        if now - ts < CACHE_TTL:
            return data

    async with aiohttp.ClientSession() as session:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            if resp.status != 200:
                log.warning("Fetch %s : HTTP %d", path, resp.status)
                return None
            data = await resp.json() if as_json else await resp.text()
            _CACHE[url] = (now, data)
            return data


async def get_history() -> dict | None:
    """history.json — picks résolus + stats."""
    return await _fetch("backend/data/history.json")


async def get_paper_log() -> str | None:
    """paper_trading_log.md — positions virtuelles du cycle paper."""
    return await _fetch(
        "backend/data/nexbet/paper_trading_log.md", as_json=False
    )


async def get_latest_decision() -> str | None:
    """Trace du jour (decisions/<today>.md)."""
    from datetime import datetime
    today = datetime.utcnow().strftime("%Y-%m-%d")
    return await _fetch(
        f"backend/data/nexbet/decisions/{today}.md", as_json=False
    )


def clear_cache():
    """Force refresh au prochain fetch."""
    _CACHE.clear()
