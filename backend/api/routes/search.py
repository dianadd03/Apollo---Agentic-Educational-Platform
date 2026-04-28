from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.db.models import User
from backend.dependencies import get_current_user, get_material_search_service
from backend.schemas.search_results import SavedSearchResultResponse, SearchMaterialsRequest, SearchMaterialsResponse
from backend.services.material_search_service import MaterialSearchService

router = APIRouter(tags=["search"])


@router.post("/api/search-materials", response_model=SearchMaterialsResponse, status_code=status.HTTP_200_OK)
async def search_materials(
    payload: SearchMaterialsRequest,
    current_user: User = Depends(get_current_user),
    service: MaterialSearchService = Depends(get_material_search_service),
) -> SearchMaterialsResponse:
    try:
        return await service.search_materials(topic=payload.topic, current_user=current_user, max_results=payload.max_results)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to retrieve materials at the moment.",
        ) from exc


@router.get("/api/search-materials/history", response_model=list[SavedSearchResultResponse])
def get_saved_searches_for_topic(
    topic: str = Query(..., min_length=1, max_length=200),
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    service: MaterialSearchService = Depends(get_material_search_service),
) -> list[SavedSearchResultResponse]:
    return service.get_saved_results_for_topic(topic=topic, current_user=current_user, limit=limit)


@router.get("/api/search-materials/history/{search_result_id}", response_model=SavedSearchResultResponse)
def get_saved_search_result(
    search_result_id: str,
    current_user: User = Depends(get_current_user),
    service: MaterialSearchService = Depends(get_material_search_service),
) -> SavedSearchResultResponse:
    try:
        return service.get_saved_result(search_result_id=search_result_id, current_user=current_user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
