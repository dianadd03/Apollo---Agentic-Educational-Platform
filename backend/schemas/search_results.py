from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, field_validator


ResourceType = Literal["video", "article", "book", "documentation", "tutorial", "other"]


class SearchMaterialsRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=200)
    max_results: int | None = Field(default=None, ge=1, le=20)

    @field_validator("topic")
    @classmethod
    def strip_topic(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Topic must not be empty.")
        return cleaned


class CandidateMaterial(BaseModel):
    title: str
    url: str
    type: ResourceType
    source: str
    snippet: str
    reason_for_inclusion: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class SearchMetadata(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    total_results: int
    notes: str = "Candidate results only. Final validation will be performed by a separate review agent."


class SearchMaterialsResponse(BaseModel):
    topic: str
    query_used: str
    results: list[CandidateMaterial]
    search_metadata: SearchMetadata
