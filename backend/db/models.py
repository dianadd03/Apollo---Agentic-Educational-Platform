from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum as SqlEnum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.config import get_settings
from backend.db.base import Base

settings = get_settings()


class UserRole(str, Enum):
    student = "student"
    professor = "professor"
    admin = "admin"


class TopicLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class MaterialType(str, Enum):
    article = "article"
    video = "video"
    book = "book"
    documentation = "documentation"
    tutorial = "tutorial"
    pdf = "pdf"
    course = "course"
    other = "other"


class MaterialSourceType(str, Enum):
    agent_selected = "agent_selected"
    professor_managed = "professor_managed"
    admin_managed = "admin_managed"
    trusted_source = "trusted_source"
    community_internet = "community_internet"
    general_internet = "general_internet"


class TrustLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    verified = "verified"


class FeedbackUsefulness(str, Enum):
    not_useful = "not_useful"
    somewhat_useful = "somewhat_useful"
    useful = "useful"
    very_useful = "very_useful"


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[UserRole] = mapped_column(SqlEnum(UserRole, name="user_role"), nullable=False, default=UserRole.student)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    topics: Mapped[list[UserTopic]] = relationship(back_populates="user", cascade="all, delete-orphan")
    staff_profile: Mapped[TeacherAdminProfile | None] = relationship(back_populates="user", cascade="all, delete-orphan")
    sessions: Mapped[list[AppSession]] = relationship(back_populates="user", cascade="all, delete-orphan")
    likes: Mapped[list[MaterialLike]] = relationship(back_populates="user", cascade="all, delete-orphan")
    saved_searches: Mapped[list[TopicSearchResult]] = relationship(back_populates="user", cascade="all, delete-orphan")


class AppSession(Base):
    __tablename__ = "app_sessions"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    token: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="sessions")


