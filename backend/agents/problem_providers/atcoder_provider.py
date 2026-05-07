"""AtCoder provider — uses public JSON dumps from kenkoooo.com (community archive).

Endpoints:
- https://kenkoooo.com/atcoder/resources/problems.json (id, contest_id, title)
- https://kenkoooo.com/atcoder/resources/problem-models.json (id -> {difficulty, ...})

There is no native tag system on AtCoder, so tag-based filtering is best-effort:
matching is performed against the title text.
"""

from __future__ import annotations

import logging
import re
from typing import Any

import httpx

from backend.agents.problem_providers.base import ProblemDTO
from backend.agents.problem_providers.difficulty_normalizer import (
    difficulty_to_label,
    normalize_atcoder,
)
from backend.db.models import ProblemSource

logger = logging.getLogger(__name__)

ATCODER_PROBLEMS_URL = "https://kenkoooo.com/atcoder/resources/problems.json"
ATCODER_MODELS_URL = "https://kenkoooo.com/atcoder/resources/problem-models.json"
HTTP_TIMEOUT = 20.0


class AtCoderProvider:
    source = ProblemSource.atcoder

    def __init__(self, http_client: httpx.AsyncClient | None = None) -> None:
        self._client = http_client
        self._cache: dict[str, Any] | None = None

    async def fetch_problems_for_tags(
        self, tags: list[str], limit: int
    ) -> list[ProblemDTO]:
        if not tags:
            return []
        try:
            problems, models = await self._load()
        except Exception as exc:
            logger.warning("AtCoder fetch failed: %s", exc)
            return []

        keywords = [tag.lower() for tag in tags if tag]
        scored: list[tuple[int, ProblemDTO]] = []
        for raw in problems:
            title = (raw.get("title") or "").lower()
            score = sum(1 for kw in keywords if kw in title)
            if score == 0:
                continue
            dto = self._to_dto(raw, models)
            if dto is not None:
                scored.append((score, dto))

        scored.sort(key=lambda item: -item[0])
        return [dto for _, dto in scored[:limit]]

    async def _load(self) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
        if self._cache is not None:
            return self._cache["problems"], self._cache["models"]

        async def _get(url: str) -> Any:
            if self._client is not None:
                response = await self._client.get(url, timeout=HTTP_TIMEOUT)
                response.raise_for_status()
                return response.json()
            async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.json()

        problems = await _get(ATCODER_PROBLEMS_URL)
        models = await _get(ATCODER_MODELS_URL)
        self._cache = {"problems": problems, "models": models}
        return problems, models

    @staticmethod
    def _parse_contest(contest_id: str | None) -> tuple[str, str]:
        if not contest_id:
            return "", ""
        match = re.match(r"(abc|arc|agc|ahc)(\d+)", contest_id.lower())
        if match:
            return match.group(1), match.group(2)
        return contest_id.lower(), ""

    def _to_dto(self, raw: dict[str, Any], models: dict[str, dict[str, Any]]) -> ProblemDTO | None:
        problem_id = raw.get("id")
        title = raw.get("title")
        contest_id = raw.get("contest_id")
        if not problem_id or not title or not contest_id:
            return None

        contest_type, _ = self._parse_contest(contest_id)
        # AtCoder problem ids look like "abc123_a"; final letter is the slot.
        slot_match = re.search(r"_([a-z])$", problem_id.lower())
        slot = slot_match.group(1) if slot_match else ""

        normalized, label = normalize_atcoder(contest_type, slot)
        model = models.get(problem_id) or {}
        rated_difficulty = model.get("difficulty")
        if isinstance(rated_difficulty, (int, float)):
            # Apply Codeforces-like buckets (rough alignment) only if model exists.
            cf_like = int(rated_difficulty)
            if cf_like > 3000:
                normalized = 10
            elif cf_like > 2700:
                normalized = 9
            elif cf_like > 2400:
                normalized = 8
            elif cf_like > 2000:
                normalized = 7
            elif cf_like > 1700:
                normalized = 6
            elif cf_like > 1400:
                normalized = 5
            elif cf_like > 1100:
                normalized = 4
            elif cf_like > 800:
                normalized = 3
            else:
                normalized = max(1, min(2, normalized))
            label = difficulty_to_label(normalized)

        url = f"https://atcoder.jp/contests/{contest_id}/tasks/{problem_id}"
        raw_difficulty = (
            f"{contest_type.upper()}-{slot.upper()}"
            if contest_type and slot
            else (str(rated_difficulty) if rated_difficulty is not None else None)
        )

        return ProblemDTO(
            source=ProblemSource.atcoder,
            external_id=problem_id,
            title=title,
            url=url,
            raw_difficulty=raw_difficulty,
            normalized_difficulty=normalized,
            difficulty_label=label,
            success_rate=None,
            tags=[contest_type] if contest_type else [],
        )
