import asyncio
from datetime import datetime, timedelta, timezone

import pytest

from backend.agents.problem_aggregator import ProblemAggregatorAgent
from backend.agents.problem_providers.base import ProblemDTO
from backend.db.models import ProblemSource, TopicLevel


class FakeProvider:
    def __init__(self, source: ProblemSource, dtos: list[ProblemDTO], should_fail: bool = False):
        self.source = source
        self._dtos = dtos
        self._should_fail = should_fail
        self.received_tags: list[str] = []
        self.received_limit: int | None = None

    async def fetch_problems_for_tags(self, tags, limit):
        self.received_tags = list(tags)
        self.received_limit = limit
        if self._should_fail:
            raise RuntimeError("provider failed")
        return list(self._dtos)


def _dto(source: ProblemSource, ext: str, score: int = 5, generated: bool = False) -> ProblemDTO:
    label = TopicLevel.beginner if score <= 3 else TopicLevel.intermediate if score <= 6 else TopicLevel.advanced
    return ProblemDTO(
        source=source,
        external_id=ext,
        title=f"Problem {ext}",
        url=f"https://example.com/{source.value}/{ext}",
        raw_difficulty=str(score),
        normalized_difficulty=score,
        difficulty_label=label,
        success_rate=None,
        tags=["dp"],
        is_generated=generated,
    )


@pytest.mark.asyncio
async def test_aggregate_combines_providers_and_dedups():
    p1 = FakeProvider(ProblemSource.codeforces, [_dto(ProblemSource.codeforces, "1A"), _dto(ProblemSource.codeforces, "2B")])
    p2 = FakeProvider(ProblemSource.atcoder, [_dto(ProblemSource.atcoder, "abc1_a")])
    agent = ProblemAggregatorAgent(providers=[p1, p2])

    result = await agent.aggregate_for_topic("dynamic programming")

    assert len(result.problems) == 3
    assert result.source_breakdown == {"codeforces": 2, "atcoder": 1}
    assert "dp" in result.tags_used


@pytest.mark.asyncio
async def test_aggregate_handles_provider_failure_gracefully():
    failing = FakeProvider(ProblemSource.codeforces, [], should_fail=True)
    healthy = FakeProvider(ProblemSource.atcoder, [_dto(ProblemSource.atcoder, "abc2_b")])
    agent = ProblemAggregatorAgent(providers=[failing, healthy])

    result = await agent.aggregate_for_topic("graphs")

    assert len(result.problems) == 1
    assert result.source_breakdown["codeforces"] == 0
    assert result.source_breakdown["atcoder"] == 1


@pytest.mark.asyncio
async def test_aggregate_returns_empty_when_no_tags_known():
    p1 = FakeProvider(ProblemSource.codeforces, [_dto(ProblemSource.codeforces, "1A")])
    agent = ProblemAggregatorAgent(providers=[p1])

    result = await agent.aggregate_for_topic("")

    assert result.problems == []
    assert p1.received_tags == []


@pytest.mark.asyncio
async def test_aggregate_dedups_by_url():
    same_url_a = _dto(ProblemSource.codeforces, "1A")
    same_url_b = _dto(ProblemSource.codeforces, "1A")  # identical
    p1 = FakeProvider(ProblemSource.codeforces, [same_url_a, same_url_b])
    agent = ProblemAggregatorAgent(providers=[p1])

    result = await agent.aggregate_for_topic("dp")
    assert len(result.problems) == 1


@pytest.mark.asyncio
async def test_ranking_prefers_target_level():
    easy = _dto(ProblemSource.codeforces, "easy", score=2)
    mid = _dto(ProblemSource.codeforces, "mid", score=5)
    hard = _dto(ProblemSource.codeforces, "hard", score=9)
    p1 = FakeProvider(ProblemSource.codeforces, [hard, easy, mid])
    agent = ProblemAggregatorAgent(providers=[p1])

    result = await agent.aggregate_for_topic("dp", level=TopicLevel.beginner)

    assert result.problems[0].external_id == "easy"


@pytest.mark.asyncio
async def test_general_generator_triggered_below_threshold():
    p1 = FakeProvider(ProblemSource.codeforces, [_dto(ProblemSource.codeforces, "only-one")])
    generated = _dto(ProblemSource.generated, "g1", generated=True)

    async def fake_generator(topic, level, count):
        return [generated]

    agent = ProblemAggregatorAgent(
        providers=[p1],
        general_threshold=5,
        general_generator=fake_generator,
    )

    result = await agent.aggregate_for_topic("dp")
    sources = [p.source for p in result.problems]
    assert ProblemSource.generated in sources
    assert result.source_breakdown.get("generated", 0) >= 1


def test_cache_freshness_helper():
    fresh = datetime.now(timezone.utc) - timedelta(hours=1)
    stale = datetime.now(timezone.utc) - timedelta(hours=48)
    assert ProblemAggregatorAgent.is_cache_fresh(fresh, ttl_hours=24) is True
    assert ProblemAggregatorAgent.is_cache_fresh(stale, ttl_hours=24) is False
    assert ProblemAggregatorAgent.is_cache_fresh(None, ttl_hours=24) is False
