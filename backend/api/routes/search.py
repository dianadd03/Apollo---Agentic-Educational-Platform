import asyncio

from fastapi import APIRouter, HTTPException, status

from backend.schemas.search_results import SearchMaterialsRequest, WebSearchResult
from backend.tools.websearch import web_search_agent

router = APIRouter(tags=["search"])


@router.post("/api/search-materials", response_model=list[WebSearchResult], status_code=status.HTTP_200_OK)
async def search_materials(payload: SearchMaterialsRequest) -> list[WebSearchResult]:
    try:
        max_results_each = 15 if payload.advanced else 5
        results = await asyncio.to_thread(web_search_agent, payload.topic, max_results_each)
        return [WebSearchResult.model_validate(result) for result in results]
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to retrieve search results at the moment.",
        ) from exc
