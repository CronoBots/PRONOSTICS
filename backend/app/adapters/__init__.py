"""Adapters vers les sources de données externes.

Chaque adapter expose :
    async def fetch_daily(sport: str, when: date) -> list[MatchInput]

Si aucune clé API n'est configurée, un MockAdapter est utilisé pour permettre
le développement et la démo hors-ligne.
"""

from datetime import date

from app.adapters.base import BaseAdapter
from app.adapters.api_football import ApiFootballAdapter
from app.adapters.football_data import FootballDataAdapter
from app.adapters.mock import MockAdapter
from app.adapters.odds_api import OddsApiAdapter
from app.config import get_settings
from app.schemas import MatchInput

# Sports → adapter prioritaire. L'adapter est sélectionné dynamiquement
# en fonction des clés API présentes.
_SPORT_TO_REAL_ADAPTERS: dict[str, list[type[BaseAdapter]]] = {
    "football": [ApiFootballAdapter, FootballDataAdapter, OddsApiAdapter],
    "basketball": [OddsApiAdapter],
    "tennis": [OddsApiAdapter],
    "nfl": [OddsApiAdapter],
    "mlb": [OddsApiAdapter],
    "nhl": [OddsApiAdapter],
}


def resolve_adapter(sport: str) -> BaseAdapter:
    """Retourne le premier adapter disponible pour ce sport, ou Mock en fallback."""
    settings = get_settings()
    for adapter_cls in _SPORT_TO_REAL_ADAPTERS.get(sport, []):
        adapter = adapter_cls()
        if adapter.is_configured(settings):
            return adapter
    return MockAdapter()


async def fetch_daily(sport: str, when: date) -> list[MatchInput]:
    adapter = resolve_adapter(sport)
    return await adapter.fetch_daily(sport, when)


__all__ = [
    "BaseAdapter",
    "ApiFootballAdapter",
    "FootballDataAdapter",
    "OddsApiAdapter",
    "MockAdapter",
    "resolve_adapter",
    "fetch_daily",
]
