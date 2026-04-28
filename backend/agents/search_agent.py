import json
import logging
import re
import sys
from asyncio import to_thread
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from types import ModuleType, SimpleNamespace
from typing import Any
from urllib import request
from urllib.parse import urlparse

from backend.schemas.search_results import CandidateMaterial, ResourceType, SearchMaterialsResponse, SearchMetadata

logger = logging.getLogger(__name__)

TRUSTED_DOMAIN_HINTS = {
    "youtube.com",
    "youtu.be",
    "coursera.org",
    "edx.org",
    "khanacademy.org",
    "mit.edu",
    "stanford.edu",
    "harvard.edu",
    "cmu.edu",
    "freecodecamp.org",
    "geeksforgeeks.org",
    "w3schools.com",
    "mozilla.org",
    "developer.mozilla.org",
    "docs.python.org",
    "learn.microsoft.com",
    "cp-algorithms.com",
}

VIDEO_DOMAINS = {"youtube.com", "youtu.be", "vimeo.com"}
DOCUMENTATION_DOMAINS = {"developer.mozilla.org", "docs.python.org", "learn.microsoft.com", "readthedocs.io"}
BOOK_HINTS = ("book", "textbook", "press", "oreilly", "springer", "pearson")
TUTORIAL_HINTS = ("tutorial", "guide", "walkthrough", "introduction", "getting started")
FORMAT_TO_RESOURCE_TYPE: dict[str, ResourceType] = {
    "youtube": "video",
    "article": "article",
    "book": "book",
    "website": "tutorial",
}


