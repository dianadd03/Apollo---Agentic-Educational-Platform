from __future__ import annotations

import logging
from decimal import Decimal
from collections import defaultdict
from typing import Any, Protocol
from urllib.parse import urlparse, urlunparse

from sqlalchemy import Select, String, or_, select
from sqlalchemy.orm import Session, selectinload

from backend.db.models import (
    Material,
    MaterialSourceType,
    MaterialTag,
    MaterialTopicLink,
    MaterialType,
    Topic,
    TopicLevel,
    TrustLevel,
)
from backend.schemas.search_results import CandidateMaterial, SearchMaterialsResponse, SearchMetadata

logger = logging.getLogger(__name__)

LEVELS = ("beginner", "intermediate", "advanced", "expert")
MIN_PER_LEVEL = 7
MIN_INTERNAL_TOTAL = 20

LEVEL_WEB_QUERY_SUFFIX = {
    "beginner": "beginner friendly basics tutorial introduction no prerequisites",
    "intermediate": "intermediate practical guide examples",
    "advanced": "advanced course deep dive",
    "expert": "expert research paper",
}

EASY_SIGNALS = (
    "beginner",
    "basic",
    "basics",
    "intro",
    "introduction",
    "getting started",
    "fundamentals",
    "for beginners",
    "tutorial",
)
ADVANCED_SIGNALS = (
    "advanced",
    "deep dive",
    "optimization",
    "complexity analysis",
    "graduate",
    "masterclass",
)
EXPERT_SIGNALS = (
    "expert",
    "research",
    "paper",
    "survey",
    "proof",
    "theorem",
    "journal",
    "proceedings",
    "arxiv",
)
INTERNAL_SOURCE_TYPES = {MaterialSourceType.admin_managed, MaterialSourceType.professor_managed}

SOURCE_TYPE_BONUS = {
    MaterialSourceType.admin_managed: 0.08,
    MaterialSourceType.professor_managed: 0.07,
    MaterialSourceType.trusted_source: 0.05,
    MaterialSourceType.agent_selected: 0.03,
    MaterialSourceType.community_internet: 0.01,
    MaterialSourceType.general_internet: 0.0,
}


class ReviewSearchLike(Protocol):
    async def search_topic(self, topic: str, max_results: int) -> SearchMaterialsResponse:
        ...


