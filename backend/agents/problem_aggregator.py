"""Aggregator that fetches and ranks practice problems for a topic.

Story 5.1 — Fetch problem links from searched topic.
Story 5.2 — Rank by difficulty / success rate.
Story 5.3 — Filtering happens at the API layer using fields populated here.
Story 5.4 — General problems fallback (LLM) is wired but optional.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from backend.agents.problem_providers.base import ProblemDTO, ProblemProvider
from backend.agents.problem_providers.topic_tag_mapping import topic_to_tags
from backend.db.models import ProblemSource, TopicLevel

logger = logging.getLogger(__name__)


class AggregatedProblems:
    def __init__(
        self,
        problems: list[ProblemDTO],
        tags_used: list[str],
        source_breakdown: dict[str, int],
        from_cache: bool,
    ) -> None:
        self.problems = problems
        self.tags_used = tags_used
        self.source_breakdown = source_breakdown
        self.from_cache = from_cache


class ProblemAggregatorAgent:
    def __init__(
        self,
        providers: list[ProblemProvider],
        cache_ttl_hours: int = 24,
        max_per_source: int = 20,
        general_threshold: int = 5,
        general_generator=None,
    ) -> None:
        self._providers = providers
        self._cache_ttl = timedelta(hours=cache_ttl_hours)
        self._max_per_source = max_per_source
        self._general_threshold = general_threshold
        self._general_generator = general_generator

    async def aggregate_for_topic(
        self,
        topic: str,
        level: TopicLevel | None = None,
        max_per_source: int | None = None,
    ) -> AggregatedProblems:
        tags = topic_to_tags(topic)
        if not tags:
            return AggregatedProblems(problems=[], tags_used=[], source_breakdown={}, from_cache=False)

        per_source = max_per_source or self._max_per_source

        tasks = [
            self._fetch_safe(provider, tags, per_source) for provider in self._providers
        ]
        provider_results = await asyncio.gather(*tasks, return_exceptions=False)

        merged: list[ProblemDTO] = []
        breakdown: dict[str, int] = {}
        for provider, dtos in zip(self._providers, provider_results):
            breakdown[provider.source.value] = len(dtos)
            merged.extend(dtos)

        deduped = self._dedup(merged)
        ranked = self._rank(deduped, level=level)

        if (
            self._general_generator is not None
            and len(ranked) < self._general_threshold
        ):
            try:
                generated = await self._general_generator(
                    topic=topic,
                    level=level or TopicLevel.intermediate,
                    count=max(self._general_threshold - len(ranked), 3),
                )
            except Exception as exc:
                logger.warning("General problems generation failed: %s", exc)
                generated = []
            if generated:
                ranked.extend(generated)
                breakdown[ProblemSource.generated.value] = len(generated)

        return AggregatedProblems(
            problems=ranked,
            tags_used=tags,
            source_breakdown=breakdown,
            from_cache=False,
        )

    @staticmethod
    def is_cache_fresh(last_fetched_at: datetime | None, ttl_hours: int) -> bool:
        if last_fetched_at is None:
            return False
        if last_fetched_at.tzinfo is None:
            last_fetched_at = last_fetched_at.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) - last_fetched_at < timedelta(hours=ttl_hours)

    async def _fetch_safe(
        self, provider: ProblemProvider, tags: list[str], limit: int
    ) -> list[ProblemDTO]:
        try:
            return await provider.fetch_problems_for_tags(tags=tags, limit=limit)
        except Exception as exc:
            logger.warning("Provider %s failed: %s", provider.source.value, exc)
            return []

    @staticmethod
    def _dedup(problems: list[ProblemDTO]) -> list[ProblemDTO]:
        seen: set[tuple[str, str]] = set()
        result: list[ProblemDTO] = []
        for dto in problems:
            key = (dto.source.value, dto.external_id)
            if key in seen:
                continue
            url_key = ("url", dto.url.strip().lower())
            if url_key in seen:
                continue
            seen.add(key)
            seen.add(url_key)
            result.append(dto)
        return result

    @staticmethod
    def _rank(problems: list[ProblemDTO], level: TopicLevel | None) -> list[ProblemDTO]:
        # Simple ranking: prefer matching difficulty level, then by normalized_difficulty asc.
        target_score_map = {
            TopicLevel.beginner: 2,
            TopicLevel.intermediate: 5,
            TopicLevel.advanced: 8,
        }
        target = target_score_map.get(level) if level else None

        def sort_key(dto: ProblemDTO) -> tuple[int, int, int]:
            level_distance = abs(dto.normalized_difficulty - target) if target is not None else 0
            generated_penalty = 1 if dto.is_generated else 0  # show real problems first
            return (generated_penalty, level_distance, dto.normalized_difficulty)

        return sorted(problems, key=sort_key)
