from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, field_validator

TopicLevel = Literal["beginner", "intermediate", "advanced"]


class TopicCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    level: TopicLevel

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Title must not be empty.")
        return cleaned


class TopicResponse(BaseModel):
    id: str
    title: str
    level: TopicLevel
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: str


class TopicDetailResponse(TopicResponse):
    learning_materials: list[dict] = Field(default_factory=list)
    roadmap: list[str] = Field(default_factory=list)
    exercises: list[str] = Field(default_factory=list)
    coding_tasks: list[str] = Field(default_factory=list)
