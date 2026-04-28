from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db.models import Topic, UserTopic
from backend.schemas.topics import TopicCreateRequest, TopicDetailResponse, TopicResponse


class TopicService:
    def __init__(self, db: Session) -> None:
        self._db = db

    def list_topics(self, user_id: str | UUID) -> list[TopicResponse]:
        user_uuid = self._ensure_uuid(user_id)
        stmt = (
            select(UserTopic, Topic)
            .join(Topic, Topic.id == UserTopic.topic_id)
            .where(UserTopic.user_id == user_uuid)
            .order_by(UserTopic.created_at.desc())
        )
        rows = self._db.execute(stmt).all()
        return [self._to_topic_response(user_topic, topic) for user_topic, topic in rows]

    def create_topic(self, user_id: str | UUID, payload: TopicCreateRequest) -> TopicResponse:
        user_uuid = self._ensure_uuid(user_id)
        slug = self._slugify(payload.title)
        topic = self._db.scalar(select(Topic).where(Topic.slug == slug))
        if not topic:
            topic = Topic(slug=slug, title=payload.title)
            self._db.add(topic)
            self._db.flush()

        user_topic = self._db.scalar(
            select(UserTopic).where(UserTopic.user_id == user_uuid, UserTopic.topic_id == topic.id)
        )
        if user_topic:
            user_topic.level = payload.level
            user_topic.updated_at = datetime.now(timezone.utc)
        else:
            user_topic = UserTopic(user_id=user_uuid, topic_id=topic.id, level=payload.level)
            self._db.add(user_topic)

        self._db.commit()
        self._db.refresh(user_topic)
        self._db.refresh(topic)
        return self._to_topic_response(user_topic, topic)

    def get_topic(self, user_id: str | UUID, topic_id: str | UUID) -> TopicDetailResponse | None:
        user_uuid = self._ensure_uuid(user_id)
        topic_uuid = self._ensure_uuid(topic_id)
        stmt = (
            select(UserTopic, Topic)
            .join(Topic, Topic.id == UserTopic.topic_id)
            .where(UserTopic.user_id == user_uuid, UserTopic.id == topic_uuid)
        )
        row = self._db.execute(stmt).first()
        if not row:
            return None
        user_topic, topic = row
        return TopicDetailResponse(
            **self._to_topic_response(user_topic, topic).model_dump(),
            learning_materials=[],
            roadmap=[],
            exercises=[],
            coding_tasks=[],
        )

    def _to_topic_response(self, user_topic: UserTopic, topic: Topic) -> TopicResponse:
        return TopicResponse(
            id=str(user_topic.id),
            title=topic.title,
            level=user_topic.level,
            created_at=user_topic.created_at,
            user_id=str(user_topic.user_id),
        )

    def _ensure_uuid(self, value: str | UUID) -> UUID:
        return value if isinstance(value, UUID) else UUID(value)

    def _slugify(self, value: str) -> str:
        return "-".join(part for part in "".join(char.lower() if char.isalnum() else "-" for char in value).split("-") if part)
