from fastapi import APIRouter, Depends, HTTPException, status

from backend.dependencies import get_current_user, get_topic_service
from backend.schemas.topics import TopicCreateRequest, TopicDetailResponse, TopicResponse
from backend.services.topic_service import TopicService

router = APIRouter(prefix="/api/topics", tags=["topics"])


@router.get("", response_model=list[TopicResponse])
def list_topics(current_user: dict = Depends(get_current_user), topic_service: TopicService = Depends(get_topic_service)) -> list[TopicResponse]:
    return topic_service.list_topics(current_user["id"])


@router.post("", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
def create_topic(
    payload: TopicCreateRequest,
    current_user: dict = Depends(get_current_user),
    topic_service: TopicService = Depends(get_topic_service),
) -> TopicResponse:
    return topic_service.create_topic(current_user["id"], payload)


@router.get("/{topic_id}", response_model=TopicDetailResponse)
def get_topic(
    topic_id: str,
    current_user: dict = Depends(get_current_user),
    topic_service: TopicService = Depends(get_topic_service),
) -> TopicDetailResponse:
    topic = topic_service.get_topic(current_user["id"], topic_id)
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found.")
    return topic
