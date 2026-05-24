import asyncio
from decimal import Decimal
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from backend.agents.rag_retrieval_agent import RagRetrievalAgent
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


class FakeDb:
    def __init__(self, materials: list[Material] | None = None) -> None:
        self.materials = materials or []

    def scalars(self, stmt):
        return SimpleNamespace(unique=lambda: SimpleNamespace(all=lambda: self.materials))


class FakeReviewSearch:
    def __init__(self, results_by_query: dict[str, list[CandidateMaterial]] | None = None) -> None:
        self.results_by_query = results_by_query or {}
        self.calls: list[tuple[str, int]] = []

    async def search_topic(self, topic: str, max_results: int) -> SearchMaterialsResponse:
        self.calls.append((topic, max_results))
        results = list(self.results_by_query.get(topic, []))[:max_results]
        if not results:
            level = "intermediate"
            for candidate_level in ("beginner", "advanced", "expert"):
                if candidate_level in topic:
                    level = candidate_level
            results = [
                web_candidate(f"{topic} result {index}", f"https://web.example.com/{topic.replace(' ', '-')}/{index}", level)
                for index in range(max_results)
            ]
        return SearchMaterialsResponse(
            topic=topic,
            query_used=topic,
            results=results,
            search_metadata=SearchMetadata(total_results=len(results), coverage_source="web_only"),
        )


class ReviewingReviewSearch(FakeReviewSearch):
    def __init__(self, results_by_query: dict[str, list[CandidateMaterial]] | None = None) -> None:
        super().__init__(results_by_query)
        self.review_calls: list[tuple[str, int]] = []

    def _review_candidates(self, topic: str, candidates: list[CandidateMaterial]) -> list[CandidateMaterial]:
        self.review_calls.append((topic, len(candidates)))
        reviewed: list[CandidateMaterial] = []
        for candidate in candidates:
            review_data = dict(candidate.review_data or {})
            review_data.update(
                {
                    "format": candidate.type,
                    "level": "intermediate",
                    "material_quality_score": 77,
                    "ease_of_understanding_score": 68,
                    "trust_score": 72,
                }
            )
            reviewed.append(candidate.model_copy(update={"review_data": review_data, "confidence": 0.72, "score": 0.72}))
        return reviewed


def make_topic(title: str = "Graphs") -> Topic:
    return Topic(id=uuid4(), slug=title.lower(), title=title, created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))


