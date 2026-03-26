import logging
import re
from urllib.parse import urlparse

from backend.schemas.search_results import CandidateMaterial, ResourceType, SearchMaterialsResponse, SearchMetadata
from backend.tools.web_search import WebSearchTool

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


class SearchAgent:
    def __init__(self, search_tool: WebSearchTool) -> None:
        self._search_tool = search_tool

    async def search_topic(self, topic: str, max_results: int) -> SearchMaterialsResponse:
        queries = self._build_queries(topic)
        raw_results: list[dict] = []
        query_used = queries[0]

        for query in queries:
            logger.info("Searching candidate materials for topic='%s' query='%s'", topic, query)
            raw_results = await self._search_tool.search(query=query, max_results=max_results * 2)
            logger.info("Search provider returned %s raw results for topic='%s'", len(raw_results), topic)
            if raw_results:
                logger.info("First raw result keys for topic='%s': %s", topic, sorted(raw_results[0].keys()))
                query_used = query
                break

        candidates = self._transform_results(topic=topic, raw_results=raw_results, max_results=max_results)
        logger.info("Search agent kept %s candidate results for topic='%s'", len(candidates), topic)

        notes = "Candidate results only. Final validation will be performed by a separate review agent."
        if not candidates:
            notes = (
                "Candidate results only. Final validation will be performed by a separate review agent. "
                "No strong matches were retrieved for this topic."
            )

        return SearchMaterialsResponse(
            topic=topic,
            query_used=query_used,
            results=candidates,
            search_metadata=SearchMetadata(total_results=len(candidates), notes=notes),
        )

    def _build_queries(self, topic: str) -> list[str]:
        cleaned = topic.strip()
        return [
            cleaned,
            f"{cleaned} tutorial",
            f"learn {cleaned}",
            f"{cleaned} tutorial videos"
            f"{cleaned} books"
        ]

    def _transform_results(self, topic: str, raw_results: list[dict], max_results: int) -> list[CandidateMaterial]:
        seen_urls: set[str] = set()
        materials: list[CandidateMaterial] = []

        for raw in raw_results:
            url = str(raw.get("url") or raw.get("link") or raw.get("href") or "").strip()
            title = str(raw.get("title") or raw.get("name") or raw.get("heading") or "").strip()
            snippet = str(raw.get("content") or raw.get("snippet") or raw.get("description") or raw.get("body") or "").strip()

            if not url or not title:
                continue

            normalized_url = self._normalize_url(url)
            if normalized_url in seen_urls:
                continue

            source = self._extract_source(url, raw)
            resource_type = self._classify_result(title=title, url=url, snippet=snippet)
            confidence = self._estimate_confidence(topic=topic, title=title, source=source, snippet=snippet, url=url)

            materials.append(
                CandidateMaterial(
                    title=title,
                    url=url,
                    type=resource_type,
                    source=source,
                    snippet=snippet,
                    reason_for_inclusion=self._reason_for_inclusion(topic=topic, source=source, resource_type=resource_type, snippet=snippet),
                    confidence=confidence,
                )
            )
            seen_urls.add(normalized_url)

        materials.sort(key=lambda item: item.confidence, reverse=True)
        return materials[:max_results]

    def _normalize_url(self, url: str) -> str:
        parsed = urlparse(url)
        host = parsed.netloc.lower().replace("www.", "")
        path = parsed.path.rstrip("/")
        return f"{host}{path}"

    def _extract_source(self, url: str, raw: dict) -> str:
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

    def _estimate_confidence(self, topic: str, title: str, source: str, snippet: str, url: str) -> float:
        score = 0.25
        host = urlparse(url).netloc.lower().replace("www.", "")
        text = f"{title} {snippet}".lower()
        topic_tokens = [token for token in re.split(r"\W+", topic.lower()) if token]

        if any(token in text for token in topic_tokens):
            score += 0.25
        if host in TRUSTED_DOMAIN_HINTS:
            score += 0.2
        if any(word in text for word in ("tutorial", "course", "guide", "documentation", "learn", "introduction", "lecture")):
            score += 0.15
        if source.lower().endswith(".edu") or ".edu" in host:
            score += 0.1
        if len(snippet) > 40:
            score += 0.05

        return round(min(score, 0.98), 2)

    def _reason_for_inclusion(self, topic: str, source: str, resource_type: ResourceType, snippet: str) -> str:
        if snippet:
            return f"Retrieved candidate resource for {topic} from {source} with {resource_type}-style coverage and topic-aligned snippet."
        return f"Retrieved candidate resource for {topic} from {source} based on educational-topic relevance."
