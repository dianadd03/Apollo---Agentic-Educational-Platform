import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

from backend.db.models import (
    Material,
    MaterialLike,
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
    UserRole,
)
from backend.schemas.search_results import CandidateMaterial, SearchMaterialsResponse, SearchMetadata
from backend.services.material_search_service import MaterialSearchService


class FakeSearchAgent:
    def __init__(self, response: SearchMaterialsResponse) -> None:
        self.response = response
        self.calls = 0

    async def search_topic(self, topic: str, max_results: int) -> SearchMaterialsResponse:
        self.calls += 1
        return self.response


class SearchServiceHarness(MaterialSearchService):
    def __init__(self, internal_ranked, external_ranked, search_agent, topic_record, db=None) -> None:
        super().__init__(db=db or MagicMock(), search_agent=search_agent, default_max_results=5)
        self.internal_ranked = internal_ranked
        self.external_ranked = external_ranked
        self.topic_record = topic_record
        self.saved_calls = []
        self.saved_result = TopicSearchResult(
            id=uuid4(),
            topic_id=topic_record.id,
            user_id=uuid4(),
            query_text=topic_record.title,
            coverage_source="db_internal",
            result_count=0,
            created_at=datetime.now(timezone.utc),
            items=[],
            topic=topic_record,
        )

    def _get_or_create_topic(self, topic_text: str) -> Topic:
        return self.topic_record

    def _rank_internal_materials(self, topic_text: str, current_user_id):
        return self.internal_ranked

    def _persist_external_results(self, topic_record, current_user, external_results):
        return self.external_ranked

    def _save_search_result(self, topic_record, current_user, query_text, ranked_materials, coverage_source):
        self.saved_calls.append(
            {
                "topic": topic_record.title,
                "query_text": query_text,
                "coverage_source": coverage_source,
                "material_ids": [str(item["material"].id) for item in ranked_materials],
            }
        )
        self.saved_result.id = uuid4()
        self.saved_result.topic_id = topic_record.id
        self.saved_result.user_id = current_user.id
        self.saved_result.query_text = query_text
        self.saved_result.coverage_source = coverage_source
        self.saved_result.result_count = len(ranked_materials)
        return self.saved_result


def make_user() -> User:
    return User(
        id=uuid4(),
        email="student@apollo.dev",
        password_hash="hash",
        full_name="Student",
        role=UserRole.student,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def make_topic(title: str = "Dynamic Programming") -> Topic:
    return Topic(id=uuid4(), slug="dynamic-programming", title=title, created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))


