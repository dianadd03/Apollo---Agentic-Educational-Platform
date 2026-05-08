from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.db.models import User
from backend.dependencies import get_current_user, get_problem_service
from backend.schemas.problems import ProblemListResponse
from backend.services.problem_service import ProblemService

router = APIRouter(tags=["problems"])


@router.get(
    "/api/problems/topic-by-name",
    response_model=ProblemListResponse,
    status_code=status.HTTP_200_OK,
)
async def get_problems_by_topic_name(
    topic: str = Query(..., min_length=1, max_length=200),
    platforms: list[str] | None = Query(default=None),
    difficulty: str | None = Query(default=None),
    max_results: int | None = Query(default=None, ge=1, le=200),
    force_refresh: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    service: ProblemService = Depends(get_problem_service),
) -> ProblemListResponse:
    try:
        return await service.get_problems_for_topic(
            topic=topic,
            current_user=current_user,
            platforms=platforms,
            difficulty_filter=difficulty,
            max_results=max_results,
            force_refresh=force_refresh,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to retrieve problems at the moment.",
        ) from exc
