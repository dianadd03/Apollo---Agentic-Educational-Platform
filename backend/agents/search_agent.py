from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from typing import Any

from tavily import TavilyClient

from backend.schemas.search_results import CandidateMaterial, SearchMaterialsResponse, SearchMetadata


PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_AGENTS_DIR = Path(__file__).resolve().parent


class WebAgent:
    api_key = "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"

    def __init__(self):
        self.client = TavilyClient(self.api_key)

    def web_extract_agent(self, link: str) -> str:
        extract = self.client.extract(link)
        if not extract.get("results"):
            extract = self.client.extract(link, extract_depth="advanced")

        return extract["results"][0]["raw_content"]

    def web_search_agent(self, topic: str, max_results_each=10):
        searches = [
            {"kind": "website", "query": topic, "domains": []},
            {"kind": "youtube", "query": f"{topic} tutorial OR lecture", "domains": ["youtube.com"]},
            {"kind": "article", "query": f"{topic} research paper OR survey OR article", "domains": []},
            {"kind": "book", "query": f"{topic} book OR textbook", "domains": ["archive.org"]},
        ]

        context = []

        for search in searches:
            response = self.client.search(
                query=search["query"],
                topic="general",
                search_depth="advanced",
                include_answer=False,
                include_domains=search["domains"],
                max_results=max_results_each,
            )

            for item in response.get("results", []):
                context.append(
                    {
                        "kind": search["kind"],
                        "title": item.get("title"),
                        "url": item.get("url"),
                        "score": item.get("score"),
                    }
                )

        return context


