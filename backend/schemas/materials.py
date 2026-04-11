from datetime import datetime

from pydantic import BaseModel, Field, field_validator, model_validator

from backend.db.models import MaterialSourceType, MaterialType, TopicLevel


class MaterialBaseRequest(BaseModel):
    canonical_name: str = Field(..., min_length=2, max_length=255)
    link: str | None = Field(default=None, max_length=2000)
    file_path: str | None = Field(default=None, max_length=2000)
    material_type: MaterialType
    difficulty: TopicLevel
    summary: str | None = None
    source_type: MaterialSourceType | None = None
    quality_score: float = Field(default=0.5, ge=0.0, le=1.0)
    ease_score: float = Field(default=0.5, ge=0.0, le=1.0)
    trust_score: float = Field(default=0.5, ge=0.0, le=1.0)
    tags: list[str] = Field(default_factory=list)
    topic_titles: list[str] = Field(default_factory=list)
    is_published: bool = True

    @field_validator("canonical_name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def ensure_location(self) -> "MaterialBaseRequest":
        if not (self.link or self.file_path):
            raise ValueError("Either link or file_path must be provided.")
        return self


class MaterialCreateRequest(MaterialBaseRequest):
    pass


class MaterialUploadRequest(BaseModel):
    canonical_name: str = Field(..., min_length=2, max_length=255)
    material_type: MaterialType
    difficulty: TopicLevel
    summary: str | None = None
    quality_score: float = Field(default=0.5, ge=0.0, le=1.0)
    ease_score: float = Field(default=0.5, ge=0.0, le=1.0)
    trust_score: float = Field(default=0.5, ge=0.0, le=1.0)
    tags: list[str] = Field(default_factory=list)
    topic_titles: list[str] = Field(default_factory=list)
    is_published: bool = True


class MaterialUpdateRequest(BaseModel):
    canonical_name: str | None = Field(default=None, min_length=2, max_length=255)
    link: str | None = Field(default=None, max_length=2000)
    file_path: str | None = Field(default=None, max_length=2000)
    material_type: MaterialType | None = None
    difficulty: TopicLevel | None = None
    summary: str | None = None
    quality_score: float | None = Field(default=None, ge=0.0, le=1.0)
    ease_score: float | None = Field(default=None, ge=0.0, le=1.0)
    trust_score: float | None = Field(default=None, ge=0.0, le=1.0)
    tags: list[str] | None = None
    topic_titles: list[str] | None = None
    is_published: bool | None = None


class MaterialVerificationRequest(BaseModel):
    verified: bool


class MaterialActivationRequest(BaseModel):
    is_active: bool


class TopicSummary(BaseModel):
    id: str
    title: str
    slug: str


class MaterialResponse(BaseModel):
    id: str
    canonical_name: str
    link: str | None
    file_path: str | None
    material_type: MaterialType
    difficulty: TopicLevel
    source_type: MaterialSourceType
    trust_score: float
    quality_score: float
    ease_score: float
    summary: str | None
    is_published: bool
    is_active: bool
    is_verified: bool
    like_count: int = 0
    user_has_liked: bool = False
    tags: list[str] = Field(default_factory=list)
    topics: list[TopicSummary] = Field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None


class MaterialLikeResponse(BaseModel):
    material_id: str
    like_count: int
    user_has_liked: bool
