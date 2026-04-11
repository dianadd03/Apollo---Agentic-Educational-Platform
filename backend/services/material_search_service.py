from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from backend.agents.search_agent import SearchAgent
from backend.db.models import (
    Material,
    MaterialSourceType,
    MaterialTag,
    MaterialTopicLink,
    MaterialType,
    Topic,
    TopicLevel,
    TopicSearchResult,
    TopicSearchResultItem,
    TrustLevel,
    User,
)
from backend.schemas.search_results import CandidateMaterial, SavedSearchResultResponse, SearchMaterialsResponse, SearchMetadata
from backend.services.material_service import MaterialService

logger = logging.getLogger(__name__)

MIN_INTERNAL_RESULTS = 3
MIN_INTERNAL_SCORE = 0.55
EXTERNAL_RETURN_THRESHOLD = 0.6
MAX_EXTERNAL_PERSIST_COUNT = 5

SOURCE_TYPE_BOOST = {
    MaterialSourceType.admin_managed: 0.08,
    MaterialSourceType.professor_managed: 0.07,
    MaterialSourceType.trusted_source: 0.06,
    MaterialSourceType.agent_selected: 0.04,
    MaterialSourceType.community_internet: 0.02,
    MaterialSourceType.general_internet: 0.0,
}


class MaterialSearchService:
    def __init__(self, db: Session, search_agent: SearchAgent, default_max_results: int) -> None:
        self._db = db
        self._search_agent = search_agent
        self._default_max_results = default_max_results
        self._material_service = MaterialService(db)

    async def search_materials(
        self,
        topic: str,
        current_user: User,
        max_results: int | None = None,
    ) -> SearchMaterialsResponse:
        limit = max_results or self._default_max_results
        topic_record = self._get_or_create_topic(topic)

        internal_ranked = self._rank_internal_materials(topic, current_user.id)
        if self._has_sufficient_internal_coverage(internal_ranked, limit):
            selected = internal_ranked[:limit]
            search_result = self._save_search_result(topic_record, current_user, topic, selected, "db_internal")
            return self._build_response(topic_record, topic, selected, "db_internal", search_result.id)

        external_response = await self._search_agent.search_topic(topic=topic, max_results=limit)
        persisted_external = self._persist_external_results(topic_record, current_user, external_response.results)
        combined_ranked = self._merge_ranked_candidates(internal_ranked, persisted_external, current_user.id)
        coverage_source = "db_internal_with_web_fallback" if internal_ranked else "web_only"
        selected = combined_ranked[:limit]
        search_result = self._save_search_result(topic_record, current_user, topic, selected, coverage_source)
        return self._build_response(topic_record, external_response.query_used, selected, coverage_source, search_result.id)

    def get_saved_results_for_topic(
        self,
        topic: str,
        current_user: User,
        limit: int = 10,
    ) -> list[SavedSearchResultResponse]:
        topic_slug = self._slugify(topic)
        stmt: Select[tuple[TopicSearchResult]] = (
            select(TopicSearchResult)
            .join(Topic, Topic.id == TopicSearchResult.topic_id)
            .options(
                selectinload(TopicSearchResult.topic),
                selectinload(TopicSearchResult.items)
                .selectinload(TopicSearchResultItem.material)
                .selectinload(Material.tags),
                selectinload(TopicSearchResult.items)
                .selectinload(TopicSearchResultItem.material)
                .selectinload(Material.likes),
                selectinload(TopicSearchResult.items)
                .selectinload(TopicSearchResultItem.material)
                .selectinload(Material.topic_links)
                .selectinload(MaterialTopicLink.topic),
            )
            .where(Topic.slug == topic_slug, TopicSearchResult.user_id == current_user.id)
            .order_by(TopicSearchResult.created_at.desc())
            .limit(limit)
        )
        return [self._to_saved_search_response(item) for item in self._db.scalars(stmt).all()]

    def get_saved_result(self, search_result_id: str | UUID, current_user: User) -> SavedSearchResultResponse:
        stmt: Select[tuple[TopicSearchResult]] = (
            select(TopicSearchResult)
            .options(
                selectinload(TopicSearchResult.topic),
                selectinload(TopicSearchResult.items)
                .selectinload(TopicSearchResultItem.material)
                .selectinload(Material.tags),
                selectinload(TopicSearchResult.items)
                .selectinload(TopicSearchResultItem.material)
                .selectinload(Material.likes),
                selectinload(TopicSearchResult.items)
                .selectinload(TopicSearchResultItem.material)
                .selectinload(Material.topic_links)
                .selectinload(MaterialTopicLink.topic),
            )
            .where(TopicSearchResult.id == self._ensure_uuid(search_result_id), TopicSearchResult.user_id == current_user.id)
        )
        search_result = self._db.scalar(stmt)
        if search_result is None:
            raise ValueError("Saved search result not found.")
        return self._to_saved_search_response(search_result)

    def _rank_internal_materials(self, topic_text: str, current_user_id: UUID) -> list[dict[str, Any]]:
        ranked: list[dict[str, Any]] = []
        for material in self._load_searchable_materials():
            score = self._score_material(material, topic_text)
            if score <= 0:
                continue
            ranked.append(
                {
                    "material": material,
                    "score": score,
                    "source_of_result": self._source_of_result(material),
                    "user_id": current_user_id,
                }
            )
        ranked.sort(key=lambda item: (item["score"], self._like_count(item["material"])), reverse=True)
        return ranked

    def _persist_external_results(
        self,
        topic_record: Topic,
        current_user: User,
        external_results: list[CandidateMaterial],
    ) -> list[dict[str, Any]]:
        persisted: list[dict[str, Any]] = []
        for candidate in external_results:
            if candidate.confidence < EXTERNAL_RETURN_THRESHOLD:
                continue

            material = self._find_material_by_link(candidate.url)
            if material is None:
                material = Material(
                    topic_id=topic_record.id,
                    canonical_name=candidate.title,
                    link=candidate.url,
                    material_type=self._map_resource_type(candidate.type),
                    difficulty=self._infer_topic_difficulty(topic_record),
                    source_type=self._infer_source_type(candidate.source),
                    trust_level=TrustLevel.high if candidate.confidence >= 0.8 else TrustLevel.medium,
                    trust_score=round(candidate.confidence, 3),
                    quality_score=round(candidate.confidence, 3),
                    ease_score=0.55,
                    summary=candidate.snippet,
                    is_published=True,
                    is_active=True,
                    metadata_json={
                        "reason_for_inclusion": candidate.reason_for_inclusion,
                        "external_source": candidate.source,
                    },
                )
                self._db.add(material)
                self._db.flush()
            else:
                material.summary = material.summary or candidate.snippet
                material.trust_score = max(float(material.trust_score or 0), candidate.confidence)
                material.quality_score = max(float(material.quality_score or 0), candidate.confidence)

            self._ensure_material_topic_link(material, topic_record)
            self._ensure_material_tag(material, topic_record.title)
            persisted.append(
                {
                    "material": material,
                    "score": self._score_material(material, topic_record.title, external_confidence=candidate.confidence),
                    "source_of_result": "web",
                    "user_id": current_user.id,
                }
            )
            if len(persisted) >= MAX_EXTERNAL_PERSIST_COUNT:
                break

        self._db.commit()
        return [{**item, "material": self._load_material(item["material"].id)} for item in persisted]

    def _merge_ranked_candidates(
        self,
        internal_ranked: list[dict[str, Any]],
        external_ranked: list[dict[str, Any]],
        current_user_id: UUID,
    ) -> list[dict[str, Any]]:
        merged: list[dict[str, Any]] = []
        seen_keys: set[str] = set()
        for item in [*internal_ranked, *external_ranked]:
            material = item["material"]
            key = self._dedupe_key(material)
            if key in seen_keys:
                continue
            seen_keys.add(key)
            merged.append({**item, "user_id": current_user_id})
        merged.sort(key=lambda row: (row["score"], self._like_count(row["material"])), reverse=True)
        return merged

    def _build_response(
        self,
        topic_record: Topic,
        query_used: str,
        ranked_materials: list[dict[str, Any]],
        coverage_source: str,
        search_result_id: UUID,
    ) -> SearchMaterialsResponse:
        results = [
            self._to_candidate_material(row["material"], row["score"], row["user_id"], row["source_of_result"])
            for row in ranked_materials
        ]
        notes = "Returned from internal materials first. External retrieval was used only when internal coverage was insufficient."
        if coverage_source == "db_internal":
            notes = "Returned from internal materials database only because coverage was sufficient."
        return SearchMaterialsResponse(
            topic=topic_record.title,
            topic_id=str(topic_record.id),
            query_used=query_used,
            results=results,
            search_metadata=SearchMetadata(
                total_results=len(results),
                notes=notes,
                coverage_source=coverage_source,
                search_result_id=str(search_result_id),
            ),
        )

    def _save_search_result(
        self,
        topic_record: Topic,
        current_user: User,
        query_text: str,
        ranked_materials: list[dict[str, Any]],
        coverage_source: str,
    ) -> TopicSearchResult:
        search_result = TopicSearchResult(
            topic_id=topic_record.id,
            user_id=current_user.id,
            query_text=query_text,
            coverage_source=coverage_source,
            result_count=len(ranked_materials),
            search_session_id=f"{current_user.id}:{int(datetime.now(timezone.utc).timestamp())}",
        )
        self._db.add(search_result)
        self._db.flush()

        for index, ranked in enumerate(ranked_materials, start=1):
            self._db.add(
                TopicSearchResultItem(
                    search_result_id=search_result.id,
                    material_id=ranked["material"].id,
                    rank_position=index,
                    score_at_return_time=round(ranked["score"], 3),
                    source_of_result=ranked["source_of_result"],
                )
            )

        self._db.commit()
        self._db.refresh(search_result)
        return search_result

    def _to_saved_search_response(self, search_result: TopicSearchResult) -> SavedSearchResultResponse:
        ordered_items = sorted(search_result.items, key=lambda item: item.rank_position)
        return SavedSearchResultResponse(
            id=str(search_result.id),
            topic=search_result.topic.title,
            topic_id=str(search_result.topic_id),
            user_id=str(search_result.user_id),
            query_text=search_result.query_text,
            coverage_source=search_result.coverage_source,
            created_at=search_result.created_at,
            results=[
                self._to_candidate_material(
                    item.material,
                    float(item.score_at_return_time or 0),
                    search_result.user_id,
                    item.source_of_result,
                )
                for item in ordered_items
            ],
        )

    def _to_candidate_material(
        self,
        material: Material,
        score: float,
        current_user_id: UUID,
        source_of_result: str,
    ) -> CandidateMaterial:
        response = self._material_service.to_material_response(material, current_user_id)
        return CandidateMaterial(
            material_id=response.id,
            title=response.canonical_name,
            url=material.link or self._public_file_url(material.file_path) or "",
            type=self._resource_type_for_material(material),
            source=self._source_label(material),
            snippet=response.summary or "",
            reason_for_inclusion=self._reason_for_inclusion(material, source_of_result),
            confidence=round(min(max(float(material.trust_score or score), 0), 1), 3),
            score=round(min(max(score, 0), 1), 3),
            like_count=response.like_count,
            user_has_liked=response.user_has_liked,
            is_verified=response.is_verified,
            is_internal=source_of_result != "web",
            source_of_result=source_of_result,
        )

    def _public_file_url(self, file_path: str | None) -> str | None:
        if not file_path:
            return None
        filename = Path(file_path).name
        return f"/uploads/{filename}"

    def _load_searchable_materials(self) -> list[Material]:
        stmt: Select[tuple[Material]] = (
            select(Material)
            .options(
                selectinload(Material.tags),
                selectinload(Material.likes),
                selectinload(Material.chunks),
                selectinload(Material.topic_links).selectinload(MaterialTopicLink.topic),
            )
            .where(Material.is_active.is_(True), Material.is_published.is_(True))
        )
        return self._db.scalars(stmt).all()

    def _load_material(self, material_id: UUID) -> Material:
        stmt: Select[tuple[Material]] = (
            select(Material)
            .options(
                selectinload(Material.tags),
                selectinload(Material.likes),
                selectinload(Material.chunks),
                selectinload(Material.topic_links).selectinload(MaterialTopicLink.topic),
            )
            .where(Material.id == material_id)
        )
        material = self._db.scalar(stmt)
        if material is None:
            raise ValueError("Material not found after persistence.")
        return material

    def _score_material(
        self,
        material: Material,
        topic_text: str,
        external_confidence: float | None = None,
    ) -> float:
        tokens = self._tokenize(topic_text)
        title_text = material.canonical_name.lower()
        summary_text = (material.summary or "").lower()
        tag_text = " ".join(tag.category.lower() for tag in material.tags)
        chunk_text = " ".join(chunk.chunk_text.lower()[:500] for chunk in material.chunks)
        topic_titles = " ".join(link.topic.title.lower() for link in material.topic_links if link.topic is not None)

        relevance = self._token_overlap(tokens, f"{title_text} {summary_text}")
        tag_relevance = self._token_overlap(tokens, tag_text)
        chunk_relevance = self._token_overlap(tokens, chunk_text)
        topic_relevance = self._token_overlap(tokens, topic_titles)
        vector_similarity = self._vector_similarity_score(material)
        quality_score = float(material.quality_score or 0)
        ease_score = float(material.ease_score or 0)
        trust_score = float(material.trust_score or 0)
        verified_boost = 0.1 if material.is_verified or material.trust_level == TrustLevel.verified else 0.0
        source_boost = SOURCE_TYPE_BOOST.get(material.source_type, 0.0)
        like_boost = min(self._like_count(material), 10) / 100
        external_boost = external_confidence * 0.2 if external_confidence is not None else 0.0

        score = (
            relevance * 0.32
            + tag_relevance * 0.12
            + chunk_relevance * 0.12
            + topic_relevance * 0.15
            + vector_similarity * 0.08
            + quality_score * 0.07
            + ease_score * 0.04
            + trust_score * 0.06
            + verified_boost
            + source_boost
            + like_boost
            + external_boost
        )
        return round(min(score, 1.0), 3)

    def _vector_similarity_score(self, material: Material) -> float:
        if material.metadata_json and isinstance(material.metadata_json.get("vector_similarity"), (int, float)):
            return float(material.metadata_json["vector_similarity"])
        return 0.05 if any(chunk.embedding is not None for chunk in material.chunks) else 0.0

    def _has_sufficient_internal_coverage(self, ranked_materials: list[dict[str, Any]], limit: int) -> bool:
        strong_results = [item for item in ranked_materials[:limit] if item["score"] >= MIN_INTERNAL_SCORE]
        required_results = min(limit, MIN_INTERNAL_RESULTS)
        return len(strong_results) >= required_results

    def _get_or_create_topic(self, topic_text: str) -> Topic:
        cleaned = topic_text.strip()
        slug = self._slugify(cleaned)
        topic = self._db.scalar(select(Topic).where(Topic.slug == slug))
        if topic is None:
            topic = Topic(slug=slug, title=cleaned)
            self._db.add(topic)
            self._db.commit()
            self._db.refresh(topic)
        return topic

    def _find_material_by_link(self, link: str) -> Material | None:
        stmt: Select[tuple[Material]] = (
            select(Material)
            .options(
                selectinload(Material.tags),
                selectinload(Material.likes),
                selectinload(Material.chunks),
                selectinload(Material.topic_links).selectinload(MaterialTopicLink.topic),
            )
            .where(Material.link == link)
        )
        return self._db.scalar(stmt)

    def _ensure_material_topic_link(self, material: Material, topic_record: Topic) -> None:
        if any(link.topic_id == topic_record.id for link in material.topic_links):
            return
        material.topic_id = material.topic_id or topic_record.id
        material.topic_links.append(MaterialTopicLink(material_id=material.id, topic_id=topic_record.id, topic=topic_record))

    def _ensure_material_tag(self, material: Material, topic_title: str) -> None:
        normalized = topic_title.strip().lower()
        if any(tag.category.lower() == normalized for tag in material.tags):
            return
        material.tags.append(MaterialTag(material_id=material.id, category=topic_title, relevance=1.0))

    def _source_of_result(self, material: Material) -> str:
        if material.is_verified:
            return "verified"
        if material.source_type == MaterialSourceType.admin_managed:
            return "admin"
        if material.source_type == MaterialSourceType.professor_managed:
            return "professor"
        if self._like_count(material) >= 5:
            return "promoted"
        return "db_internal"

    def _source_label(self, material: Material) -> str:
        if material.link:
            return urlparse(material.link).netloc.lower().replace("www.", "") or material.source_type.value
        if material.source_type == MaterialSourceType.admin_managed:
            return "apollo admin upload"
        if material.source_type == MaterialSourceType.professor_managed:
            return "apollo professor upload"
        return material.source_type.value

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

    def _reason_for_inclusion(self, material: Material, source_of_result: str) -> str:
        if source_of_result == "web":
            return "Saved external result for future reuse after fallback retrieval because it remained strong after ranking."
        if material.is_verified:
            return "Verified internal material ranked highly for this topic based on relevance, trust, and engagement."
        return "Internal material ranked using topic relevance, tags, quality, ease, source trust, and likes."

    def _map_resource_type(self, resource_type: str) -> MaterialType:
        mapping = {
            "video": MaterialType.video,
            "article": MaterialType.article,
            "book": MaterialType.book,
            "documentation": MaterialType.documentation,
            "tutorial": MaterialType.tutorial,
        }
        return mapping.get(resource_type, MaterialType.other)

    def _infer_source_type(self, source: str) -> MaterialSourceType:
        source = source.lower()
        if source.endswith(".edu") or source in {"developer.mozilla.org", "docs.python.org", "learn.microsoft.com"}:
            return MaterialSourceType.trusted_source
        if any(keyword in source for keyword in ("youtube", "coursera", "edx", "khanacademy", "freecodecamp")):
            return MaterialSourceType.community_internet
        return MaterialSourceType.general_internet

    def _infer_topic_difficulty(self, topic: Topic) -> TopicLevel:
        title = topic.title.lower()
        if any(keyword in title for keyword in ("advanced", "distributed", "compiler", "optimization")):
            return TopicLevel.advanced
        if any(keyword in title for keyword in ("introduction", "basic", "beginner")):
            return TopicLevel.beginner
        return TopicLevel.intermediate

    def _token_overlap(self, tokens: list[str], haystack: str) -> float:
        if not tokens or not haystack:
            return 0.0
        matches = sum(1 for token in tokens if token in haystack)
        return matches / len(tokens)

    def _tokenize(self, text: str) -> list[str]:
        return [token for token in "".join(char.lower() if char.isalnum() else " " for char in text).split() if token]

    def _like_count(self, material: Material) -> int:
        return len(material.likes)

    def _dedupe_key(self, material: Material) -> str:
        if material.link:
            parsed = urlparse(material.link)
            return f"{parsed.netloc.lower().replace('www.', '')}{parsed.path.rstrip('/')}"
        return material.canonical_name.lower()

    def _ensure_uuid(self, value: str | UUID) -> UUID:
        return value if isinstance(value, UUID) else UUID(value)

    def _slugify(self, value: str) -> str:
        return "-".join(part for part in "".join(char.lower() if char.isalnum() else "-" for char in value).split("-") if part)