class RagRetrievalAgent:
    def __init__(self, db: Session, review_search: ReviewSearchLike) -> None:
        self._db = db
        self._review_search = review_search

    async def search(self, topic: str, max_results: int = 28) -> SearchMaterialsResponse:
        limit = min(max(max_results, 1), 28)
        notes: list[str] = []
        internal_candidates: list[CandidateMaterial] = []
        web_candidates: list[CandidateMaterial] = []
        internal_failed = False
        web_failed = False

        try:
            internal_candidates = await self.search_internal_materials(self._db, topic, max_per_level=MIN_PER_LEVEL)
        except Exception:
            internal_failed = True
            logger.exception("Internal RAG retrieval failed for topic %s", topic)

        internal_by_level = self._group_by_level(internal_candidates)
        needs_web = internal_failed or len(internal_candidates) < MIN_INTERNAL_TOTAL
        missing_levels = [level for level in LEVELS if len(internal_by_level[level]) < MIN_PER_LEVEL]
        needs_web = needs_web or bool(missing_levels)

        if needs_web:
            try:
                web_candidates = await self._search_web_fallback(topic, internal_by_level, limit)
            except Exception:
                web_failed = True
                logger.exception("Web fallback retrieval failed for topic %s", topic)

        if internal_failed and web_failed:
            raise RuntimeError("Apollo could not retrieve internal or web materials for this topic.")

        merged = self._deduplicate([*internal_candidates, *web_candidates])
        ranked = self._rank_candidates(merged)
        balanced = self._balance_levels(ranked, limit)

        level_counts = self._level_counts(balanced)
        for level in LEVELS:
            reached = level_counts[level] >= MIN_PER_LEVEL
            notes.append(f"{level}: {level_counts[level]}/{MIN_PER_LEVEL} materials{' reached' if reached else ' available'}")

        notes.append(f"Internal materials found: {len(internal_candidates)}.")
        notes.append(f"Web materials added: {len([item for item in balanced if item.source_of_result == 'web'])}.")
        if internal_failed:
            notes.append("Internal search failed, so Apollo used web fallback where possible.")
        if web_failed:
            notes.append("Web fallback failed, so Apollo returned the best internal materials available.")

        coverage_source = self._coverage_source(balanced)
        return SearchMaterialsResponse(
            topic=topic,
            query_used=topic,
            results=balanced,
            search_metadata=SearchMetadata(
                total_results=len(balanced),
                coverage_source=coverage_source,
                notes=" ".join(notes),
            ),
        )

    async def search_internal_materials(
        self,
        db: Session,
        topic: str,
        max_per_level: int = MIN_PER_LEVEL,
    ) -> list[CandidateMaterial]:
        del max_per_level
        materials = self._load_keyword_materials(db, topic)
        candidates: list[CandidateMaterial] = []
        for material in materials:
            relevance = self._relevance_score(material, topic)
            if relevance <= 0:
                continue
            candidates.append(self._material_to_candidate(material, relevance, self._retrieval_method(material)))
        return self._rank_candidates(candidates)

    def _load_keyword_materials(self, db: Session, topic: str) -> list[Material]:
        patterns = self._keyword_patterns(topic)
        searchable_fields = (
            Material.canonical_name,
            Material.summary,
            Material.difficulty.cast(String),
            Material.material_type.cast(String),
            MaterialTag.category,
            Topic.title,
        )
        stmt: Select[tuple[Material]] = (
            select(Material)
            .outerjoin(Material.tags)
            .outerjoin(Material.topic_links)
            .outerjoin(Topic, Topic.id == MaterialTopicLink.topic_id)
            .options(
                selectinload(Material.tags),
                selectinload(Material.chunks),
                selectinload(Material.topic_links).selectinload(MaterialTopicLink.topic),
            )
            .where(Material.is_active.is_(True), Material.is_published.is_(True))
            .where(
                or_(
                    *(field.ilike(pattern) for pattern in patterns for field in searchable_fields),
                )
            )
        )
        return list(db.scalars(stmt).unique().all())

    async def _search_web_fallback(
        self,
        topic: str,
        internal_by_level: dict[str, list[CandidateMaterial]],
        max_results: int,
    ) -> list[CandidateMaterial]:
        web_candidates: list[CandidateMaterial] = []
        total_internal = sum(len(items) for items in internal_by_level.values())
        missing_levels = [level for level in LEVELS if len(internal_by_level[level]) < MIN_PER_LEVEL]

        if missing_levels:
            missing_total = sum(MIN_PER_LEVEL - len(internal_by_level[level]) for level in missing_levels)
            response = await self._review_search.search_topic(topic=topic, max_results=min(max_results, missing_total))
            reviewed = self._review_web_candidates(topic, response.results)
            for candidate in reviewed:
                candidate_level = self._calibrated_candidate_level(candidate, None)
                target_level = candidate_level if candidate_level in missing_levels else None
                web_candidates.append(self._mark_web_candidate(candidate, topic, target_level))

        if total_internal < MIN_INTERNAL_TOTAL and not missing_levels:
            remaining = max(max_results - total_internal, 1)
            response = await self._review_search.search_topic(topic=topic, max_results=remaining)
            reviewed = self._review_web_candidates(topic, response.results)
            web_candidates.extend(self._mark_web_candidate(item, topic, None) for item in reviewed)

        return web_candidates

    def _review_web_candidates(self, query: str, candidates: list[CandidateMaterial]) -> list[CandidateMaterial]:
        reviewer = getattr(self._review_search, "_review_candidates", None)
        if reviewer is None:
            return candidates
        try:
            reviewed = reviewer(query, candidates)
        except Exception:
            logger.exception("Review agent failed while reviewing RAG web candidates for query %s", query)
            return candidates
        return reviewed or candidates

    def _mark_web_candidate(self, candidate: CandidateMaterial, topic: str, level: str | None) -> CandidateMaterial:
        review_data = dict(candidate.review_data or {})
        calibrated_level = self._calibrated_candidate_level(candidate, level)
        candidate.source_of_result = "web"
        candidate.is_internal = False
        candidate.is_verified = False
        candidate.review_data = {
            "format": review_data.get("format") or candidate.type,
            "level": calibrated_level,
            "material_quality_score": review_data.get("material_quality_score", round(candidate.confidence * 100)),
            "ease_of_understanding_score": review_data.get("ease_of_understanding_score", round(max(candidate.confidence - 0.1, 0.1) * 100)),
            "trust_score": review_data.get("trust_score", round(candidate.confidence * 100)),
            "retrieval_method": "web",
            "target_level": level,
        }
        candidate.reason_for_inclusion = candidate.reason_for_inclusion or f"Web fallback result for {topic}."
        candidate.score = self._combined_score(candidate)
        return candidate

    def _material_to_candidate(self, material: Material, relevance: float, retrieval_method: str) -> CandidateMaterial:
        level = self._calibrated_internal_level(material)
        quality = self._normalize(material.quality_score)
        ease = self._normalize(material.ease_score)
        trust = self._normalize(material.trust_score)
        source_of_result = self._material_source_of_result(material)
        is_internal = source_of_result == "internal"
        score = self._combined_score_values(
            relevance_score=relevance,
            quality_score=quality,
            trust_score=trust,
            ease_score=ease,
            source_bonus=self._source_bonus(material) if is_internal else 0.0,
        )
        return CandidateMaterial(
            material_id=str(material.id),
            title=material.canonical_name,
            url=material.link or self._public_file_url(material.file_path) or "",
            type=self._resource_type_for_material(material),
            source=self._source_label(material),
            snippet=material.summary or "",
            reason_for_inclusion=self._internal_reason(material, retrieval_method),
            confidence=round(trust, 3),
            score=score,
            is_verified=material.is_verified,
            is_internal=is_internal,
            source_of_result=source_of_result,
            review_data={
                "format": material.material_type.value,
                "level": level,
                "material_quality_score": round(quality * 100),
                "ease_of_understanding_score": round(ease * 100),
                "trust_score": round(trust * 100),
                "internal_material_id": str(material.id),
                "retrieval_method": retrieval_method,
            },
        )

    def _rank_candidates(self, candidates: list[CandidateMaterial]) -> list[CandidateMaterial]:
        for candidate in candidates:
            candidate.score = self._combined_score(candidate)
        return sorted(candidates, key=lambda item: (item.score or 0, item.confidence), reverse=True)

    def _balance_levels(self, candidates: list[CandidateMaterial], limit: int) -> list[CandidateMaterial]:
        by_level = self._group_by_level(candidates)
        selected: list[CandidateMaterial] = []
        seen = set()

        for level in LEVELS:
            for candidate in by_level[level][:MIN_PER_LEVEL]:
                key = self._candidate_key(candidate)
                if key not in seen:
                    selected.append(candidate)
                    seen.add(key)

        for candidate in candidates:
            if len(selected) >= limit:
                break
            key = self._candidate_key(candidate)
            if key not in seen:
                selected.append(candidate)
                seen.add(key)

        return self._rank_candidates(selected)[:limit]

    def _deduplicate(self, candidates: list[CandidateMaterial]) -> list[CandidateMaterial]:
        best_by_key: dict[str, CandidateMaterial] = {}
        for candidate in candidates:
            keys = self._candidate_keys(candidate)
            existing = next((best_by_key[key] for key in keys if key in best_by_key), None)
            if existing is None:
                for key in keys:
                    best_by_key[key] = candidate
                continue
            if (candidate.score or candidate.confidence) > (existing.score or existing.confidence):
                for key in keys:
                    best_by_key[key] = candidate
        unique: list[CandidateMaterial] = []
        seen_object_keys: set[str] = set()
        for candidate in best_by_key.values():
            object_key = self._candidate_key(candidate)
            if object_key in seen_object_keys:
                continue
            seen_object_keys.add(object_key)
            unique.append(candidate)
        return unique

    def _combined_score(self, candidate: CandidateMaterial) -> float:
        review_data = candidate.review_data or {}
        relevance = self._normalize(candidate.score if candidate.score is not None else candidate.confidence)
        quality = self._score_from_review(review_data, "material_quality_score", candidate.confidence)
        ease = self._score_from_review(review_data, "ease_of_understanding_score", 0.55)
        trust = self._score_from_review(review_data, "trust_score", candidate.confidence)
        return self._combined_score_values(
            relevance_score=relevance,
            quality_score=quality,
            trust_score=trust,
            ease_score=ease,
            source_bonus=self._candidate_source_bonus(candidate),
        )

    def _combined_score_values(
        self,
        *,
        relevance_score: float,
        quality_score: float,
        trust_score: float,
        ease_score: float,
        source_bonus: float,
    ) -> float:
        score = (
            0.35 * relevance_score
            + 0.25 * quality_score
            + 0.20 * trust_score
            + 0.15 * ease_score
            + 0.05 * source_bonus
        )
        return round(min(max(score, 0.0), 1.0), 3)

    def _relevance_score(self, material: Material, topic: str) -> float:
        tokens = self._query_tokens(topic)
        title_text = material.canonical_name.lower()
        summary_text = (material.summary or "").lower()
        tag_text = " ".join(tag.category.lower() for tag in material.tags)
        topic_text = " ".join(link.topic.title.lower() for link in material.topic_links if link.topic is not None)
        chunk_text = " ".join(chunk.chunk_text.lower()[:500] for chunk in material.chunks)

        score = (
            0.35 * self._token_overlap(tokens, title_text)
            + 0.25 * self._token_overlap(tokens, tag_text)
            + 0.20 * self._token_overlap(tokens, summary_text)
            + 0.15 * self._token_overlap(tokens, topic_text)
            + 0.05 * self._token_overlap(tokens, chunk_text)
        )
        if any(chunk.embedding is not None for chunk in material.chunks):
            score += 0.04
        return round(min(score, 1.0), 3)

    def _group_by_level(self, candidates: list[CandidateMaterial]) -> dict[str, list[CandidateMaterial]]:
        grouped: dict[str, list[CandidateMaterial]] = defaultdict(list)
        for candidate in candidates:
            level = str((candidate.review_data or {}).get("level") or self._infer_level(candidate)).lower()
            grouped[level if level in LEVELS else "intermediate"].append(candidate)
        for level in LEVELS:
            grouped[level] = self._rank_candidates(grouped[level])
        return grouped

    def _level_counts(self, candidates: list[CandidateMaterial]) -> dict[str, int]:
        grouped = self._group_by_level(candidates)
        return {level: len(grouped[level]) for level in LEVELS}

    def _coverage_source(self, candidates: list[CandidateMaterial]) -> str:
        has_internal = any(item.source_of_result == "internal" for item in candidates)
        has_web = any(item.source_of_result == "web" for item in candidates)
        if has_internal and has_web:
            return "internal_plus_web"
        if has_internal:
            return "internal_only"
        return "web_only"

    def _candidate_keys(self, candidate: CandidateMaterial) -> list[str]:
        keys: list[str] = []
        if candidate.material_id and candidate.source_of_result == "internal":
            keys.append(f"material:{candidate.material_id}")
        if candidate.url:
            keys.append(f"url:{self._normalize_url(candidate.url)}")
        keys.append(f"title:{self._normalize_title(candidate.title)}")
        keys.append(f"title-source:{self._normalize_title(candidate.title)}:{candidate.source_of_result}")
        return keys

    def _candidate_key(self, candidate: CandidateMaterial) -> str:
        return self._candidate_keys(candidate)[0]

    def _normalize_url(self, value: str) -> str:
        parsed = urlparse(value.strip())
        netloc = parsed.netloc.lower().removeprefix("www.")
        path = parsed.path.rstrip("/")
        return urlunparse(("", netloc, path, "", "", ""))

    def _normalize_title(self, value: str) -> str:
        return " ".join(self._tokenize(value))

    def _normalize(self, value: Any) -> float:
        if isinstance(value, (int, float, Decimal)):
            number = float(value)
            if number > 1:
                number = number / 100
            return min(max(number, 0.0), 1.0)
        return 0.0

    def _score_from_review(self, review_data: dict[str, Any], key: str, fallback: float) -> float:
        return self._normalize(review_data.get(key, fallback))

    def _source_bonus(self, material: Material) -> float:
        if material.source_type not in INTERNAL_SOURCE_TYPES:
            return 0.0
        bonus = SOURCE_TYPE_BONUS.get(material.source_type, 0.0)
        if material.is_verified or material.trust_level == TrustLevel.verified:
            bonus += 0.10
        if material.is_active and material.source_type in {MaterialSourceType.admin_managed, MaterialSourceType.professor_managed}:
            bonus += 0.05
        return min(bonus, 1.0)

    def _candidate_source_bonus(self, candidate: CandidateMaterial) -> float:
        if candidate.source_of_result != "internal":
            return 0.0
        bonus = 0.05
        if candidate.is_verified:
            bonus += 0.10
        return min(bonus, 1.0)

    def _retrieval_method(self, material: Material) -> str:
        return "vector" if any(chunk.embedding is not None for chunk in material.chunks) else "keyword"

    def _resource_type_for_material(self, material: Material) -> str:
        if material.material_type in {
            MaterialType.video,
            MaterialType.article,
            MaterialType.book,
            MaterialType.documentation,
            MaterialType.tutorial,
        }:
            return material.material_type.value
        return "other"

    def _source_label(self, material: Material) -> str:
        if material.link:
            return urlparse(material.link).netloc.lower().replace("www.", "") or material.source_type.value
        if material.source_type == MaterialSourceType.admin_managed:
            return "apollo admin upload"
        if material.source_type == MaterialSourceType.professor_managed:
            return "apollo professor upload"
        return material.source_type.value

    def _public_file_url(self, file_path: str | None) -> str | None:
        if not file_path:
            return None
        return f"/uploads/{file_path.rsplit('/', 1)[-1].rsplit(chr(92), 1)[-1]}"

    def _internal_reason(self, material: Material, retrieval_method: str) -> str:
        if self._material_source_of_result(material) == "web":
            return f"Cached web material matched by {retrieval_method} database retrieval; it is not an Apollo internal upload."
        if material.is_verified:
            return f"Trusted internal material matched by {retrieval_method} retrieval and verified by Apollo staff."
        if material.source_type in {MaterialSourceType.admin_managed, MaterialSourceType.professor_managed}:
            return f"Professor/admin internal material matched by {retrieval_method} retrieval."
        return f"Internal Apollo material matched by {retrieval_method} retrieval."

    def _infer_level(self, candidate: CandidateMaterial) -> str:
        text = f"{candidate.title} {candidate.snippet} {candidate.reason_for_inclusion}".lower()
        if any(token in text for token in EXPERT_SIGNALS):
            return "expert"
        if any(token in text for token in ADVANCED_SIGNALS):
            return "advanced"
        if any(token in text for token in EASY_SIGNALS):
            return "beginner"
        return "intermediate"

    def _calibrated_candidate_level(self, candidate: CandidateMaterial, target_level: str | None = None) -> str:
        review_data = candidate.review_data or {}
        inferred = self._infer_level(candidate)
        reviewed = self._level_value(review_data.get("level"))
        raw_ease = review_data.get("ease_of_understanding_score")
        ease = self._score_from_review(review_data, "ease_of_understanding_score", 0.55)
        has_review_level = review_data.get("level") in LEVELS
        text_level = inferred if inferred != "intermediate" else reviewed

        if raw_ease is not None:
            return self._level_from_ease(ease)
        if has_review_level:
            return reviewed
        if text_level == "expert" or ease < 0.35:
            return "expert"
        if text_level == "advanced" or ease < 0.55:
            return "advanced"
        if target_level == "beginner":
            return "beginner" if ease >= 0.70 and text_level in {"beginner", "intermediate"} else "intermediate"
        if ease >= 0.80 and text_level == "intermediate":
            return "beginner"
        return target_level if target_level in LEVELS else text_level

    def _level_from_ease(self, ease: float) -> str:
        if ease >= 0.85:
            return "beginner"
        if ease >= 0.55:
            return "intermediate"
        if ease >= 0.35:
            return "advanced"
        return "expert"

    def _calibrated_internal_level(self, material: Material) -> str:
        declared = self._level_value(material.difficulty)
        ease = self._normalize(material.ease_score)
        text = f"{material.canonical_name} {material.summary or ''} {' '.join(tag.category for tag in material.tags)}".lower()

        if ease < 0.35:
            return "expert"
        if any(signal in text for signal in ("research paper", "survey paper", "arxiv", "journal", "proceedings")):
            return "expert"
        if ease < 0.55:
            return "advanced" if declared in {"beginner", "intermediate"} else declared
        if any(signal in text for signal in ADVANCED_SIGNALS) and declared == "beginner":
            return "advanced"
        if declared == "beginner" and ease < 0.70:
            return "intermediate"
        if declared == "beginner" and any(signal in text for signal in EASY_SIGNALS):
            return "beginner"
        return declared

    def _material_source_of_result(self, material: Material) -> str:
        return "internal" if material.source_type in INTERNAL_SOURCE_TYPES else "db_material"

    def _level_rank(self, level: str) -> int:
        try:
            return LEVELS.index(level)
        except ValueError:
            return LEVELS.index("intermediate")

    def _level_value(self, value: Any) -> str:
        if isinstance(value, TopicLevel):
            return value.value
        text = str(value).lower()
        return text if text in LEVELS else "intermediate"

    def _token_overlap(self, tokens: list[str], haystack: str) -> float:
        if not tokens or not haystack:
            return 0.0
        return sum(1 for token in tokens if token in haystack) / len(tokens)

    def _tokenize(self, text: str) -> list[str]:
        return [token for token in "".join(char.lower() if char.isalnum() else " " for char in text).split() if token]

    def _query_tokens(self, text: str) -> list[str]:
        tokens: list[str] = []
        for token in self._tokenize(text):
            tokens.append(token)
            if len(token) > 3 and token.endswith("s"):
                tokens.append(token[:-1])
        return list(dict.fromkeys(tokens))

    def _keyword_patterns(self, text: str) -> list[str]:
        terms = [text.strip(), *self._query_tokens(text)]
        return [f"%{term}%" for term in dict.fromkeys(term for term in terms if term)]
