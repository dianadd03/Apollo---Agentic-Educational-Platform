from pydantic import BaseModel, Field, field_validator


class SearchMaterialsRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=200)
    advanced: bool = False

    @field_validator("topic")
    @classmethod
    def strip_topic(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Topic must not be empty.")
        return cleaned


class WebSearchResult(BaseModel):
    kind: str
    title: str | None = None
    url: str | None = None
    score: float | None = None
