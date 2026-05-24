from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from typing import Any

from backend.schemas.search_results import CandidateMaterial, SearchMaterialsResponse, SearchMetadata

logger = logging.getLogger(__name__)

REVIEW_SEARCH_TIMEOUT_SECONDS = 45


class ReviewSearchAdapter:
    def __init__(
        self,
        review_agent: Any | None = None,
        advanced_search: bool = False,
        review_agent_factory: Callable[[], Any] | None = None,
    ) -> None:
        self._review_agent = review_agent
        self._review_agent_factory = review_agent_factory
        self._advanced_search = advanced_search

    async def search_topic(self, topic: str, max_results: int) -> SearchMaterialsResponse:
        try:
            reviews = await asyncio.wait_for(
                asyncio.to_thread(self._get_review_agent().review, topic, advanced=self._advanced_search),
                timeout=REVIEW_SEARCH_TIMEOUT_SECONDS,
            )
        except TimeoutError:
            logger.exception("ReviewAgent timed out while searching topic %s.", topic)
            raise

        candidates = [self._review_to_candidate(topic, item) for item in reviews if isinstance(item, dict)]
        candidates.sort(key=lambda item: item.confidence, reverse=True)
        selected = candidates[:max_results]

        return SearchMaterialsResponse(
            topic=topic,
            query_used=topic,
            results=selected,
            search_metadata=SearchMetadata(
                total_results=len(selected),
                coverage_source="web_only",
                notes="Results produced by ReviewAgent.",
            ),
        )

    def _review_candidates(self, topic: str, candidates: list[CandidateMaterial]) -> list[CandidateMaterial]:
        del topic
        return candidates

    def _review_to_candidate(self, topic: str, item: dict[str, Any]) -> CandidateMaterial:
        quality_score = self._bounded_int(item.get("material_quality_score"), default=70)
        ease_score = self._bounded_int(item.get("ease_of_understanding_score"), default=60)
        confidence = round(quality_score / 100, 3)
        url = str(item.get("url") or "")
        material_type = self._normalize_kind(item.get("kind") or item.get("format") or item.get("type"))

        return CandidateMaterial(
            title=str(item.get("title") or "Untitled result"),
            url=url,
            type=material_type,
            source=str(item.get("source") or self._source_from_url(url)),
            snippet=str(item.get("snippet") or f"Review score {quality_score}/100."),
            reason_for_inclusion=str(item.get("reason_for_inclusion") or f"ReviewAgent selected this {material_type} for {topic}."),
            confidence=confidence,
            score=confidence,
            source_of_result="web",
            review_data={
                **item,
                "format": material_type,
                "kind": item.get("kind") or item.get("format") or material_type,
                "level": item.get("level") or self._level_from_ease(ease_score),
                "material_quality_score": quality_score,
                "ease_of_understanding_score": ease_score,
            },
        )

    def _bounded_int(self, value: Any, default: int) -> int:
        if isinstance(value, (int, float)):
            return max(0, min(100, round(value)))
        return default

    def _normalize_kind(self, value: Any) -> str:
        normalized = str(value or "").lower()
        if normalized in {"video", "article", "book", "documentation", "tutorial", "other"}:
            return normalized
        if normalized in {"youtube", "website", "site", "webpage"}:
            return "video" if normalized == "youtube" else "documentation"
        return "other"

    def _source_from_url(self, url: str) -> str:
        if "://" not in url:
            return "web"
        return url.split("://", 1)[1].split("/", 1)[0].removeprefix("www.") or "web"

    def _level_from_ease(self, ease_score: int) -> str:
        if ease_score >= 85:
            return "beginner"
        if ease_score >= 55:
            return "intermediate"
        if ease_score >= 35:
            return "advanced"
        return "expert"

    def _get_review_agent(self) -> Any:
        if self._review_agent is None:
            if self._review_agent_factory is None:
                raise RuntimeError("Review agent is not configured.")
            self._review_agent = self._review_agent_factory()
        return self._review_agent
