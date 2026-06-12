from datetime import datetime, timezone
from unittest.mock import MagicMock
from uuid import uuid4

from backend.db.models import Material, MaterialSourceType, MaterialType, TopicLevel, TrustLevel, User, UserRole
from backend.services.material_service import MaterialService


def test_material_response_excludes_like_state():
    material = Material(
        id=uuid4(),
        canonical_name="DP guide",
        link="https://example.com/dp",
        material_type=MaterialType.article,
        difficulty=TopicLevel.beginner,
        source_type=MaterialSourceType.professor_managed,
        trust_level=TrustLevel.high,
        trust_score=0.9,
        quality_score=0.8,
        ease_score=0.7,
        summary="summary",
        is_published=True,
        is_active=True,
        is_verified=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    material.tags = []
    material.topic_links = []

    response = MaterialService(MagicMock()).to_material_response(material, uuid4())

    payload = response.model_dump()
    assert "like_count" not in payload
    assert "user_has_liked" not in payload


def test_admin_delete_material_removes_saved_search_items_before_material():
    db = MagicMock()
    material = Material(
        id=uuid4(),
        canonical_name="DP guide",
        link="https://example.com/dp",
        material_type=MaterialType.article,
        difficulty=TopicLevel.beginner,
        source_type=MaterialSourceType.admin_managed,
        trust_level=TrustLevel.high,
        trust_score=0.9,
        quality_score=0.8,
        ease_score=0.7,
        is_published=True,
        is_active=True,
        is_verified=False,
    )
    user = User(
        id=uuid4(),
        email="admin@apollo.dev",
        password_hash="hash",
        full_name="Admin",
        role=UserRole.admin,
    )
    service = MaterialService(db)
    service._get_material = MagicMock(return_value=material)

    service.delete_material(material.id, user)

    assert db.execute.called is True
    db.delete.assert_called_once_with(material)
    db.commit.assert_called_once()