def make_material(
    title: str,
    level: TopicLevel,
    *,
    source_type: MaterialSourceType = MaterialSourceType.professor_managed,
    verified: bool = True,
    link: str | None = None,
    quality: float = 0.8,
    ease: float = 0.75,
    trust: float = 0.85,
    summary: str | None = None,
    material_type: MaterialType = MaterialType.article,
) -> Material:
    topic = make_topic()
    material = Material(
        id=uuid4(),
        topic_id=topic.id,
        canonical_name=title,
        link=link or f"https://apollo.example.com/{title.lower().replace(' ', '-')}",
        material_type=material_type,
        difficulty=level,
        source_type=source_type,
        trust_level=TrustLevel.verified if verified else TrustLevel.high,
        trust_score=trust,
        quality_score=quality,
        ease_score=ease,
        summary=summary or f"{title} covers Graphs with examples.",
        is_published=True,
        is_active=True,
        is_verified=verified,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    material.tags = [MaterialTag(category="Graphs", relevance=1.0)]
    material.chunks = []
    material.topic_links = [MaterialTopicLink(material_id=material.id, topic_id=topic.id, topic=topic)]
    return material


def web_candidate(title: str, url: str, level: str = "beginner", confidence: float = 0.8) -> CandidateMaterial:
    return CandidateMaterial(
        title=title,
        url=url,
        type="article",
        source="web.example.com",
        snippet="Web fallback material",
        reason_for_inclusion="Selected by web fallback",
        confidence=confidence,
        score=confidence,
        source_of_result="web",
        review_data={
            "format": "article",
            "level": level,
            "material_quality_score": round(confidence * 100),
            "ease_of_understanding_score": 70,
            "trust_score": round(confidence * 100),
        },
    )


def run_search(agent: RagRetrievalAgent, topic: str = "Graphs", max_results: int = 28):
    return asyncio.run(agent.search(topic, max_results=max_results))


def test_internal_only_retrieval_returns_balanced_schema_when_coverage_is_complete():
    materials = [
        make_material(f"{level.value} Graphs {index}", level)
        for level in TopicLevel
        for index in range(7)
    ]
    web = FakeReviewSearch()
    response = run_search(RagRetrievalAgent(FakeDb(materials), web))

    assert response.search_metadata.coverage_source == "internal_only"
    assert len(response.results) == 28
    assert web.calls == []
    assert all(item.source_of_result == "internal" for item in response.results)
    assert all(item.review_data and item.review_data["retrieval_method"] == "keyword" for item in response.results)


def test_fewer_than_twenty_internal_results_triggers_web_fallback():
    materials = [make_material(f"Internal Graphs {index}", TopicLevel.beginner) for index in range(10)]
    web = FakeReviewSearch()
    response = run_search(RagRetrievalAgent(FakeDb(materials), web))

    assert response.search_metadata.coverage_source == "internal_plus_web"
    assert web.calls
    assert any(item.source_of_result == "web" for item in response.results)


def test_level_shortage_triggers_web_fallback_once():
    materials = [make_material(f"Beginner Graphs {index}", TopicLevel.beginner) for index in range(21)]
    web = FakeReviewSearch()
    response = run_search(RagRetrievalAgent(FakeDb(materials), web))

    called_queries = [query for query, _ in web.calls]
    assert called_queries == ["Graphs"]
    assert response.search_metadata.coverage_source == "internal_plus_web"


def test_deduplication_prefers_higher_scored_duplicate():
    internal = make_material("Graphs Duplicate", TopicLevel.beginner, link="https://example.com/graphs")
    web = FakeReviewSearch(
        {
            "Graphs intermediate guide": [
                web_candidate("Graphs Duplicate", "https://example.com/graphs/", "intermediate", confidence=0.6)
            ],
            "Graphs advanced course": [],
            "Graphs expert research paper": [],
        }
    )
    response = run_search(RagRetrievalAgent(FakeDb([internal]), web), max_results=10)

    duplicate_titles = [item for item in response.results if item.title == "Graphs Duplicate"]
    assert len(duplicate_titles) == 1
    assert duplicate_titles[0].source_of_result == "internal"


def test_ranking_prefers_verified_internal_materials():
    general = make_material(
        "Graphs General",
        TopicLevel.beginner,
        source_type=MaterialSourceType.general_internet,
        verified=False,
        quality=0.6,
        trust=0.55,
    )
    verified = make_material("Graphs Verified", TopicLevel.beginner, verified=True, quality=0.9, trust=0.95)
    agent = RagRetrievalAgent(FakeDb([general, verified]), FakeReviewSearch())

    candidates = asyncio.run(agent.search_internal_materials(FakeDb([general, verified]), "Graphs"))

    assert candidates[0].title == "Graphs Verified"
    assert 0 <= (candidates[0].score or 0) <= 1


def test_beginner_web_fallback_does_not_force_hard_material_into_beginner_level():
    hard_result = web_candidate(
        "Advanced Graph Theory Research Paper",
        "https://web.example.com/advanced-graph-theory-paper",
        level="beginner",
        confidence=0.86,
    )
    hard_result.snippet = "A research paper with proofs, theorems, and graduate-level optimization."
    hard_result.review_data = {
        "format": "article",
        "level": "beginner",
        "material_quality_score": 86,
        "ease_of_understanding_score": 28,
        "trust_score": 86,
    }
    web = FakeReviewSearch({"Graphs": [hard_result]})

    response = run_search(RagRetrievalAgent(FakeDb([]), web), max_results=28)

    reviewed_levels = {item.title: item.review_data["level"] for item in response.results if item.review_data}
    assert reviewed_levels["Advanced Graph Theory Research Paper"] == "expert"


def test_beginner_internal_material_with_low_ease_is_reclassified():
    material = make_material(
        "Graphs Basics With Formal Proofs",
        TopicLevel.beginner,
        ease=0.32,
        summary="Beginner label but proof-heavy theorem treatment for graph algorithms.",
    )
    agent = RagRetrievalAgent(FakeDb([material]), FakeReviewSearch())

    candidates = asyncio.run(agent.search_internal_materials(FakeDb([material]), "Graphs"))

    assert candidates[0].review_data["level"] == "expert"


def test_intermediate_book_with_proof_language_stays_intermediate_when_ease_is_ok():
    material = make_material(
        "Graph Theory Textbook",
        TopicLevel.intermediate,
        ease=0.72,
        summary="A textbook chapter with some proofs and theorem examples explained step by step.",
        material_type=MaterialType.book,
    )
    agent = RagRetrievalAgent(FakeDb([material]), FakeReviewSearch())

    candidates = asyncio.run(agent.search_internal_materials(FakeDb([material]), "Graphs"))

    assert candidates[0].review_data["level"] == "intermediate"


def test_decimal_db_scores_are_preserved_for_level_and_review_data():
    material = make_material(
        "Intermediate Graphs Book",
        TopicLevel.intermediate,
        quality=Decimal("0.820"),
        ease=Decimal("0.760"),
        trust=Decimal("0.880"),
        material_type=MaterialType.book,
    )
    agent = RagRetrievalAgent(FakeDb([material]), FakeReviewSearch())

    candidates = asyncio.run(agent.search_internal_materials(FakeDb([material]), "Graphs"))

    assert candidates[0].review_data["level"] == "intermediate"
    assert candidates[0].review_data["material_quality_score"] == 82
    assert candidates[0].review_data["ease_of_understanding_score"] == 76
    assert candidates[0].review_data["trust_score"] == 88


def test_cached_web_material_from_database_is_marked_as_database_material():
    material = make_material(
        "Cached Web Graphs Guide",
        TopicLevel.beginner,
        source_type=MaterialSourceType.general_internet,
        verified=False,
        link="https://external.example.com/graphs-guide",
    )
    agent = RagRetrievalAgent(FakeDb([material]), FakeReviewSearch())

    candidates = asyncio.run(agent.search_internal_materials(FakeDb([material]), "Graphs"))

    assert candidates[0].source_of_result == "db_material"
    assert candidates[0].is_internal is False


def test_rag_web_fallback_uses_review_agent_output_for_level_and_scores():
    raw_result = web_candidate(
        "Graphs Learning Guide",
        "https://web.example.com/reviewed-graphs",
        level="expert",
        confidence=0.91,
    )
    web = ReviewingReviewSearch({"Graphs": [raw_result]})
    materials = [make_material(f"{level.value} Graphs {index}", level) for level in (TopicLevel.beginner, TopicLevel.intermediate, TopicLevel.advanced) for index in range(7)]

    response = run_search(RagRetrievalAgent(FakeDb(materials), web), max_results=28)
    reviewed = next(item for item in response.results if item.url == "https://web.example.com/reviewed-graphs")

    assert web.review_calls
    assert reviewed.review_data["level"] == "intermediate"
    assert reviewed.review_data["material_quality_score"] == 77
    assert reviewed.review_data["ease_of_understanding_score"] == 68


def test_reviewed_video_with_high_ease_is_not_put_in_expert_tab():
    candidate = web_candidate(
        "Expert Query Video Tutorial",
        "https://youtube.com/watch?v=graphs",
        level="expert",
        confidence=0.88,
    )
    candidate.type = "video"
    candidate.review_data = {
        "format": "video",
        "level": "expert",
        "material_quality_score": 82,
        "ease_of_understanding_score": 88,
        "trust_score": 80,
    }
    agent = RagRetrievalAgent(FakeDb([]), FakeReviewSearch())

    marked = agent._mark_web_candidate(candidate, "Graphs", "expert")

    assert marked.review_data["level"] == "beginner"
