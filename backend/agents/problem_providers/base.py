from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from backend.db.models import ProblemSource, TopicLevel


@dataclass
class ProblemDTO:
    source: ProblemSource
    external_id: str
    title: str
    url: str
    raw_difficulty: str | None
    normalized_difficulty: int  # 1..10
    difficulty_label: TopicLevel
    success_rate: float | None  # 0..1
    tags: list[str] = field(default_factory=list)
    is_generated: bool = False
    generated_objective: str | None = None


class ProblemProvider(Protocol):
    source: ProblemSource

    async def fetch_problems_for_tags(
        self, tags: list[str], limit: int
    ) -> list[ProblemDTO]:
        ...
