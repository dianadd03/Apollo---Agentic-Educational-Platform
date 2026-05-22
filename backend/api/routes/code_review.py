import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from starlette.concurrency import run_in_threadpool

from backend.db.models import User
from backend.dependencies import get_code_review_agent, get_current_user
from backend.schemas.code_review import CodeReviewRequest, CodeReviewResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/code-review", tags=["code-review"])


@router.post("", response_model=CodeReviewResponse, status_code=status.HTTP_200_OK)
async def review_code(
    payload: CodeReviewRequest,
    current_user: User = Depends(get_current_user),
    agent: Any = Depends(get_code_review_agent),
) -> CodeReviewResponse:
    del current_user
    reviewer = getattr(agent, "review_code", None)
    if reviewer is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Code review agent is not available.")

    try:
        review_markdown = await run_in_threadpool(reviewer, payload)
    except Exception as exc:
        logger.exception("Code review agent failed for language %s", payload.language)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to review code right now. Check that Ollama is running and qwen2.5-coder:3b is available.") from exc

    return CodeReviewResponse(review_markdown=review_markdown, model=getattr(agent, "model", "qwen2.5-coder:3b"))
