"""Adapter Polymarket — récupère les probabilités du marché prédictif crypto.

Polymarket est un marché P2P en USDC où les gens parient sur des outcomes
binaires ("Yes/No"). Le prix du contrat (entre 0$ et 1$) = probabilité du
marché. C'est notre référence "sharp" gratuite (équivalent moral de Pinnacle
qui n'est pas accessible en Belgique).

API publique Gamma : pas de clé requise, gratuite, pas de rate-limit notable.

Doc : https://docs.polymarket.com/
Endpoint principal : https://gamma-api.polymarket.com/events
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import get_settings

logger = logging.getLogger(__name__)


BASE_URL = "https://gamma-api.polymarket.com"

# Tags Polymarket des sports qui nous intéressent.
# Les tag_ids sont stables une fois créés (la doc en donne quelques-uns).
# Si nouveau sport ajouté côté Polymarket, on peut le découvrir via /tags.
SPORTS_KEYWORDS: dict[str, list[str]] = {
    "basketball": ["nba", "basketball"],
    "tennis": ["tennis", "atp", "wta"],
    "football": ["soccer", "football", "epl", "premier league", "champions league"],
    "nhl": ["nhl", "hockey"],
    "mlb": ["mlb", "baseball"],
    "nfl": ["nfl", "american football"],
}


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
)
async def _fetch_json(url: str, params: dict | None = None) -> Any:
    timeout = get_settings().request_timeout_seconds
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.get(url, params=params or {})
        resp.raise_for_status()
        return resp.json()


async def fetch_active_sports_events(limit: int = 500) -> list[dict]:
    """Pull tous les events Polymarket actifs (non clôturés) du domaine sports.

    Le filtrage par sport se fait côté client (Polymarket renvoie un mix).
    """
    url = f"{BASE_URL}/events"
    params = {
        "closed": "false",
        "active": "true",
        "limit": limit,
        "order": "endDate",
        "ascending": "true",
    }
    try:
        data = await _fetch_json(url, params)
    except Exception as exc:  # noqa: BLE001
        logger.warning("polymarket: events fetch failed: %s", exc)
        return []

    if not isinstance(data, list):
        logger.warning("polymarket: unexpected events shape: %r", type(data))
        return []

    # Filtre côté client : on garde les events sport
    sports_events = []
    for event in data:
        if _is_sports_event(event):
            sports_events.append(event)
    logger.info(
        "polymarket: %d events sports retenus sur %d events totaux",
        len(sports_events),
        len(data),
    )
    return sports_events


def _is_sports_event(event: dict) -> bool:
    """Heuristique : event de sport si tags/slug contient un mot-clé sport."""
    tags = event.get("tags") or []
    tag_labels = [t.get("label", "").lower() if isinstance(t, dict) else str(t).lower() for t in tags]
    slug = (event.get("slug") or "").lower()
    title = (event.get("title") or "").lower()

    haystack = " ".join(tag_labels + [slug, title])
    for keywords in SPORTS_KEYWORDS.values():
        if any(k in haystack for k in keywords):
            return True
    return False


def classify_sport(event: dict) -> str | None:
    """Retrouve le sport interne (basketball, tennis…) à partir d'un event Polymarket."""
    tags = event.get("tags") or []
    tag_labels = [t.get("label", "").lower() if isinstance(t, dict) else str(t).lower() for t in tags]
    slug = (event.get("slug") or "").lower()
    title = (event.get("title") or "").lower()

    haystack = " ".join(tag_labels + [slug, title])
    for sport, keywords in SPORTS_KEYWORDS.items():
        if any(k in haystack for k in keywords):
            return sport
    return None


def extract_binary_probability(market: dict) -> tuple[str, float] | None:
    """Pour un marché binaire 'Will X happen?', retourne (selection, prob).

    Polymarket marchés ont des `outcomes` (liste de noms type ["Yes","No"])
    et `outcomePrices` (liste de strings type ["0.78","0.22"]).
    Le prix du "Yes" = proba directe.
    """
    outcomes = market.get("outcomes")
    prices = market.get("outcomePrices") or market.get("outcomes_prices")

    if isinstance(outcomes, str):
        # Parfois renvoyé en string JSON
        try:
            import json
            outcomes = json.loads(outcomes)
        except Exception:  # noqa: BLE001
            return None
    if isinstance(prices, str):
        try:
            import json
            prices = json.loads(prices)
        except Exception:  # noqa: BLE001
            return None

    if not outcomes or not prices or len(outcomes) != len(prices):
        return None

    # On veut le marché binaire Yes/No
    if len(outcomes) != 2:
        return None
    if not any(o.lower() in {"yes", "no"} for o in outcomes):
        return None

    # Récupère le prix du "Yes"
    try:
        idx_yes = next(i for i, o in enumerate(outcomes) if o.lower() == "yes")
        yes_price = float(prices[idx_yes])
    except (StopIteration, ValueError, IndexError):
        return None

    # Le "selection" est la question (que le Yes valide)
    question = market.get("question") or market.get("groupItemTitle") or ""
    return (question, yes_price)


def parse_event_for_picks(event: dict) -> list[dict]:
    """Pour un event Polymarket, extrait les picks possibles avec proba.

    Format de retour : liste de dicts {
        sport, event_title, question, kickoff_iso, polymarket_prob,
        market_slug, volume
    }
    """
    sport = classify_sport(event)
    if not sport:
        return []

    end_date = event.get("endDate") or event.get("end_date_iso") or event.get("end_date")
    if not end_date:
        return []

    markets = event.get("markets") or []
    picks = []
    for market in markets:
        result = extract_binary_probability(market)
        if not result:
            continue
        question, prob = result
        if prob <= 0 or prob >= 1:
            # Marché résolu ou prix anormal
            continue
        picks.append({
            "sport": sport,
            "event_title": event.get("title", ""),
            "question": question,
            "kickoff_iso": end_date,
            "polymarket_prob": round(prob, 4),
            "market_slug": market.get("slug", ""),
            "volume": float(market.get("volume", 0) or 0),
        })
    return picks


async def fetch_all_candidate_picks() -> list[dict]:
    """Pipeline complet : pull events sports → extraction picks avec proba."""
    events = await fetch_active_sports_events()
    all_picks = []
    for event in events:
        all_picks.extend(parse_event_for_picks(event))
    logger.info("polymarket: %d picks candidats extraits", len(all_picks))
    return all_picks


def is_kickoff_within(iso_str: str, hours: int = 36) -> bool:
    """True si la date du marché tombe dans les `hours` prochaines heures."""
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
