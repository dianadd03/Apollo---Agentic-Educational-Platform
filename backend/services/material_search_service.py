import logging

from backend.agents.search_agent import SearchAgent
from backend.schemas.search_results import SearchMaterialsResponse, SearchMetadata

logger = logging.getLogger(__name__)


class MaterialSearchService:
    def __init__(self, search_agent: SearchAgent, default_max_results: int) -> None:
        self._search_agent = search_agent
        self._default_max_results = default_max_results

    async def search_materials(self, topic: str, max_results: int | None = None) -> SearchMaterialsResponse:
        limit = max_results or self._default_max_results
        try:
            return await self._search_agent.search_topic(topic=topic, max_results=limit)
        except Exception:
            logger.exception("Material search failed for topic='%s'", topic)
            return SearchMaterialsResponse(
                topic=topic,
                query_used=topic,
                results=[],
                search_metadata=SearchMetadata(
                    total_results=0,
                    notes=(
                        "Candidate results only. Final validation will be performed by a separate review agent. "
                        "The search provider failed, so no candidate materials were returned."
                    ),
                ),
            )
