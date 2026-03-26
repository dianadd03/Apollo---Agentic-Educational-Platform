from fastapi import APIRouter, Depends, HTTPException, status

from backend.config import Settings, get_settings
from backend.schemas.search_results import SearchMaterialsRequest, SearchMaterialsResponse
from backend.services.material_search_service import MaterialSearchService
from backend.dependencies import get_material_search_service

router = APIRouter(tags=["search"])


@router.post("/api/search-materials", response_model=SearchMaterialsResponse, status_code=status.HTTP_200_OK)
async def search_materials(
    payload: SearchMaterialsRequest,
    service: MaterialSearchService = Depends(get_material_search_service),
    settings: Settings = Depends(get_settings),
) -> SearchMaterialsResponse:
    try:
        return await service.search_materials(topic=payload.topic, max_results=payload.max_results or settings.max_results)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to retrieve candidate materials at the moment.",
        ) from exc
