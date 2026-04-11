from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, field_validator


ResourceType = Literal["video", "article", "book", "documentation", "tutorial", "other"]
CoverageSource = Literal["db_internal", "db_internal_with_web_fallback", "web_only", "cached"]


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
    material_id: str | None = None
    title: str
    url: str
    type: ResourceType
    source: str
    snippet: str
    reason_for_inclusion: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    score: float | None = Field(default=None, ge=0.0, le=1.0)
    like_count: int = 0
    user_has_liked: bool = False
    is_verified: bool = False
    is_internal: bool = False
    source_of_result: str = "db_internal"


class SearchMetadata(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    total_results: int
    notes: str = "Candidate results only. Final validation will be performed by a separate review agent."
    coverage_source: CoverageSource = "db_internal"
    search_result_id: str | None = None


class SearchMaterialsResponse(BaseModel):
    topic: str
    topic_id: str | None = None
    query_used: str
    results: list[CandidateMaterial]
    search_metadata: SearchMetadata


class SavedSearchResultResponse(BaseModel):
    id: str
    topic: str
    topic_id: str
    user_id: str
    query_text: str
    coverage_source: str
    created_at: datetime
    results: list[CandidateMaterial]
