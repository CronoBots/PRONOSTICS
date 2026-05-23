from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR.parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    api_football_key: str = ""
    football_data_token: str = ""
    odds_api_key: str = ""

    # Nouvelles sources (Niveau 2)
    kalshi_key: str = ""              # facultatif : lecture publique fonctionne sans clé
    balldontlie_key: str = ""         # requise depuis 2024 (free signup)
    api_sports_key: str = ""          # requise (free 100 req/jour)
    openweather_key: str = ""         # requise (free 1000 req/jour)

    database_url: str = f"sqlite:///{DATA_DIR}/pronostics.db"
    log_level: str = "INFO"

    request_timeout_seconds: float = 15.0
    cache_ttl_seconds: int = 3600

    @property
    def has_any_real_source(self) -> bool:
        return bool(
            self.api_football_key
            or self.football_data_token
            or self.odds_api_key
            or self.balldontlie_key
            or self.api_sports_key
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
