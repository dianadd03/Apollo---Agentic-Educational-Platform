import json
import logging
import os
from ast import literal_eval
from typing import Any

from ddgs import DDGS
from langchain_community.tools import DuckDuckGoSearchResults, TavilySearchResults

from backend.config import Settings

logger = logging.getLogger(__name__)


class WebSearchTool:
    """Thin wrapper over LangChain-compatible search tools."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._tool = self._build_tool()

    def _build_tool(self) -> DuckDuckGoSearchResults | TavilySearchResults:
        provider = self._settings.search_provider

        if provider in {"auto", "tavily"} and self._settings.tavily_api_key:
            logger.info("Using Tavily search provider.")
            os.environ["TAVILY_API_KEY"] = self._settings.tavily_api_key
            return TavilySearchResults(
                max_results=self._settings.max_results,
                include_answer=False,
                include_raw_content=False,
                search_depth="advanced",
            )

        if provider == "tavily" and not self._settings.tavily_api_key:
            raise RuntimeError("APOLLO_TAVILY_API_KEY is required when APOLLO_SEARCH_PROVIDER=tavily.")

        logger.info("Using DuckDuckGo search provider.")
        return DuckDuckGoSearchResults(output_format="list", backend="html")

    async def search(self, query: str, max_results: int) -> list[dict[str, Any]]:
        try:
            raw_results = await self._tool.ainvoke(query)
            normalized = self._normalize_results(raw_results)
            if normalized:
                return normalized[:max_results]
            logger.info("LangChain DuckDuckGo returned no parsed results for query='%s'. Falling back to DDGS.", query)
        except Exception:
            logger.exception("Web search provider failed for query='%s'", query)

        return self._fallback_ddgs_search(query=query, max_results=max_results)

    def _fallback_ddgs_search(self, query: str, max_results: int) -> list[dict[str, Any]]:
        backends = ["html", "lite"]
        for backend in backends:
            try:
                logger.info("Trying DDGS fallback backend='%s' for query='%s'", backend, query)
                with DDGS() as ddgs:
                    results = list(ddgs.text(query, backend=backend, max_results=max_results))
                normalized = self._normalize_results(results)
                if normalized:
                    logger.info("DDGS fallback backend='%s' returned %s results for query='%s'", backend, len(normalized), query)
                    return normalized[:max_results]
            except Exception:
                logger.exception("DDGS fallback failed for backend='%s' query='%s'", backend, query)
        return []

    def _normalize_results(self, raw_results: Any) -> list[dict[str, Any]]:
        if isinstance(raw_results, list):
            return [item for item in raw_results if isinstance(item, dict)]

        if isinstance(raw_results, dict):
            if isinstance(raw_results.get("results"), list):
                return [item for item in raw_results["results"] if isinstance(item, dict)]
            return [raw_results]

        if isinstance(raw_results, str):
            parsed = self._parse_string_results(raw_results)
            if parsed:
                return parsed

        logger.warning("Unexpected search result payload type: %s", type(raw_results).__name__)
        return []

    def _parse_string_results(self, raw_results: str) -> list[dict[str, Any]]:
        payload = raw_results.strip()
        if not payload:
            return []

        for parser in (json.loads, literal_eval):
            try:
                parsed = parser(payload)
            except Exception:
                continue

            if isinstance(parsed, list):
                return [item for item in parsed if isinstance(item, dict)]
            if isinstance(parsed, dict):
                if isinstance(parsed.get("results"), list):
                    return [item for item in parsed["results"] if isinstance(item, dict)]
                return [parsed]

        logger.warning("Unable to parse string search results payload.")
        return []