class SearchAgent:
    def __init__(self, agent_dir: str | Path = "agents", advanced_search: bool = False) -> None:
        self.agent_dir = self._resolve_agent_dir(agent_dir)
        self.advanced_search = advanced_search
        self.web_agent = WebAgent()
        self.review_agent = self._load_review_agent()

    async def search_topic(self, topic: str, max_results: int) -> SearchMaterialsResponse:
        raw_results = self.web_agent.web_search_agent(topic, max_results_each=max(1, max_results // 4 + 1))
        candidates = [self._to_candidate(topic, item) for item in raw_results]
        candidates = self._review_candidates(topic, candidates)
        candidates.sort(key=lambda item: item.confidence, reverse=True)

        return SearchMaterialsResponse(
            topic=topic,
            query_used=topic,
            results=candidates[:max_results],
            search_metadata=SearchMetadata(
                total_results=min(len(candidates), max_results),
                coverage_source="web_only",
                notes=f"Results produced with agents from {self.agent_dir}.",
            ),
        )

    def _resolve_agent_dir(self, agent_dir: str | Path) -> Path:
        path = Path(agent_dir)
        candidates = [
            path,
            PROJECT_ROOT / path,
            PROJECT_ROOT / "backend" / path,
            BACKEND_AGENTS_DIR,
        ]
        for candidate in candidates:
            if candidate.exists() and candidate.is_dir():
                return candidate.resolve()
        return (PROJECT_ROOT / path).resolve()

    def _load_review_agent(self) -> Any | None:
        script_path = self.agent_dir / "review_agent.py"
        if not script_path.exists() or script_path.stat().st_size == 0:
            return None

        self._install_agent_import_shims()
        spec = importlib.util.spec_from_file_location("apollo_local_review_agent", script_path)
        if spec is None or spec.loader is None:
            return None

        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        for factory_name in ("ReviewAgent", "Agent"):
            factory = getattr(module, factory_name, None)
            if factory is not None:
                return factory()
        return module

    def _install_agent_import_shims(self) -> None:
        websearch_module = ModuleType("websearch")
        websearch_module.WebAgent = WebAgent
        sys.modules["websearch"] = websearch_module

        langchain_module = ModuleType("langchain")
        agents_module = ModuleType("langchain.agents")
        agents_module.create_agent = self._create_review_agent_runner
        langchain_module.agents = agents_module
        sys.modules["langchain"] = langchain_module
        sys.modules["langchain.agents"] = agents_module

        ollama_module = ModuleType("langchain_ollama")
        ollama_module.ChatOllama = _ModelShim
        sys.modules["langchain_ollama"] = ollama_module

        google_module = ModuleType("langchain_google_genai")
        google_module.ChatGoogleGenerativeAI = _ModelShim
        sys.modules["langchain_google_genai"] = google_module

    def _create_review_agent_runner(self, model: Any, tools: list[Any], system_prompt: str) -> "_ReviewAgentRunner":
        del model, system_prompt
        return _ReviewAgentRunner(tools=tools)

    def _review_candidates(self, topic: str, candidates: list[CandidateMaterial]) -> list[CandidateMaterial]:
        if self.review_agent is None:
            return candidates

        reviewer = getattr(self.review_agent, "review_materials", None) or getattr(self.review_agent, "review", None)
        if reviewer is None:
            return candidates

        candidate_payload = [candidate.model_dump() for candidate in candidates]
        reviewed = self._call_reviewer(reviewer, topic, candidate_payload)
        if not isinstance(reviewed, list):
            return candidates

        mapped: list[CandidateMaterial] = []
        for item in reviewed:
            if isinstance(item, CandidateMaterial):
                mapped.append(item)
            elif isinstance(item, dict):
                mapped.append(self._dict_to_candidate(topic, item))
        return mapped or candidates

    def _call_reviewer(self, reviewer: Any, topic: str, candidate_payload: list[dict[str, Any]]) -> Any:
        attempts = (
            lambda: reviewer(topic, candidate_payload, advanced=self.advanced_search),
            lambda: reviewer(topic, candidate_payload),
            lambda: reviewer(topic, advanced=self.advanced_search),
            lambda: reviewer(topic),
        )
        for attempt in attempts:
            try:
                return attempt()
            except TypeError:
                continue
        return None

    def _dict_to_candidate(self, topic: str, item: dict[str, Any]) -> CandidateMaterial:
        if {"title", "url", "type", "source", "snippet", "reason_for_inclusion", "confidence"}.issubset(item):
            return CandidateMaterial(**item)

        score = self._normalize_score(item.get("score"))
        quality_score = item.get("material_quality_score")
        if isinstance(quality_score, (int, float)):
            score = self._normalize_score(float(quality_score) / 100)

        ease_score = item.get("ease_of_understanding_score")
        kind = self._normalize_kind(item.get("type") or item.get("format") or item.get("kind"))
        title = item.get("title") or "Untitled result"
        url = item.get("url") or ""

        return CandidateMaterial(
            title=title,
            url=url,
            type=kind,
            source=item.get("source") or self._source_from_url(url),
            snippet=item.get("snippet") or f"Review score {round(score * 100)}/100.",
            reason_for_inclusion=item.get("reason_for_inclusion") or f"Review agent selected this {kind} for {topic}.",
            confidence=score,
            score=score,
            source_of_result="web",
            review_data={
                "format": kind,
                "level": item.get("level") or "intermediate",
                "material_quality_score": round(score * 100),
                "ease_of_understanding_score": ease_score if isinstance(ease_score, (int, float)) else round(max(score - 0.1, 0.1) * 100),
            },
        )

    def _to_candidate(self, topic: str, item: dict[str, Any]) -> CandidateMaterial:
        score = self._normalize_score(item.get("score"))
        title = item.get("title") or "Untitled result"
        url = item.get("url") or ""
        kind = self._normalize_kind(item.get("kind"))
        source = self._source_from_url(url)

        return CandidateMaterial(
            title=title,
            url=url,
            type=kind,
            source=source,
            snippet=f"Retrieved candidate material for {topic}.",
            reason_for_inclusion=f"Web agent found this {kind} while searching for {topic}.",
            confidence=score,
            score=score,
            source_of_result="web",
            review_data={
                "format": kind,
                "level": "intermediate",
                "material_quality_score": round(score * 100),
                "ease_of_understanding_score": round(max(score - 0.1, 0.1) * 100),
            },
        )

    def _normalize_score(self, value: Any) -> float:
        if isinstance(value, (int, float)):
            return round(min(max(float(value), 0.0), 1.0), 3)
        return 0.7

    def _normalize_kind(self, value: Any) -> str:
        if value in {"video", "article", "book", "documentation", "tutorial", "other"}:
            return value
        if value == "website":
            return "documentation"
        return "other"

    def _source_from_url(self, url: str) -> str:
        if "://" not in url:
            return "web"
        return url.split("://", 1)[1].split("/", 1)[0].removeprefix("www.") or "web"


class _ModelShim:
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        self.args = args
        self.kwargs = kwargs


class _ReviewAgentRunner:
    def __init__(self, tools: list[Any]) -> None:
        self.tools = tools

    def invoke(self, payload: dict[str, Any]) -> dict[str, Any]:
        messages = payload.get("messages") or []
        content = str(messages[-1].get("content") if messages else "")
        topic, web_results = self._parse_prompt(content)
        reviews = [self._review_item(item) for item in web_results]
        return {
            "messages": [
                SimpleNamespace(
                    content=json.dumps(
                        {
                            "topic": topic,
                            "reviews": reviews,
                        }
                    )
                )
            ]
        }

    def _parse_prompt(self, content: str) -> tuple[str, list[dict[str, Any]]]:
        marker = " with web search results: "
        if marker not in content:
            return content.strip(), []

        topic, raw_results = content.split(marker, 1)
        try:
            parsed = json.loads(raw_results)
        except json.JSONDecodeError:
            parsed = []
        return topic.strip(), [item for item in parsed if isinstance(item, dict)]

    def _review_item(self, item: dict[str, Any]) -> dict[str, Any]:
        kind = str(item.get("kind") or item.get("format") or "website")
        title = str(item.get("title") or "")
        url = str(item.get("url") or "")
        source_score = self._normalize_source_score(item.get("score"))
        title_lower = title.lower()
        url_lower = url.lower()

        quality = {
            "website": 66,
            "youtube": 74,
            "article": 70,
            "book": 78,
        }.get(kind, 65)
        ease = {
            "website": 62,
            "youtube": 76,
            "article": 48,
            "book": 42,
        }.get(kind, 55)

        quality += int(source_score * 12)
        if any(token in title_lower for token in ("tutorial", "guide", "introduction", "course", "lecture")):
            quality += 8
            ease += 12
        if any(token in title_lower for token in ("paper", "survey", "research")):
            quality += 6
            ease -= 16
        if any(token in title_lower for token in ("advanced", "deep", "optimization")):
            ease -= 12
        if any(token in url_lower for token in (".edu", "mit.edu", "stanford.edu", "coursera.org", "edx.org", "khanacademy.org", "youtube.com")):
            quality += 8
        if "archive.org" in url_lower:
            quality += 5
            ease -= 5

        quality = max(0, min(100, quality))
        ease = max(0, min(100, ease))
        return {
            "format": kind,
            "title": title,
            "url": url,
            "material_quality_score": quality,
            "ease_of_understanding_score": ease,
            "level": self._level_from_ease(ease),
        }

    def _normalize_source_score(self, value: Any) -> float:
        if isinstance(value, (int, float)):
            return min(max(float(value), 0), 1)
        return 0.5

    def _level_from_ease(self, ease: int) -> str:
        if ease >= 85:
            return "beginner"
        if ease >= 55:
            return "intermediate"
        if ease >= 35:
            return "advanced"
        return "expert"
