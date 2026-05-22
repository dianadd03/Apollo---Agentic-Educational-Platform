import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from backend.db.models import User
from backend.dependencies import get_current_user, get_foundational_task_agent, get_topic_service
from backend.schemas.foundational_tasks import FoundationalTasksRequest, FoundationalTasksResponse, TopicFoundationalTasksRequest
from backend.schemas.topics import TopicCreateRequest, TopicDetailResponse, TopicResponse
from backend.services.topic_service import TopicService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/topics", tags=["topics"])


@router.get("", response_model=list[TopicResponse])
def list_topics(current_user: User = Depends(get_current_user), topic_service: TopicService = Depends(get_topic_service)) -> list[TopicResponse]:
    return topic_service.list_topics(current_user.id)


@router.post("", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
def create_topic(
    payload: TopicCreateRequest,
    current_user: User = Depends(get_current_user),
    topic_service: TopicService = Depends(get_topic_service),
) -> TopicResponse:
    return topic_service.create_topic(current_user.id, payload)


@router.post("/foundational-tasks", response_model=FoundationalTasksResponse, status_code=status.HTTP_200_OK)
async def generate_foundational_tasks(
    payload: FoundationalTasksRequest,
    current_user: User = Depends(get_current_user),
    agent: Any = Depends(get_foundational_task_agent),
) -> FoundationalTasksResponse:
    del current_user
    generator = getattr(agent, "generate_foundational_tasks", None)
    if generator is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Foundational task agent is not available.")

    try:
        raw_response = await run_in_threadpool(generator, payload.topic)
    except Exception as exc:
        logger.exception("Foundational task agent failed for topic %s", payload.topic)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to generate foundational tasks right now.") from exc

    try:
        response = FoundationalTasksResponse.model_validate(raw_response)
    except ValidationError as exc:
        logger.warning("Invalid foundational task agent output for topic %s: %s", payload.topic, exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Foundational task agent returned invalid task data.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    if not response.foundational_tasks:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Foundational task agent returned no tasks.")
    return response


@router.post("/{topic_id}/foundational-tasks", response_model=FoundationalTasksResponse, status_code=status.HTTP_200_OK)
async def generate_or_get_topic_foundational_tasks(
    topic_id: str,
    payload: TopicFoundationalTasksRequest,
    current_user: User = Depends(get_current_user),
    topic_service: TopicService = Depends(get_topic_service),
    agent: Any = Depends(get_foundational_task_agent),
) -> FoundationalTasksResponse:
    topic = topic_service.get_topic(current_user.id, topic_id)
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found.")

    if topic.coding_tasks and not payload.force_regenerate:
        return FoundationalTasksResponse(topic=topic.title, foundational_tasks=topic.coding_tasks)

    generator = getattr(agent, "generate_foundational_tasks", None)
    if generator is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Foundational task agent is not available.")

    try:
        raw_response = await run_in_threadpool(generator, topic.title)
    except Exception as exc:
        logger.exception("Foundational task agent failed for topic %s", topic.title)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to generate foundational tasks right now.") from exc

    try:
        response = FoundationalTasksResponse.model_validate(raw_response)
    except ValidationError as exc:
        logger.warning("Invalid foundational task agent output for topic %s: %s", topic.title, exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Foundational task agent returned invalid task data.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    saved_tasks = topic_service.replace_coding_tasks(current_user.id, topic_id, response.foundational_tasks)
    if saved_tasks is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found.")
    return FoundationalTasksResponse(topic=topic.title, foundational_tasks=saved_tasks)


@router.get("/{topic_id}", response_model=TopicDetailResponse)
def get_topic(
    topic_id: str,
    current_user: User = Depends(get_current_user),
    topic_service: TopicService = Depends(get_topic_service),
) -> TopicDetailResponse:
    topic = topic_service.get_topic(current_user.id, topic_id)
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found.")
    return topic


@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_topic(
    topic_id: str,
    current_user: User = Depends(get_current_user),
    topic_service: TopicService = Depends(get_topic_service),
) -> None:
    deleted = topic_service.delete_topic(current_user.id, topic_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found.")
