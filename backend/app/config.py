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

    database_url: str = f"sqlite:///{DATA_DIR}/pronostics.db"
    log_level: str = "INFO"

    request_timeout_seconds: float = 15.0
    cache_ttl_seconds: int = 3600

    @property
    def has_any_real_source(self) -> bool:
        return bool(self.api_football_key or self.football_data_token or self.odds_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
