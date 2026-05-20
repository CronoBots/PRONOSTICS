from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from datetime import date

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import Settings, get_settings
from app.schemas import MatchInput

logger = logging.getLogger(__name__)


class BaseAdapter(ABC):
    name: str = "base"
    base_url: str = ""

    def is_configured(self, settings: Settings) -> bool:  # noqa: ARG002
        """À surcharger : retourne True si l'adapter a tout ce qu'il lui faut pour tourner."""
        return False

    @abstractmethod
    async def fetch_daily(self, sport: str, when: date) -> list[MatchInput]:
        """Retourne la liste normalisée des matches du jour pour ce sport."""

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
    )
    async def _get(self, url: str, *, headers: dict | None = None, params: dict | None = None) -> dict:
        timeout = get_settings().request_timeout_seconds
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()
