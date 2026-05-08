from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="APOLLO_",
        env_file=(ROOT_DIR / ".env", ROOT_DIR / "backend" / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Apollo Search Retrieval API"
    environment: str = "development"
    log_level: str = "INFO"
    search_provider: Literal["auto", "tavily", "duckduckgo"] = "auto"
    max_results: int = Field(default=28, ge=1, le=28)
    tavily_api_key: str | None = None
    review_agent_dir: str = "agents"
    review_advanced_search: bool = False
    frontend_origin: str = "http://localhost:5173"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5434/apollo"
    embedding_dimensions: int = Field(default=1536, ge=1, le=8192)
    uploads_dir: str = "backend/data/uploads"

    # Epic 5 — Problem Aggregator
    problems_cache_ttl_hours: int = Field(default=24, ge=1, le=168)
    problems_max_per_source: int = Field(default=20, ge=1, le=100)
    problems_general_threshold: int = Field(default=5, ge=0, le=50)
    problems_default_max_results: int = Field(default=30, ge=1, le=200)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