def make_material(
    name: str,
    *,
    source_type: MaterialSourceType = MaterialSourceType.general_internet,
    trust_score: float = 0.7,
    quality_score: float = 0.6,
    ease_score: float = 0.5,
    verified: bool = False,
    likes: int = 0,
    topic_title: str = "Dynamic Programming",
    tags: list[str] | None = None,
    link: str | None = None,
) -> Material:
    topic = make_topic(topic_title)
    material = Material(
        id=uuid4(),
        topic_id=topic.id,
        canonical_name=name,
        link=link or f"https://example.com/{name.lower().replace(' ', '-')}",
        material_type=MaterialType.article,
        difficulty=TopicLevel.intermediate,
        source_type=source_type,
        trust_level=TrustLevel.verified if verified else TrustLevel.high,
        trust_score=trust_score,
        quality_score=quality_score,
        ease_score=ease_score,
        summary=f"{name} summary for {topic_title}",
        is_published=True,
        is_active=True,
        is_verified=verified,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    material.tags = [MaterialTag(category=tag, relevance=1.0) for tag in (tags or [topic_title])]
    material.likes = [MaterialLike(material_id=material.id, user_id=uuid4()) for _ in range(likes)]
    material.chunks = []
    material.topic_links = [MaterialTopicLink(material_id=material.id, topic_id=topic.id, topic=topic)]
    return material


def ranked_entry(material: Material, score: float, source_of_result: str = "db_internal") -> dict:
    return {"material": material, "score": score, "source_of_result": source_of_result, "user_id": uuid4()}


def test_db_first_retrieval_skips_external_when_internal_coverage_is_sufficient():
    topic = make_topic()
    strong_materials = [
        ranked_entry(
            make_material(
                f"Internal {index}",
                verified=index == 0,
                likes=6 - index,
                source_type=MaterialSourceType.professor_managed,
            ),
            0.82 - (index * 0.03),
        )
        for index in range(3)
    ]
    agent = FakeSearchAgent(
        SearchMaterialsResponse(topic=topic.title, topic_id=str(topic.id), query_used=topic.title, results=[], search_metadata=SearchMetadata(total_results=0))
    )
    service = SearchServiceHarness(strong_materials, [], agent, topic)

    response = asyncio.run(service.search_materials(topic.title, make_user(), max_results=5))

    assert response.search_metadata.coverage_source == "db_internal"
    assert agent.calls == 0
    assert len(response.results) == 3
    assert service.saved_calls[0]["coverage_source"] == "db_internal"
    assert service.saved_calls[0]["material_ids"] == [str(item["material"].id) for item in strong_materials]


def test_external_fallback_only_runs_when_internal_coverage_is_insufficient():
    topic = make_topic()
    weak_internal = [ranked_entry(make_material("Weak internal"), 0.41)]
    external_material = ranked_entry(make_material("External strong", link="https://docs.example.org/dp"), 0.78, "web")
    agent = FakeSearchAgent(
        SearchMaterialsResponse(
            topic=topic.title,
            topic_id=str(topic.id),
            query_used=f"{topic.title} tutorial",
            results=[
                CandidateMaterial(
                    title="External strong",
                    url="https://docs.example.org/dp",
                    type="documentation",
                    source="docs.example.org",
                    snippet="Strong fallback result",
                    reason_for_inclusion="Fallback result",
                    confidence=0.84,
                )
            ],
            search_metadata=SearchMetadata(total_results=1),
        )
    )
    service = SearchServiceHarness(weak_internal, [external_material], agent, topic)

    response = asyncio.run(service.search_materials(topic.title, make_user(), max_results=5))

    assert response.search_metadata.coverage_source == "db_internal_with_web_fallback"
    assert agent.calls == 1
    assert any(item.source_of_result == "web" for item in response.results)
    assert service.saved_calls[0]["coverage_source"] == "db_internal_with_web_fallback"


def test_persist_external_results_only_saves_strong_candidates():
    topic = make_topic()
    db = MagicMock()
    agent = FakeSearchAgent(SearchMaterialsResponse(topic=topic.title, topic_id=str(topic.id), query_used=topic.title, results=[], search_metadata=SearchMetadata(total_results=0)))
    service = MaterialSearchService(db=db, search_agent=agent, default_max_results=5)
    service._load_material = lambda material_id: db.add.call_args_list[-1].args[0]
    service._find_material_by_link = lambda link: None

    current_user = make_user()
    persisted = service._persist_external_results(
        topic,
        current_user,
        [
            CandidateMaterial(
                title="Strong external",
                url="https://strong.example.com/dp",
                type="article",
                source="strong.example.com",
                snippet="Useful explanation",
                reason_for_inclusion="Strong",
                confidence=0.81,
            ),
            CandidateMaterial(
                title="Weak external",
                url="https://weak.example.com/dp",
                type="article",
                source="weak.example.com",
                snippet="Weak explanation",
                reason_for_inclusion="Weak",
                confidence=0.32,
            ),
        ],
    )

    assert len(persisted) == 1
    assert persisted[0]["material"].canonical_name == "Strong external"


def test_loading_saved_topic_results_preserves_ordering():
    topic = make_topic()
    material_b = make_material("Second item", likes=2)
    material_a = make_material("First item", verified=True, likes=8, source_type=MaterialSourceType.professor_managed)
    search_result = TopicSearchResult(
        id=uuid4(),
        topic_id=topic.id,
        user_id=uuid4(),
        query_text=topic.title,
        coverage_source="db_internal",
        result_count=2,
        created_at=datetime.now(timezone.utc),
        topic=topic,
        items=[
            TopicSearchResultItem(material=material_b, rank_position=2, score_at_return_time=0.73, source_of_result="db_internal"),
            TopicSearchResultItem(material=material_a, rank_position=1, score_at_return_time=0.91, source_of_result="verified"),
        ],
    )
    db = MagicMock()
    db.scalars.return_value = SimpleNamespace(all=lambda: [search_result])
    agent = FakeSearchAgent(SearchMaterialsResponse(topic=topic.title, topic_id=str(topic.id), query_used=topic.title, results=[], search_metadata=SearchMetadata(total_results=0)))
    service = MaterialSearchService(db=db, search_agent=agent, default_max_results=5)

    history = service.get_saved_results_for_topic(topic.title, make_user())

    assert len(history) == 1
    assert [item.title for item in history[0].results] == ["First item", "Second item"]


def test_verified_professor_materials_rank_ahead_of_general_materials():
    topic_text = "Dynamic Programming"
    db = MagicMock()
    agent = FakeSearchAgent(SearchMaterialsResponse(topic=topic_text, query_used=topic_text, results=[], search_metadata=SearchMetadata(total_results=0)))
    service = MaterialSearchService(db=db, search_agent=agent, default_max_results=5)

    general = make_material("Dynamic Programming Notes", source_type=MaterialSourceType.general_internet, verified=False, likes=0)
    professor_verified = make_material(
        "Dynamic Programming Notes",
        source_type=MaterialSourceType.professor_managed,
        verified=True,
        likes=7,
    )

    general_score = service._score_material(general, topic_text)
    professor_score = service._score_material(professor_verified, topic_text)

    assert professor_score > general_score
