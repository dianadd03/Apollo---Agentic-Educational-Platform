from functools import lru_cache

from backend.agents.search_agent import SearchAgent
from backend.config import get_settings
from backend.services.material_search_service import MaterialSearchService
from backend.tools.web_search import WebSearchTool


@lru_cache(maxsize=1)
def get_material_search_service() -> MaterialSearchService:
    settings = get_settings()
    tool = WebSearchTool(settings)
    agent = SearchAgent(tool)
    return MaterialSearchService(search_agent=agent, default_max_results=settings.max_results)
