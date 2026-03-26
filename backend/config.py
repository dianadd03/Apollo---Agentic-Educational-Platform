from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="APOLLO_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Apollo Search Retrieval API"
    environment: str = "development"
    log_level: str = "INFO"
    search_provider: Literal["auto", "tavily", "duckduckgo"] = "auto"
    max_results: int = Field(default=8, ge=1, le=20)
    tavily_api_key: str | None = None
    frontend_origin: str = "http://localhost:5173"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
