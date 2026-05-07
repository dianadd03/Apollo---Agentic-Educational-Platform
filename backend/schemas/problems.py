from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from backend.db.models import ProblemSource, TopicLevel


class ProblemResponse(BaseModel):
    id: UUID
    source: ProblemSource
    external_id: str
    title: str
    url: str
    raw_difficulty: str | None = None
    normalized_difficulty: int = Field(ge=1, le=10)
    difficulty_label: TopicLevel
    success_rate: float | None = None  # 0..1
    tags: list[str] = Field(default_factory=list)
    is_generated: bool = False
    generated_objective: str | None = None
    topic_match: float = Field(ge=0, le=1, default=0.5)
    last_fetched_at: datetime

    model_config = {"from_attributes": True}


class ProblemListMetadata(BaseModel):
    topic: str
    tags_used: list[str]
    source_breakdown: dict[str, int]
    generated_count: int
    cached: bool
    fetched_at: datetime


class ProblemListResponse(BaseModel):
    problems: list[ProblemResponse]
    metadata: ProblemListMetadata
