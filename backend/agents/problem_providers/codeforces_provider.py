"""Codeforces provider — uses the official public API (no auth required).

Endpoint: https://codeforces.com/api/problemset.problems?tags=tag1;tag2
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from backend.agents.problem_providers.base import ProblemDTO
from backend.agents.problem_providers.difficulty_normalizer import normalize_codeforces
from backend.db.models import ProblemSource

logger = logging.getLogger(__name__)

CODEFORCES_API_URL = "https://codeforces.com/api/problemset.problems"
HTTP_TIMEOUT = 15.0


class CodeforcesProvider:
    source = ProblemSource.codeforces

    def __init__(self, http_client: httpx.AsyncClient | None = None) -> None:
        self._client = http_client

    async def fetch_problems_for_tags(
        self, tags: list[str], limit: int
    ) -> list[ProblemDTO]:
        if not tags:
            return []

        params = {"tags": ";".join(tags)}
        try:
            data = await self._request(params)
        except Exception as exc:
            logger.warning("Codeforces fetch failed: %s", exc)
            return []

        if data.get("status") != "OK":
            logger.warning("Codeforces returned non-OK status: %s", data.get("comment"))
            return []

        problems = data.get("result", {}).get("problems", [])
        statistics = {
            (s.get("contestId"), s.get("index")): s
            for s in data.get("result", {}).get("problemStatistics", [])
        }

        results: list[ProblemDTO] = []
        for raw in problems:
            dto = self._to_dto(raw, statistics)
            if dto is not None:
                results.append(dto)
            if len(results) >= limit:
                break
        return results

    async def _request(self, params: dict[str, str]) -> dict[str, Any]:
        if self._client is not None:
            response = await self._client.get(CODEFORCES_API_URL, params=params, timeout=HTTP_TIMEOUT)
            response.raise_for_status()
            return response.json()
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            response = await client.get(CODEFORCES_API_URL, params=params)
            response.raise_for_status()
            return response.json()

    def _to_dto(self, raw: dict[str, Any], stats: dict[tuple[Any, Any], dict[str, Any]]) -> ProblemDTO | None:
        contest_id = raw.get("contestId")
        index = raw.get("index")
        name = raw.get("name")
        if contest_id is None or index is None or not name:
            return None

        external_id = f"{contest_id}{index}"
        url = f"https://codeforces.com/problemset/problem/{contest_id}/{index}"
        rating = raw.get("rating")
        normalized, label = normalize_codeforces(rating)
        raw_difficulty = str(rating) if rating is not None else None

        stat = stats.get((contest_id, index)) or {}
        solved_count = stat.get("solvedCount")
        success_rate: float | None = None
        # Codeforces does not expose attempts directly; treat solved_count as
        # popularity, leaving success_rate None for now.
        _ = solved_count

        return ProblemDTO(
            source=ProblemSource.codeforces,
            external_id=external_id,
            title=name,
            url=url,
            raw_difficulty=raw_difficulty,
            normalized_difficulty=normalized,
            difficulty_label=label,
            success_rate=success_rate,
            tags=list(raw.get("tags", []) or []),
        )