class TeacherAdminProfile(Base):
    __tablename__ = "teacher_admin_profiles"
    __table_args__ = (
        CheckConstraint("staff_role IN ('professor', 'admin')", name="ck_teacher_admin_profiles_staff_role"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    staff_role: Mapped[str] = mapped_column(String(20), nullable=False)
    department: Mapped[str | None] = mapped_column(String(120))
    bio: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user: Mapped[User] = relationship(back_populates="staff_profile")


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    slug: Mapped[str] = mapped_column(String(160), nullable=False, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    learners: Mapped[list[UserTopic]] = relationship(back_populates="topic", cascade="all, delete-orphan")
    material_links: Mapped[list[MaterialTopicLink]] = relationship(back_populates="topic", cascade="all, delete-orphan")
    search_results: Mapped[list[TopicSearchResult]] = relationship(back_populates="topic", cascade="all, delete-orphan")


class UserTopic(Base):
    __tablename__ = "user_topics"
    __table_args__ = (
        UniqueConstraint("user_id", "topic_id", name="uq_user_topics_user_topic"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    level: Mapped[TopicLevel] = mapped_column(SqlEnum(TopicLevel, name="topic_level"), nullable=False)
    added_by_staff_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("teacher_admin_profiles.id", ondelete="SET NULL"))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user: Mapped[User] = relationship(back_populates="topics")
    topic: Mapped[Topic] = relationship(back_populates="learners")
    progress: Mapped[UserTopicProgress | None] = relationship(back_populates="user_topic", cascade="all, delete-orphan")


class UserTopicProgress(Base):
    __tablename__ = "user_topic_progress"
    __table_args__ = (
        CheckConstraint("completion_percent >= 0 AND completion_percent <= 100", name="ck_user_topic_progress_completion_percent"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_topic_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("user_topics.id", ondelete="CASCADE"), nullable=False, unique=True)
    completion_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    current_stage: Mapped[str | None] = mapped_column(String(120))
    last_activity_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user_topic: Mapped[UserTopic] = relationship(back_populates="progress")


class Material(Base):
    __tablename__ = "materials"
    __table_args__ = (
        CheckConstraint("trust_score >= 0 AND trust_score <= 1", name="ck_materials_trust_score"),
        CheckConstraint("quality_score >= 0 AND quality_score <= 1", name="ck_materials_quality_score"),
        CheckConstraint("ease_score >= 0 AND ease_score <= 1", name="ck_materials_ease_score"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    topic_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("topics.id", ondelete="SET NULL"))
    submitted_by_staff_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("teacher_admin_profiles.id", ondelete="SET NULL"))
    canonical_name: Mapped[str] = mapped_column(String(255), nullable=False)
    link: Mapped[str | None] = mapped_column(Text)
    file_path: Mapped[str | None] = mapped_column(Text)
    material_type: Mapped[MaterialType] = mapped_column(SqlEnum(MaterialType, name="material_type"), nullable=False)
    difficulty: Mapped[TopicLevel] = mapped_column(SqlEnum(TopicLevel, name="topic_level"), nullable=False)
    source_type: Mapped[MaterialSourceType] = mapped_column(SqlEnum(MaterialSourceType, name="material_source_type"), nullable=False)
    trust_level: Mapped[TrustLevel] = mapped_column(SqlEnum(TrustLevel, name="material_trust_level"), nullable=False, default=TrustLevel.medium)
    trust_score: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False, default=0.5)
    quality_score: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False, default=0.5)
    ease_score: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False, default=0.5)
    summary: Mapped[str | None] = mapped_column(Text)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    verified_by_user_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_json: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    tags: Mapped[list[MaterialTag]] = relationship(back_populates="material", cascade="all, delete-orphan")
    chunks: Mapped[list[MaterialChunk]] = relationship(back_populates="material", cascade="all, delete-orphan")
    feedback_entries: Mapped[list[MaterialFeedback]] = relationship(back_populates="material", cascade="all, delete-orphan")
    likes: Mapped[list[MaterialLike]] = relationship(back_populates="material", cascade="all, delete-orphan")
    topic_links: Mapped[list[MaterialTopicLink]] = relationship(back_populates="material", cascade="all, delete-orphan")
    search_result_items: Mapped[list[TopicSearchResultItem]] = relationship(back_populates="material")


class MaterialTopicLink(Base):
    __tablename__ = "material_topic_links"
    __table_args__ = (
        UniqueConstraint("material_id", "topic_id", name="uq_material_topic_links_material_topic"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    material_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("materials.id", ondelete="CASCADE"), nullable=False)
    topic_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    material: Mapped[Material] = relationship(back_populates="topic_links")
    topic: Mapped[Topic] = relationship(back_populates="material_links")


class MaterialTag(Base):
    __tablename__ = "material_tags"
    __table_args__ = (
        UniqueConstraint("material_id", "category", name="uq_material_tags_material_category"),
        CheckConstraint("relevance >= 0 AND relevance <= 1", name="ck_material_tags_relevance"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    material_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("materials.id", ondelete="CASCADE"), nullable=False)
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    relevance: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    material: Mapped[Material] = relationship(back_populates="tags")


class MaterialChunk(Base):
    __tablename__ = "material_chunks"
    __table_args__ = (
        UniqueConstraint("material_id", "chunk_index", name="uq_material_chunks_material_chunk_index"),
        Index(
            "ix_material_chunks_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
        Index("ix_material_chunks_material_id", "material_id"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    material_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("materials.id", ondelete="CASCADE"), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int | None] = mapped_column(Integer)
    embedding_model: Mapped[str | None] = mapped_column(String(120))
    embedding: Mapped[list[float] | None] = mapped_column(Vector(settings.embedding_dimensions))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    material: Mapped[Material] = relationship(back_populates="chunks")


class MaterialFeedback(Base):
    __tablename__ = "material_feedback"
    __table_args__ = (
        UniqueConstraint("material_id", "user_id", name="uq_material_feedback_material_user"),
        CheckConstraint("rating IS NULL OR (rating >= 1 AND rating <= 5)", name="ck_material_feedback_rating"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    material_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("materials.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating: Mapped[int | None] = mapped_column(Integer)
    usefulness: Mapped[FeedbackUsefulness | None] = mapped_column(SqlEnum(FeedbackUsefulness, name="feedback_usefulness"))
    is_saved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    would_recommend: Mapped[bool | None] = mapped_column(Boolean)
    feedback_text: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    material: Mapped[Material] = relationship(back_populates="feedback_entries")


class MaterialLike(Base):
    __tablename__ = "material_likes"
    __table_args__ = (
        UniqueConstraint("material_id", "user_id", name="uq_material_likes_material_user"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    material_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("materials.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    material: Mapped[Material] = relationship(back_populates="likes")
    user: Mapped[User] = relationship(back_populates="likes")


class TopicSearchResult(Base):
    __tablename__ = "topic_search_results"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    topic_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    search_session_id: Mapped[str | None] = mapped_column(String(120))
    query_text: Mapped[str] = mapped_column(String(200), nullable=False)
    coverage_source: Mapped[str] = mapped_column(String(40), nullable=False, default="db_internal")
    result_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    topic: Mapped[Topic] = relationship(back_populates="search_results")
    user: Mapped[User] = relationship(back_populates="saved_searches")
    items: Mapped[list[TopicSearchResultItem]] = relationship(back_populates="search_result", cascade="all, delete-orphan")


class TopicSearchResultItem(Base):
    __tablename__ = "topic_search_result_items"
    __table_args__ = (
        UniqueConstraint("search_result_id", "rank_position", name="uq_topic_search_result_items_rank"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    search_result_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("topic_search_results.id", ondelete="CASCADE"), nullable=False)
    material_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("materials.id", ondelete="CASCADE"), nullable=False)
    rank_position: Mapped[int] = mapped_column(Integer, nullable=False)
    score_at_return_time: Mapped[float | None] = mapped_column(Numeric(5, 3))
    source_of_result: Mapped[str] = mapped_column(String(40), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    search_result: Mapped[TopicSearchResult] = relationship(back_populates="items")
    material: Mapped[Material] = relationship(back_populates="search_result_items")
