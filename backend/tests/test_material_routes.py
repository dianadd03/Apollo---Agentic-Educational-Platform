from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from backend.db.models import MaterialSourceType, MaterialType, TopicLevel, User, UserRole
from backend.dependencies import get_current_user, get_material_service
from backend.main import app


class FakeMaterialService:
    def __init__(self) -> None:
        self.create_called = False
        self.update_called = False
        self.upload_called = False
        self.list_called = False

    def list_managed_materials(self, current_user):
        self.list_called = True
        if current_user.role == UserRole.student:
            raise PermissionError("Only professor or admin accounts can manage materials.")
        return [
            {
                "id": str(uuid4()),
                "canonical_name": "Managed notes",
                "link": None,
                "file_path": "backend/data/uploads/managed-notes.pdf",
                "material_type": MaterialType.pdf,
                "difficulty": TopicLevel.intermediate,
                "source_type": MaterialSourceType.admin_managed,
                "trust_score": 0.8,
                "quality_score": 0.75,
                "ease_score": 0.7,
                "summary": "Existing managed material",
                "is_published": True,
                "is_active": True,
                "is_verified": True,
                "like_count": 0,
                "user_has_liked": False,
                "tags": ["algorithms"],
                "topics": [],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
        ]

    def create_material(self, current_user, payload):
        self.create_called = True
        if current_user.role == UserRole.student:
            raise PermissionError("Only professor or admin accounts can manage materials.")
        return {
            "id": str(uuid4()),
            "canonical_name": payload.canonical_name,
            "link": payload.link,
            "file_path": payload.file_path,
            "material_type": payload.material_type,
            "difficulty": payload.difficulty,
            "source_type": payload.source_type or MaterialSourceType.professor_managed,
            "trust_score": payload.trust_score,
            "quality_score": payload.quality_score,
            "ease_score": payload.ease_score,
            "summary": payload.summary,
            "is_published": payload.is_published,
            "is_active": True,
            "is_verified": False,
            "like_count": 0,
            "user_has_liked": False,
            "tags": payload.tags,
            "topics": [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def upload_material(self, current_user, payload, upload):
        self.upload_called = True
        if current_user.role == UserRole.student:
            raise PermissionError("Only professor or admin accounts can manage materials.")
        return {
            "id": str(uuid4()),
            "canonical_name": payload.canonical_name,
            "link": None,
            "file_path": f"backend/data/uploads/{upload.filename}",
            "material_type": payload.material_type,
            "difficulty": payload.difficulty,
            "source_type": MaterialSourceType.professor_managed,
            "trust_score": payload.trust_score,
            "quality_score": payload.quality_score,
            "ease_score": payload.ease_score,
            "summary": payload.summary,
            "is_published": payload.is_published,
            "is_active": True,
            "is_verified": False,
            "like_count": 0,
            "user_has_liked": False,
            "tags": payload.tags,
            "topics": [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def update_material(self, material_id, current_user, payload):
        self.update_called = True
        if current_user.role == UserRole.student:
            raise PermissionError("Only professor or admin accounts can manage materials.")
        return {
            "id": material_id,
            "canonical_name": payload.canonical_name or "Updated material",
            "link": payload.link,
            "file_path": payload.file_path,
            "material_type": payload.material_type or MaterialType.article,
            "difficulty": payload.difficulty or TopicLevel.beginner,
            "source_type": MaterialSourceType.professor_managed,
            "trust_score": payload.trust_score or 0.5,
            "quality_score": payload.quality_score or 0.5,
            "ease_score": payload.ease_score or 0.5,
            "summary": payload.summary,
            "is_published": True,
            "is_active": True,
            "is_verified": False,
            "like_count": 0,
            "user_has_liked": False,
            "tags": payload.tags or [],
            "topics": [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }


def make_user(role: UserRole) -> User:
    return User(
        id=uuid4(),
        email=f"{role.value}@apollo.dev",
        password_hash="hash",
        full_name=role.value.title(),
        role=role,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def test_student_cannot_create_material():
    service = FakeMaterialService()
    app.dependency_overrides[get_current_user] = lambda: make_user(UserRole.student)
    app.dependency_overrides[get_material_service] = lambda: service

    client = TestClient(app)
    response = client.post(
        "/api/materials",
        json={
            "canonical_name": "Intro to DP",
            "link": "https://example.com/dp",
            "material_type": "article",
            "difficulty": "beginner",
            "tags": ["dynamic programming"],
            "topic_titles": ["Dynamic Programming"],
        },
    )

    assert response.status_code == 403
    assert service.create_called is True

    app.dependency_overrides.clear()


def test_professor_can_list_managed_materials():
    service = FakeMaterialService()
    app.dependency_overrides[get_current_user] = lambda: make_user(UserRole.professor)
    app.dependency_overrides[get_material_service] = lambda: service

    client = TestClient(app)
    response = client.get("/api/materials/managed")

    assert response.status_code == 200
    assert service.list_called is True
    assert response.json()[0]["canonical_name"] == "Managed notes"

    app.dependency_overrides.clear()


def test_professor_can_upload_material_file():
    service = FakeMaterialService()
    app.dependency_overrides[get_current_user] = lambda: make_user(UserRole.professor)
    app.dependency_overrides[get_material_service] = lambda: service

    client = TestClient(app)
    response = client.post(
        "/api/materials/upload",
        data={
            "canonical_name": "Lecture notes",
            "material_type": "pdf",
            "difficulty": "intermediate",
            "summary": "Uploaded by professor",
            "topic_titles": "Dynamic Programming, Algorithms",
            "tags": "dp, notes",
        },
        files={"file": ("lecture-notes.pdf", b"fake-pdf-content", "application/pdf")},
    )

    assert response.status_code == 201
    assert service.upload_called is True
    assert response.json()["canonical_name"] == "Lecture notes"
    assert response.json()["file_path"].endswith("lecture-notes.pdf")

    app.dependency_overrides.clear()


def test_professor_can_create_and_update_material():
    service = FakeMaterialService()
    app.dependency_overrides[get_current_user] = lambda: make_user(UserRole.professor)
    app.dependency_overrides[get_material_service] = lambda: service

    client = TestClient(app)
    create_response = client.post(
        "/api/materials",
        json={
            "canonical_name": "Intro to DP",
            "link": "https://example.com/dp",
            "material_type": "article",
            "difficulty": "beginner",
            "tags": ["dynamic programming"],
            "topic_titles": ["Dynamic Programming"],
        },
    )
    update_response = client.put(
        "/api/materials/material-123",
        json={
            "canonical_name": "Advanced DP",
            "difficulty": "advanced",
            "tags": ["dynamic programming", "optimization"],
        },
    )

    assert create_response.status_code == 201
    assert update_response.status_code == 200
    assert service.create_called is True
    assert service.update_called is True
    assert create_response.json()["canonical_name"] == "Intro to DP"
    assert update_response.json()["canonical_name"] == "Advanced DP"

    app.dependency_overrides.clear()
