from datetime import datetime, timezone

from pydantic import BaseModel, Field, field_validator


class CodeReviewRequest(BaseModel):
    task: str = Field(..., min_length=1, max_length=12000)
    code: str = Field(..., min_length=1, max_length=40000)
    language: str = Field(..., min_length=1, max_length=80)
    context: str | None = Field(default=None, max_length=12000)

    @field_validator("task", "code", "language")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field must not be empty.")
        return cleaned

    @field_validator("context")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class CodeReviewResponse(BaseModel):
    review_markdown: str = Field(..., min_length=1)
    model: str
    reviewed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
