import asyncio

import pytest

from backend.services.review_search_adapter import ReviewSearchAdapter


class FakeReviewAgent:
    def __init__(self, reviews):
        self.reviews = reviews
        self.calls: list[tuple[str, bool]] = []

    def review(self, topic: str, advanced: bool = False):
        self.calls.append((topic, advanced))
        return self.reviews


def test_search_topic_maps_review_agent_json_to_candidates():
    agent = FakeReviewAgent(
        [
            {
                "title": "Graphs Video",
                "url": "https://youtube.com/watch?v=graphs",
                "kind": "youtube",
                "source": "youtube.com",
                "snippet": "Visual graph walkthrough.",
                "reason_for_inclusion": "Clear beginner walkthrough.",
                "material_quality_score": 91,
                "ease_of_understanding_score": 88,
                "level": "beginner",
            },
            {
                "title": "Graphs Paper",
                "url": "https://example.edu/graphs.pdf",
                "kind": "paper",
                "material_quality_score": 73.6,
                "ease_of_understanding_score": 30,
            },
            "ignore malformed item",
        ]
    )
    adapter = ReviewSearchAdapter(review_agent=agent, advanced_search=False)

    response = asyncio.run(adapter.search_topic("Graphs", max_results=5))

    assert agent.calls == [("Graphs", False)]
    assert response.topic == "Graphs"
    assert response.search_metadata.coverage_source == "web_only"
    assert [item.title for item in response.results] == ["Graphs Video", "Graphs Paper"]
    assert response.results[0].type == "video"
    assert response.results[0].source_of_result == "web"
    assert response.results[0].review_data["kind"] == "youtube"
    assert response.results[1].type == "other"
    assert response.results[1].source == "example.edu"
    assert response.results[1].review_data["material_quality_score"] == 74
    assert response.results[1].review_data["level"] == "expert"


def test_search_topic_sorts_by_quality_and_respects_max_results():
    agent = FakeReviewAgent(
        [
            {"title": "Low", "url": "https://low.example", "material_quality_score": 20},
            {"title": "High", "url": "https://high.example", "material_quality_score": 95},
            {"title": "Middle", "url": "https://middle.example", "material_quality_score": 65},
        ]
    )
    adapter = ReviewSearchAdapter(review_agent=agent, advanced_search=True)

    response = asyncio.run(adapter.search_topic("Dynamic Programming", max_results=2))

    assert agent.calls == [("Dynamic Programming", True)]
    assert [item.title for item in response.results] == ["High", "Middle"]
    assert response.search_metadata.total_results == 2


def test_review_scores_are_bounded_and_defaults_are_stable():
    agent = FakeReviewAgent(
        [
            {
                "title": "Unbounded",
                "url": "https://example.com/unbounded",
                "kind": "website",
                "material_quality_score": 140,
                "ease_of_understanding_score": -5,
            },
            {
                "title": "Missing Scores",
                "url": "",
                "kind": None,
            },
        ]
    )
    adapter = ReviewSearchAdapter(review_agent=agent)

    response = asyncio.run(adapter.search_topic("Sorting", max_results=10))

    assert response.results[0].confidence == 1.0
    assert response.results[0].type == "documentation"
    assert response.results[0].review_data["material_quality_score"] == 100
    assert response.results[0].review_data["ease_of_understanding_score"] == 0
    assert response.results[0].review_data["level"] == "expert"
    assert response.results[1].confidence == 0.7
    assert response.results[1].type == "other"
    assert response.results[1].source == "web"


def test_search_topic_propagates_timeout(monkeypatch):
    class SlowReviewAgent:
        def review(self, topic: str, advanced: bool = False):
            del topic, advanced
            import time

            time.sleep(0.05)
            return []

    monkeypatch.setattr("backend.services.review_search_adapter.REVIEW_SEARCH_TIMEOUT_SECONDS", 0.001)
    adapter = ReviewSearchAdapter(review_agent=SlowReviewAgent())

    with pytest.raises(TimeoutError):
        asyncio.run(adapter.search_topic("Graphs", max_results=5))


def test_search_topic_returns_empty_response_when_review_agent_import_fails():
    def broken_factory():
        raise ImportError("cannot import name 'create_agent' from 'langchain.agents'")

    adapter = ReviewSearchAdapter(review_agent_factory=broken_factory)

    response = asyncio.run(adapter.search_topic("Graphs", max_results=5))

    assert response.topic == "Graphs"
    assert response.results == []
    assert response.search_metadata.total_results == 0
    assert response.search_metadata.notes == "ReviewAgent is unavailable, so web fallback returned no results."
