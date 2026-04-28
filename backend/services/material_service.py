from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import UploadFile
from sqlalchemy import Select, delete, select
from sqlalchemy.orm import Session, selectinload

from backend.config import get_settings
from backend.db.models import (
    Material,
    MaterialLike,
    MaterialSourceType,
    MaterialTag,
    MaterialTopicLink,
    TeacherAdminProfile,
    Topic,
    TrustLevel,
    User,
    UserRole,
)
from backend.schemas.materials import (
    MaterialActivationRequest,
    MaterialCreateRequest,
    MaterialLikeResponse,
    MaterialResponse,
    MaterialUpdateRequest,
    MaterialUploadRequest,
    MaterialVerificationRequest,
    TopicSummary,
)


class MaterialService:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._settings = get_settings()

    def list_managed_materials(self, current_user: User) -> list[MaterialResponse]:
        self._require_staff_profile(current_user)
        stmt: Select[tuple[Material]] = (
            select(Material)
            .options(
                selectinload(Material.tags),
                selectinload(Material.likes),
                selectinload(Material.topic_links).selectinload(MaterialTopicLink.topic),
            )
            .where(Material.source_type.in_([MaterialSourceType.professor_managed, MaterialSourceType.admin_managed]))
            .order_by(Material.updated_at.desc(), Material.created_at.desc())
        )
        materials = self._db.scalars(stmt).all()
        return [self.to_material_response(material, current_user.id) for material in materials]

    def create_material(self, current_user: User, payload: MaterialCreateRequest) -> MaterialResponse:
        staff_profile = self._require_staff_profile(current_user)
        topics = self._get_or_create_topics(payload.topic_titles)
        material = Material(
            topic_id=topics[0].id if topics else None,
            submitted_by_staff_id=staff_profile.id,
            canonical_name=payload.canonical_name,
            link=payload.link,
            file_path=payload.file_path,
            material_type=payload.material_type,
            difficulty=payload.difficulty,
            source_type=payload.source_type or self._source_type_for_user(current_user),
            trust_level=TrustLevel.medium,
            trust_score=payload.trust_score,
            quality_score=payload.quality_score,
            ease_score=payload.ease_score,
            summary=payload.summary,
            is_published=payload.is_published,
            is_active=True,
        )
        self._db.add(material)
        self._db.flush()
        self._sync_topics(material, topics)
        self._sync_tags(material, payload.tags)
        self._db.commit()
        material = self._load_material(material.id)
        return self.to_material_response(material, current_user.id)

    def upload_material(self, current_user: User, payload: MaterialUploadRequest, upload: UploadFile) -> MaterialResponse:
        staff_profile = self._require_staff_profile(current_user)
        if not upload.filename:
            raise ValueError("A file must be selected for upload.")

        upload_path = self._store_upload(upload)
        topics = self._get_or_create_topics(payload.topic_titles)
        material = Material(
            topic_id=topics[0].id if topics else None,
            submitted_by_staff_id=staff_profile.id,
            canonical_name=payload.canonical_name,
            file_path=upload_path,
            material_type=payload.material_type,
            difficulty=payload.difficulty,
            source_type=self._source_type_for_user(current_user),
            trust_level=TrustLevel.high,
            trust_score=payload.trust_score,
            quality_score=payload.quality_score,
            ease_score=payload.ease_score,
            summary=payload.summary,
            is_published=payload.is_published,
            is_active=True,
            metadata_json={"uploaded_filename": upload.filename},
        )
        self._db.add(material)
        self._db.flush()
        self._sync_topics(material, topics)
        self._sync_tags(material, payload.tags)
        self._db.commit()
        material = self._load_material(material.id)
        return self.to_material_response(material, current_user.id)

    def update_material(self, material_id: str | UUID, current_user: User, payload: MaterialUpdateRequest) -> MaterialResponse:
        self._require_staff_profile(current_user)
        material = self._get_material(material_id)

        for field in (
            "canonical_name",
            "link",
            "file_path",
            "material_type",
            "difficulty",
            "summary",
            "quality_score",
            "ease_score",
            "trust_score",
            "is_published",
        ):
            value = getattr(payload, field)
            if value is not None:
                setattr(material, field, value)

        if payload.topic_titles is not None:
            topics = self._get_or_create_topics(payload.topic_titles)
            material.topic_id = topics[0].id if topics else None
            self._sync_topics(material, topics)
        if payload.tags is not None:
            self._sync_tags(material, payload.tags)

        material.updated_at = datetime.now(timezone.utc)
        self._db.commit()
        material = self._load_material(material.id)
        return self.to_material_response(material, current_user.id)

    def set_material_verification(
        self,
        material_id: str | UUID,
        current_user: User,
        payload: MaterialVerificationRequest,
    ) -> MaterialResponse:
        self._require_staff_profile(current_user)
        material = self._get_material(material_id)
        material.is_verified = payload.verified
        material.verified_at = datetime.now(timezone.utc) if payload.verified else None
        material.verified_by_user_id = current_user.id if payload.verified else None
        material.trust_level = TrustLevel.verified if payload.verified else TrustLevel.high
        material.updated_at = datetime.now(timezone.utc)
        self._db.commit()
        material = self._load_material(material.id)
        return self.to_material_response(material, current_user.id)

    def set_material_active(
        self,
        material_id: str | UUID,
        current_user: User,
        payload: MaterialActivationRequest,
    ) -> MaterialResponse:
        self._require_staff_profile(current_user)
        material = self._get_material(material_id)
        material.is_active = payload.is_active
        material.updated_at = datetime.now(timezone.utc)
        self._db.commit()
        material = self._load_material(material.id)
        return self.to_material_response(material, current_user.id)

    def like_material(self, material_id: str | UUID, current_user: User) -> MaterialLikeResponse:
        material = self._get_material(material_id)
        existing_like = self._db.scalar(
            select(MaterialLike).where(MaterialLike.material_id == material.id, MaterialLike.user_id == current_user.id)
        )
        if existing_like:
            raise ValueError("You have already liked this material.")

        self._db.add(MaterialLike(material_id=material.id, user_id=current_user.id))
        self._db.commit()
        return self._to_like_response(material.id, current_user.id)

    def unlike_material(self, material_id: str | UUID, current_user: User) -> MaterialLikeResponse:
        material_uuid = self._ensure_uuid(material_id)
        self._db.execute(
            delete(MaterialLike).where(MaterialLike.material_id == material_uuid, MaterialLike.user_id == current_user.id)
        )
        self._db.commit()
        return self._to_like_response(material_uuid, current_user.id)

    def to_material_response(self, material: Material, current_user_id: UUID | None = None) -> MaterialResponse:
        like_count = len(material.likes)
        user_has_liked = any(like.user_id == current_user_id for like in material.likes) if current_user_id else False
        return MaterialResponse(
            id=str(material.id),
            canonical_name=material.canonical_name,
            link=material.link,
            file_path=material.file_path,
            material_type=material.material_type,
            difficulty=material.difficulty,
            source_type=material.source_type,
            trust_score=float(material.trust_score or 0),
            quality_score=float(material.quality_score or 0),
            ease_score=float(material.ease_score or 0),
            summary=material.summary,
            is_published=material.is_published,
            is_active=material.is_active,
            is_verified=material.is_verified,
            like_count=like_count,
            user_has_liked=user_has_liked,
            tags=[tag.category for tag in material.tags],
            topics=[
                TopicSummary(id=str(link.topic.id), title=link.topic.title, slug=link.topic.slug)
                for link in material.topic_links
                if link.topic is not None
            ],
            created_at=material.created_at,
            updated_at=material.updated_at,
        )

    def _store_upload(self, upload: UploadFile) -> str:
        uploads_dir = Path(self._settings.uploads_dir)
        uploads_dir.mkdir(parents=True, exist_ok=True)
        original_name = Path(upload.filename or "upload.bin").name
        destination = uploads_dir / f"{uuid4()}_{original_name}"
        with destination.open("wb") as target:
            upload.file.seek(0)
            shutil.copyfileobj(upload.file, target)
        return destination.as_posix()

    def _to_like_response(self, material_id: UUID, current_user_id: UUID) -> MaterialLikeResponse:
        material = self._load_material(material_id)
        return MaterialLikeResponse(
            material_id=str(material.id),
            like_count=len(material.likes),
            user_has_liked=any(like.user_id == current_user_id for like in material.likes),
        )

    def _get_material(self, material_id: str | UUID) -> Material:
        material = self._load_material(material_id)
        if material is None:
            raise ValueError("Material not found.")
        return material

    def _load_material(self, material_id: str | UUID) -> Material | None:
        stmt: Select[tuple[Material]] = (
            select(Material)
            .options(
                selectinload(Material.tags),
                selectinload(Material.likes),
                selectinload(Material.topic_links).selectinload(MaterialTopicLink.topic),
            )
            .where(Material.id == self._ensure_uuid(material_id))
        )
        return self._db.scalar(stmt)

    def _sync_topics(self, material: Material, topics: list[Topic]) -> None:
        existing_by_topic_id = {link.topic_id: link for link in material.topic_links}
        desired_topic_ids = {topic.id for topic in topics}

        for topic_id, link in list(existing_by_topic_id.items()):
            if topic_id not in desired_topic_ids:
                material.topic_links.remove(link)
                self._db.delete(link)

        for topic in topics:
            if topic.id not in existing_by_topic_id:
                material.topic_links.append(MaterialTopicLink(material_id=material.id, topic_id=topic.id, topic=topic))

    def _sync_tags(self, material: Material, tags: list[str]) -> None:
        normalized_tags = [tag.strip() for tag in tags if tag and tag.strip()]
        existing_by_category = {tag.category.lower(): tag for tag in material.tags}
        desired_categories = {tag.lower() for tag in normalized_tags}

        for category, tag in list(existing_by_category.items()):
            if category not in desired_categories:
                material.tags.remove(tag)
                self._db.delete(tag)

        for tag_value in normalized_tags:
            lookup_key = tag_value.lower()
            if lookup_key in existing_by_category:
                existing_by_category[lookup_key].category = tag_value
                existing_by_category[lookup_key].relevance = 1.0
            else:
                material.tags.append(MaterialTag(category=tag_value, relevance=1.0))

    def _get_or_create_topics(self, topic_titles: list[str]) -> list[Topic]:
        topics: list[Topic] = []
        for title in topic_titles:
            cleaned_title = title.strip()
            if not cleaned_title:
                continue
            slug = self._slugify(cleaned_title)
            topic = self._db.scalar(select(Topic).where(Topic.slug == slug))
            if not topic:
                topic = Topic(slug=slug, title=cleaned_title)
                self._db.add(topic)
                self._db.flush()
            topics.append(topic)
        return topics

    def _require_staff_profile(self, current_user: User) -> TeacherAdminProfile:
        if current_user.role not in {UserRole.professor, UserRole.admin}:
            raise PermissionError("Only professor or admin accounts can manage materials.")

        if current_user.staff_profile is not None:
            return current_user.staff_profile

        staff_profile = TeacherAdminProfile(user_id=current_user.id, staff_role=current_user.role.value)
        self._db.add(staff_profile)
        self._db.flush()
        current_user.staff_profile = staff_profile
        return staff_profile

    def _source_type_for_user(self, current_user: User) -> MaterialSourceType:
        if current_user.role == UserRole.admin:
            return MaterialSourceType.admin_managed
        return MaterialSourceType.professor_managed

    def _ensure_uuid(self, value: str | UUID) -> UUID:
        return value if isinstance(value, UUID) else UUID(value)

    def _slugify(self, value: str) -> str:
        return "-".join(part for part in "".join(char.lower() if char.isalnum() else "-" for char in value).split("-") if part)
