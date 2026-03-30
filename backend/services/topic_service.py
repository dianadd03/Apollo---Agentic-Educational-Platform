from datetime import datetime
from typing import Any
from uuid import uuid4

from backend.schemas.topics import TopicCreateRequest, TopicDetailResponse, TopicResponse
from backend.services.storage_service import JsonStore


class TopicService:
    def __init__(self, store: JsonStore) -> None:
        self._store = store

    def list_topics(self, user_id: str) -> list[TopicResponse]:
        data = self._store.read()
        topics = [self._to_topic_response(topic) for topic in data["topics"] if topic["user_id"] == user_id]
        return sorted(topics, key=lambda item: item.created_at, reverse=True)

    def create_topic(self, user_id: str, payload: TopicCreateRequest) -> TopicResponse:
        topic = {
            "id": str(uuid4()),
            "title": payload.title,
            "level": payload.level,
            "created_at": datetime.utcnow().isoformat(),
            "user_id": user_id,
        }

        def updater(current: dict[str, Any]) -> dict[str, Any]:
            current["topics"].append(topic)
            return current

        self._store.update(updater)
        return self._to_topic_response(topic)

    def get_topic(self, user_id: str, topic_id: str) -> TopicDetailResponse | None:
        data = self._store.read()
        topic = next((item for item in data["topics"] if item["id"] == topic_id and item["user_id"] == user_id), None)
        if not topic:
            return None
        return TopicDetailResponse(
            **self._to_topic_response(topic).model_dump(),
            learning_materials=[],
            roadmap=[],
            exercises=[],
            coding_tasks=[],
        )

    def _to_topic_response(self, topic: dict[str, Any]) -> TopicResponse:
        return TopicResponse(
            id=topic["id"],
            title=topic["title"],
            level=topic["level"],
            created_at=datetime.fromisoformat(topic["created_at"]),
            user_id=topic["user_id"],
        )
