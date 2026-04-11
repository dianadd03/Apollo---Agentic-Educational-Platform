from datetime import datetime, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from backend.db.models import Material, MaterialLike, MaterialSourceType, MaterialType, TopicLevel, TrustLevel, User, UserRole
from backend.services.material_service import MaterialService


@pytest.fixture()
def sample_user() -> User:
    return User(
        id=uuid4(),
        email="student@apollo.dev",
        password_hash="hash",
        full_name="Student",
        role=UserRole.student,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def test_like_material_prevents_duplicates(sample_user: User):
    db = MagicMock()
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
    )
    material.likes = []
    material.tags = []
    material.topic_links = []

    service = MaterialService(db)
    service._get_material = lambda material_id: material
    db.scalar.return_value = MaterialLike(material_id=material.id, user_id=sample_user.id)

    with pytest.raises(ValueError, match="already liked"):
        service.like_material(material.id, sample_user)

    db.add.assert_not_called()