class SearchAgent:
    def __init__(self, review_agent_dir: str, advanced_search: bool = False) -> None:
        self._review_agent_dir = Path(review_agent_dir)
        self._advanced_search = advanced_search
        self._review_agent: Any | None = None

    async def search_topic(self, topic: str, max_results: int) -> SearchMaterialsResponse:
        logger.info(
            "Searching candidate materials for topic='%s' via external review agent (advanced=%s)",
            topic,
            self._advanced_search,
        )
        raw_reviews = await to_thread(self._run_review, topic)
        candidates = self._transform_results(topic=topic, raw_results=raw_reviews)
        logger.info("Review agent kept %s candidate results for topic='%s'", len(candidates), topic)

        notes = "Candidate results were retrieved and scored through the external review agent."
        if not candidates:
            notes = (
                "Candidate results were retrieved and scored through the external review agent. "
                "No strong matches were retrieved for this topic."
            )

        return SearchMaterialsResponse(
            topic=topic,
            query_used=topic,
            results=candidates,
            search_metadata=SearchMetadata(total_results=len(candidates), notes=notes, coverage_source="web_only"),
        )

    def _run_review(self, topic: str) -> list[dict[str, Any]]:
        agent = self._get_review_agent()
        reviews = agent.review(topic, advanced=self._advanced_search)
        return [item for item in reviews if isinstance(item, dict)]

    def _get_review_agent(self) -> Any:
        if self._review_agent is None:
            review_agent_cls = self._load_review_agent_class()
            self._review_agent = review_agent_cls()
        return self._review_agent

    def _load_review_agent_class(self) -> type:
        module_path = self._review_agent_dir / "review_agent.py"
        if not module_path.exists():
            raise RuntimeError(f"Review agent script not found at {module_path}.")

        self._install_review_agent_shims()
        spec = spec_from_file_location("apollo_external_review_agent", module_path)
        if spec is None or spec.loader is None:
            raise RuntimeError(f"Unable to load review agent module from {module_path}.")

        module = module_from_spec(spec)
        sys.path.insert(0, str(module_path.parent))
        try:
            spec.loader.exec_module(module)
        finally:
            if sys.path and sys.path[0] == str(module_path.parent):
                sys.path.pop(0)

        self._patch_review_agent_module(module)
        review_agent_cls = getattr(module, "ReviewAgent", None)
        if review_agent_cls is None:
            raise RuntimeError("Review agent script does not expose a ReviewAgent class.")
        return review_agent_cls

    def _install_review_agent_shims(self) -> None:
        if "langchain_ollama" not in sys.modules:
            shim = ModuleType("langchain_ollama")

            class ChatOllama:
                def __init__(self, *args: Any, **kwargs: Any) -> None:
                    self.args = args
                    self.kwargs = kwargs

            shim.ChatOllama = ChatOllama
            sys.modules["langchain_ollama"] = shim

        if "langchain_google_genai" not in sys.modules:
            shim = ModuleType("langchain_google_genai")

            class ChatGoogleGenerativeAI:
                def __init__(self, *args: Any, **kwargs: Any) -> None:
                    self.args = args
                    self.kwargs = kwargs

            shim.ChatGoogleGenerativeAI = ChatGoogleGenerativeAI
            sys.modules["langchain_google_genai"] = shim

        if "tavily" not in sys.modules:
            shim = ModuleType("tavily")

            class TavilyClient:
                def __init__(self, api_key: str | None = None) -> None:
                    self.api_key = api_key

                def search(
                    self,
                    query: str,
                    topic: str = "general",
                    search_depth: str = "basic",
                    include_answer: bool = False,
                    include_domains: list[str] | None = None,
                    max_results: int = 5,
                ) -> dict[str, Any]:
                    payload = {
                        "api_key": self.api_key,
                        "query": query,
                        "topic": topic,
                        "search_depth": search_depth,
                        "include_answer": include_answer,
                        "include_domains": include_domains or [],
                        "max_results": max_results,
                    }
                    return self._post_json("https://api.tavily.com/search", payload)

                def extract(self, link: str, extract_depth: str = "basic") -> dict[str, Any]:
                    payload = {
                        "api_key": self.api_key,
                        "urls": [link],
                        "extract_depth": extract_depth,
                    }
                    return self._post_json("https://api.tavily.com/extract", payload)

                def _post_json(self, url: str, payload: dict[str, Any]) -> dict[str, Any]:
                    body = json.dumps(payload).encode("utf-8")
                    req = request.Request(
                        url,
                        data=body,
                        headers={"Content-Type": "application/json"},
                        method="POST",
                    )
                    with request.urlopen(req, timeout=30) as response:
                        return json.loads(response.read().decode("utf-8"))

            shim.TavilyClient = TavilyClient
            sys.modules["tavily"] = shim

    def _patch_review_agent_module(self, module: ModuleType) -> None:
        def create_agent(model: Any, tools: list[Any], system_prompt: str) -> Any:
            del model, tools, system_prompt
            return _ReviewAgentShim(module)

        module.create_agent = create_agent

    @staticmethod
    def _score_review_item(item: dict[str, Any]) -> tuple[int, int]:
        title = str(item.get("title") or "").lower()
        url = str(item.get("url") or "").lower()
        kind = str(item.get("kind") or item.get("format") or "website").lower()
        source_score = float(item.get("score") or 0.5)

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
        if any(token in title for token in ("tutorial", "guide", "introduction", "course", "lecture")):
            quality += 8
            ease += 12
        if any(token in title for token in ("paper", "survey", "research")):
            quality += 6
            ease -= 16
        if any(token in title for token in ("advanced", "deep", "optimization")):
            ease -= 12
        if any(token in url for token in (".edu", "mit.edu", "stanford.edu", "coursera.org", "edx.org", "khanacademy.org", "youtube.com")):
            quality += 8
        if "archive.org" in url:
            quality += 5
            ease -= 5

        return max(0, min(100, quality)), max(0, min(100, ease))

    def _transform_results(self, topic: str, raw_results: list[dict[str, Any]]) -> list[CandidateMaterial]:
        seen_urls: set[str] = set()
        materials: list[CandidateMaterial] = []

        for raw in raw_results:
            url = str(raw.get("url") or "").strip()
            title = str(raw.get("title") or "").strip()
            raw_format = str(raw.get("format") or raw.get("kind") or "website").strip().lower()
            quality_score = self._clamp_score(raw.get("material_quality_score"))
            ease_score = self._clamp_score(raw.get("ease_of_understanding_score"))
            level = str(raw.get("level") or "").strip().lower()
            snippet = f"Review score {quality_score}/100, ease {ease_score}/100" + (f", level {level}" if level else "")

            if not url or not title:
                continue

            normalized_url = self._normalize_url(url)
            if normalized_url in seen_urls:
                continue

            source = self._extract_source(url, raw)
            resource_type = self._resource_type_from_review(raw_format, title=title, url=url, snippet=snippet)
            confidence = round(min(max(quality_score / 100, 0), 1), 2)
            review_payload = {
                "format": raw_format,
                "title": title,
                "url": url,
                "material_quality_score": quality_score,
                "ease_of_understanding_score": ease_score,
                "level": level or self._infer_level(ease_score),
            }

            materials.append(
                CandidateMaterial(
                    title=title,
                    url=url,
                    type=resource_type,
                    source=source,
                    snippet=snippet,
                    reason_for_inclusion=self._reason_for_inclusion(
                        topic=topic,
                        source=source,
                        resource_type=resource_type,
                        snippet=snippet,
                        quality_score=quality_score,
                        ease_score=ease_score,
                    ),
                    confidence=confidence,
                    source_of_result="web",
                    review_data=review_payload,
                )
            )
            seen_urls.add(normalized_url)

        materials.sort(key=lambda item: item.confidence, reverse=True)
        return materials

    def _clamp_score(self, value: Any) -> int:
        try:
            return max(0, min(100, int(value)))
        except (TypeError, ValueError):
            return 0

    def _infer_level(self, ease_score: int) -> str:
        if ease_score >= 85:
            return "beginner"
        if ease_score >= 55:
            return "intermediate"
        if ease_score >= 35:
            return "advanced"
        return "expert"

    def _resource_type_from_review(self, raw_format: str, title: str, url: str, snippet: str) -> ResourceType:
        if raw_format in FORMAT_TO_RESOURCE_TYPE:
            return FORMAT_TO_RESOURCE_TYPE[raw_format]
        return self._classify_result(title=title, url=url, snippet=snippet)

    def _normalize_url(self, url: str) -> str:
        parsed = urlparse(url)
        host = parsed.netloc.lower().replace("www.", "")
        path = parsed.path.rstrip("/")
        return f"{host}{path}"

    def _extract_source(self, url: str, raw: dict[str, Any]) -> str:
        if raw.get("source"):
            return str(raw["source"])

        host = urlparse(url).netloc.lower().replace("www.", "")
        if not host:
            return "Unknown"
        return host

    def _classify_result(self, title: str, url: str, snippet: str) -> ResourceType:
        host = urlparse(url).netloc.lower().replace("www.", "")
        haystack = f"{title} {snippet} {url}".lower()

        if host in VIDEO_DOMAINS:
            return "video"
        if host in DOCUMENTATION_DOMAINS or "/docs" in url.lower() or "documentation" in haystack:
            return "documentation"
        if any(hint in haystack for hint in BOOK_HINTS):
            return "book"
        if any(hint in haystack for hint in TUTORIAL_HINTS):
            return "tutorial"
        if "article" in haystack or "blog" in haystack:
            return "article"
        return "other"

    def _reason_for_inclusion(
        self,
        topic: str,
        source: str,
        resource_type: ResourceType,
        snippet: str,
        quality_score: int,
        ease_score: int,
    ) -> str:
        if snippet:
            return (
                f"Retrieved candidate resource for {topic} from {source} with {resource_type}-style coverage; "
                f"review quality {quality_score}/100 and ease {ease_score}/100."
            )
        return f"Retrieved candidate resource for {topic} from {source} based on educational-topic relevance."


class _ReviewAgentShim:
    def __init__(self, module: ModuleType) -> None:
        self._module = module

    def invoke(self, payload: dict[str, Any]) -> dict[str, Any]:
        messages = payload.get("messages") or []
        content = str(messages[-1].get("content") if messages else "")
        topic, web_results = self._parse_payload(content)

        reviews = []
        for item in web_results:
            quality, ease = SearchAgent._score_review_item(item)
            reviews.append(
                {
                    "format": str(item.get("kind") or item.get("format") or "website"),
                    "title": str(item.get("title") or ""),
                    "url": str(item.get("url") or ""),
                    "material_quality_score": quality,
                    "ease_of_understanding_score": ease,
                    "level": self._module.level_from_scores(ease),
                }
            )

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

    def _parse_payload(self, content: str) -> tuple[str, list[dict[str, Any]]]:
        marker = " with web search results: "
        if marker not in content:
            return content.strip(), []

        topic, raw_results = content.split(marker, 1)
        try:
            parsed = json.loads(raw_results)
        except json.JSONDecodeError:
            parsed = []
        return topic.strip(), [item for item in parsed if isinstance(item, dict)]
