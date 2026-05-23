"""Adapter OpenWeatherMap — météo pour sports outdoor (MLB / NFL / MLS / Tennis outdoor).

Le vent, la pluie et la température affectent directement :
  - MLB : runs scored (vent vers extérieur du champ → home runs), pluie → rep
  - NFL : passing yards (vent > 15 mph = passing efficiency ↓), pluie
  - MLS / Soccer outdoor : nb buts (pluie/grass mouillé) — léger
  - Tennis outdoor (Roland-Garros, US Open jour) : pluie → délai

API : `https://api.openweathermap.org/data/2.5/`
Free tier : 1000 req/jour, 60 req/min.

Doc : https://openweathermap.org/api

Endpoints :
  - GET /weather?q={city}&appid={key}&units=metric  → météo actuelle
  - GET /forecast?q={city}&appid={key}              → 5 jours / 3h
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


BASE_URL = "https://api.openweathermap.org/data/2.5"


def is_configured(settings: Settings) -> bool:
    return bool(getattr(settings, "openweather_key", ""))


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
)
async def _fetch_json(endpoint: str, params: dict | None = None) -> dict:
    settings = get_settings()
    api_key = getattr(settings, "openweather_key", "")
    if not api_key:
        raise RuntimeError("openweather: clé absente (OPENWEATHER_KEY)")
    full_params = dict(params or {})
    full_params["appid"] = api_key
    full_params.setdefault("units", "metric")
    url = f"{BASE_URL}{endpoint}"
    timeout = settings.request_timeout_seconds
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        resp = await client.get(url, params=full_params)
        resp.raise_for_status()
        return resp.json()


async def current_weather(city: str, country_code: str | None = None) -> dict | None:
    """Météo actuelle (utile pour matchs en cours)."""
    query = f"{city},{country_code}" if country_code else city
    try:
        data = await _fetch_json("/weather", {"q": query})
    except Exception as exc:  # noqa: BLE001
        logger.warning("openweather current KO for %s: %s", query, exc)
        return None
    return _normalize_current(data)


async def forecast_at(city: str, kickoff_iso: str, country_code: str | None = None) -> dict | None:
    """Prévision pour le créneau le plus proche du kickoff.

    /forecast renvoie 5 jours par tranches de 3h. On prend le créneau le plus
    proche du kickoff_iso.
    """
    query = f"{city},{country_code}" if country_code else city
    try:
        data = await _fetch_json("/forecast", {"q": query})
    except Exception as exc:  # noqa: BLE001
        logger.warning("openweather forecast KO for %s: %s", query, exc)
        return None

    try:
        kickoff = datetime.fromisoformat(kickoff_iso.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None
    if kickoff.tzinfo is None:
        kickoff = kickoff.replace(tzinfo=timezone.utc)

    slots = data.get("list", []) if isinstance(data, dict) else []
    if not slots:
        return None

    best = min(
        slots,
        key=lambda s: abs(s.get("dt", 0) - kickoff.timestamp()),
    )
    if abs(best.get("dt", 0) - kickoff.timestamp()) > 3 * 3600 + 30 * 60:
        # Plus de 3h30 d'écart → on n'a pas de slot proche, ne pas pretendre prévoir
        return None
    return _normalize_slot(best, city)


def _normalize_current(payload: dict) -> dict:
    main = payload.get("main", {})
    wind = payload.get("wind", {})
    weather_list = payload.get("weather", []) or [{}]
    rain = payload.get("rain", {}).get("1h", 0) or 0
    snow = payload.get("snow", {}).get("1h", 0) or 0
    return {
        "city": payload.get("name", ""),
        "temp_c": main.get("temp"),
        "feels_like_c": main.get("feels_like"),
        "humidity_pct": main.get("humidity"),
        "wind_speed_ms": wind.get("speed"),
        "wind_deg": wind.get("deg"),
        "wind_speed_mph": round((wind.get("speed", 0) or 0) * 2.237, 1),
        "condition": (weather_list[0].get("main") or "").lower(),
        "rain_mm_1h": rain,
        "snow_mm_1h": snow,
        "is_outdoor_concern": _is_outdoor_concern(weather_list[0].get("main"), wind.get("speed"), rain),
    }


def _normalize_slot(slot: dict, city: str) -> dict:
    main = slot.get("main", {})
    wind = slot.get("wind", {})
    weather_list = slot.get("weather", []) or [{}]
    rain = (slot.get("rain") or {}).get("3h", 0) or 0
    snow = (slot.get("snow") or {}).get("3h", 0) or 0
    return {
        "city": city,
        "forecast_dt_iso": slot.get("dt_txt", ""),
        "temp_c": main.get("temp"),
        "humidity_pct": main.get("humidity"),
        "wind_speed_ms": wind.get("speed"),
        "wind_deg": wind.get("deg"),
        "wind_speed_mph": round((wind.get("speed", 0) or 0) * 2.237, 1),
        "condition": (weather_list[0].get("main") or "").lower(),
        "rain_mm_3h": rain,
        "snow_mm_3h": snow,
        "is_outdoor_concern": _is_outdoor_concern(weather_list[0].get("main"), wind.get("speed"), rain),
    }


def _is_outdoor_concern(condition: str | None, wind_speed_ms: float | None, rain_mm: float) -> bool:
    """True si conditions risquent d'affecter le match."""
    cond = (condition or "").lower()
    if cond in {"rain", "thunderstorm", "snow", "drizzle"}:
        return True
    if wind_speed_ms and wind_speed_ms > 7:  # ~25 km/h
        return True
    if rain_mm > 1:
        return True
    return False
