"""Service that orchestrates problem retrieval, persistence and filtering."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.agents.problem_aggregator import ProblemAggregatorAgent
from backend.agents.problem_providers.base import ProblemDTO
from backend.db.models import (
    Problem,
    ProblemSource,
    ProblemTopicLink,
    Topic,
    TopicLevel,
    User,
)
from backend.schemas.problems import (
    ProblemListMetadata,
    ProblemListResponse,
    ProblemResponse,
)

logger = logging.getLogger(__name__)


def _slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower())
    return cleaned.strip("-") or "topic"


class ProblemService:
    def __init__(
        self,
        db: Session,
        agent: ProblemAggregatorAgent,
        cache_ttl_hours: int,
        default_max_results: int,
    ) -> None:
        self._db = db
        self._agent = agent
        self._cache_ttl_hours = cache_ttl_hours
        self._default_max_results = default_max_results

    async def get_problems_for_topic(
        self,
        topic: str,
        current_user: User,
        platforms: list[str] | None = None,
        difficulty_filter: str | None = None,
        max_results: int | None = None,
        force_refresh: bool = False,
    ) -> ProblemListResponse:
        topic_record = self._get_or_create_topic(topic)

        # Try cache first.
        cached_dtos = (
            self._load_cached_for_topic(topic_record.id) if not force_refresh else []
        )
        if cached_dtos and self._cache_is_fresh(topic_record.id):
            problems = cached_dtos
            tags_used: list[str] = []
            source_breakdown = self._summarize_sources(problems)
            from_cache = True
        else:
            aggregated = await self._agent.aggregate_for_topic(topic=topic)
            problems = aggregated.problems
            tags_used = aggregated.tags_used
            source_breakdown = aggregated.source_breakdown
            from_cache = False
            self._persist_problems(problems, topic_record.id)

        filtered = self._apply_filters(
            problems, platforms=platforms, difficulty_filter=difficulty_filter
        )
        limit = max_results or self._default_max_results
        filtered = filtered[:limit]

        responses = [self._dto_to_response(dto, topic_record.id) for dto in filtered]

        return ProblemListResponse(
            problems=responses,
            metadata=ProblemListMetadata(
                topic=topic,
                tags_used=tags_used,
                source_breakdown=source_breakdown,
                generated_count=sum(1 for p in filtered if p.is_generated),
                cached=from_cache,
                fetched_at=datetime.now(timezone.utc),
            ),
        )

    def _get_or_create_topic(self, topic: str) -> Topic:
        slug = _slugify(topic)
        existing = self._db.execute(
            select(Topic).where(Topic.slug == slug)
        ).scalar_one_or_none()
        if existing is not None:
            return existing
        existing_by_title = self._db.execute(
            select(Topic).where(Topic.title == topic)
        ).scalar_one_or_none()
        if existing_by_title is not None:
            return existing_by_title
        record = Topic(slug=slug, title=topic)
        self._db.add(record)
        self._db.commit()
        self._db.refresh(record)
        return record

    def _load_cached_for_topic(self, topic_id: UUID) -> list[ProblemDTO]:
        stmt = (
            select(Problem)
            .join(ProblemTopicLink, ProblemTopicLink.problem_id == Problem.id)
            .where(ProblemTopicLink.topic_id == topic_id)
            .options(selectinload(Problem.topic_links))
        )
        rows = self._db.execute(stmt).scalars().all()
        return [self._row_to_dto(row) for row in rows]

    def _cache_is_fresh(self, topic_id: UUID) -> bool:
        latest = self._db.execute(
            select(Problem.last_fetched_at)
            .join(ProblemTopicLink, ProblemTopicLink.problem_id == Problem.id)
            .where(ProblemTopicLink.topic_id == topic_id)
            .order_by(Problem.last_fetched_at.desc())
            .limit(1)
        ).scalar_one_or_none()
        return ProblemAggregatorAgent.is_cache_fresh(latest, self._cache_ttl_hours)

    def _persist_problems(self, dtos: list[ProblemDTO], topic_id: UUID) -> None:
        if not dtos:
            return
        now = datetime.now(timezone.utc)
        for dto in dtos:
            existing = self._db.execute(
                select(Problem).where(
                    Problem.source == dto.source,
                    Problem.external_id == dto.external_id,
                )
            ).scalar_one_or_none()
            if existing is None:
                record = Problem(
                    source=dto.source,
                    external_id=dto.external_id,
                    title=dto.title,
                    url=dto.url,
                    raw_difficulty=dto.raw_difficulty,
                    normalized_difficulty=dto.normalized_difficulty,
                    difficulty_label=dto.difficulty_label,
                    success_rate=dto.success_rate,
                    tags=list(dto.tags or []),
                    is_generated=dto.is_generated,
                    generated_objective=dto.generated_objective,
                    last_fetched_at=now,
                )
                self._db.add(record)
                self._db.flush()
                problem_id = record.id
            else:
                existing.title = dto.title
                existing.url = dto.url
                existing.raw_difficulty = dto.raw_difficulty
                existing.normalized_difficulty = dto.normalized_difficulty
                existing.difficulty_label = dto.difficulty_label
                existing.success_rate = dto.success_rate
                existing.tags = list(dto.tags or [])
                existing.last_fetched_at = now
                problem_id = existing.id

            link_exists = self._db.execute(
                select(ProblemTopicLink).where(
                    ProblemTopicLink.problem_id == problem_id,
                    ProblemTopicLink.topic_id == topic_id,
                )
            ).scalar_one_or_none()
            if link_exists is None:
                self._db.add(
                    ProblemTopicLink(
                        problem_id=problem_id,
                        topic_id=topic_id,
                        match_score=0.7,
                    )
                )
        self._db.commit()

    @staticmethod
    def _apply_filters(
        problems: list[ProblemDTO],
        platforms: list[str] | None,
        difficulty_filter: str | None,
    ) -> list[ProblemDTO]:
        result = problems
        if platforms:
            allowed = {p.lower() for p in platforms}
            result = [p for p in result if p.source.value in allowed]
        if difficulty_filter:
            label = difficulty_filter.lower()
            result = [p for p in result if p.difficulty_label.value == label]
        return result

    @staticmethod
    def _summarize_sources(problems: list[ProblemDTO]) -> dict[str, int]:
        breakdown: dict[str, int] = {}
        for dto in problems:
            breakdown[dto.source.value] = breakdown.get(dto.source.value, 0) + 1
        return breakdown

    @staticmethod
    def _row_to_dto(row: Problem) -> ProblemDTO:
        return ProblemDTO(
            source=row.source,
            external_id=row.external_id,
            title=row.title,
            url=row.url,
            raw_difficulty=row.raw_difficulty,
            normalized_difficulty=row.normalized_difficulty,
            difficulty_label=row.difficulty_label,
            success_rate=float(row.success_rate) if row.success_rate is not None else None,
            tags=list(row.tags or []),
            is_generated=row.is_generated,
            generated_objective=row.generated_objective,
        )

    def _dto_to_response(self, dto: ProblemDTO, topic_id: UUID) -> ProblemResponse:
        # When the DTO comes straight from a cached row we already have an id;
        # otherwise we re-look-up to expose the persisted UUID.
        record = self._db.execute(
            select(Problem).where(
                Problem.source == dto.source,
                Problem.external_id == dto.external_id,
            )
        ).scalar_one_or_none()

        problem_id = record.id if record is not None else UUID(int=0)
        last_fetched = (
            record.last_fetched_at
            if record is not None
            else datetime.now(timezone.utc)
        )

        match_score = 0.5
        if record is not None:
            link = self._db.execute(
                select(ProblemTopicLink).where(
                    ProblemTopicLink.problem_id == record.id,
                    ProblemTopicLink.topic_id == topic_id,
                )
            ).scalar_one_or_none()
            if link is not None:
                match_score = float(link.match_score)

        return ProblemResponse(
            id=problem_id,
            source=dto.source,
            external_id=dto.external_id,
            title=dto.title,
            url=dto.url,
            raw_difficulty=dto.raw_difficulty,
            normalized_difficulty=dto.normalized_difficulty,
            difficulty_label=dto.difficulty_label,
            success_rate=dto.success_rate,
            tags=list(dto.tags or []),
            is_generated=dto.is_generated,
            generated_objective=dto.generated_objective,
            topic_match=match_score,
            last_fetched_at=last_fetched,
        )
