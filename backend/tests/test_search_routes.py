from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from backend.db.models import User, UserRole
from backend.dependencies import get_current_user, get_material_search_service
from backend.main import app
from backend.schemas.search_results import (
    CandidateMaterial,
    SavedSearchResultResponse,
    SearchMaterialsResponse,
    SearchMetadata,
)


class FakeMaterialSearchService:
    def __init__(self, error: Exception | None = None) -> None:
        self.error = error
        self.search_calls: list[dict] = []
        self.history_calls: list[dict] = []
        self.single_history_calls: list[dict] = []

    async def search_materials(self, topic: str, current_user: User, max_results: int | None = None):
        self.search_calls.append({"topic": topic, "user_id": str(current_user.id), "max_results": max_results})
        if self.error:
            raise self.error
        return SearchMaterialsResponse(
            topic=topic,
            query_used=topic,
            results=[
                CandidateMaterial(
                    title="Graphs Guide",
                    url="https://example.com/graphs",
                    type="article",
                    source="example.com",
                    snippet="A concise graph guide.",
                    reason_for_inclusion="Matched the requested topic.",
                    confidence=0.9,
                    source_of_result="web",
                )
            ],
            search_metadata=SearchMetadata(total_results=1, coverage_source="web_only"),
        )

    def get_saved_results_for_topic(self, topic: str, current_user: User, limit: int = 10):
        self.history_calls.append({"topic": topic, "user_id": str(current_user.id), "limit": limit})
        return [
            SavedSearchResultResponse(
                id=str(uuid4()),
                topic=topic,
                topic_id=str(uuid4()),
                user_id=str(current_user.id),
                query_text=topic,
                coverage_source="web_only",
                created_at=datetime.now(timezone.utc),
                results=[],
            )
        ]

    def get_saved_result(self, search_result_id: str, current_user: User):
        self.single_history_calls.append({"search_result_id": search_result_id, "user_id": str(current_user.id)})
        if self.error:
            raise self.error
        return SavedSearchResultResponse(
            id=search_result_id,
            topic="Graphs",
            topic_id=str(uuid4()),
            user_id=str(current_user.id),
            query_text="Graphs",
            coverage_source="web_only",
            created_at=datetime.now(timezone.utc),
            results=[],
        )


def make_user() -> User:
    return User(
        id=uuid4(),
        email="student@apollo.dev",
        password_hash="hash",
        full_name="Student",
        role=UserRole.student,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def test_post_search_materials_calls_service_with_sanitized_payload():
    service = FakeMaterialSearchService()
    app.dependency_overrides[get_current_user] = make_user
    app.dependency_overrides[get_material_search_service] = lambda: service

    response = TestClient(app).post("/api/search-materials", json={"topic": "  Graphs  ", "max_results": 3})

    assert response.status_code == 200
    assert response.json()["results"][0]["title"] == "Graphs Guide"
    assert service.search_calls == [{"topic": "Graphs", "user_id": service.search_calls[0]["user_id"], "max_results": 3}]
    assert service.history_calls == []
    app.dependency_overrides.clear()


def test_post_search_materials_returns_502_for_unexpected_service_failure():
    service = FakeMaterialSearchService(error=Exception("network unavailable"))
    app.dependency_overrides[get_current_user] = make_user
    app.dependency_overrides[get_material_search_service] = lambda: service

    response = TestClient(app).post("/api/search-materials", json={"topic": "Graphs"})

    assert response.status_code == 502
    assert "unable to retrieve" in response.json()["detail"].lower()
    app.dependency_overrides.clear()


def test_history_route_reads_saved_results_without_running_search():
    service = FakeMaterialSearchService()
    app.dependency_overrides[get_current_user] = make_user
    app.dependency_overrides[get_material_search_service] = lambda: service

    response = TestClient(app).get("/api/search-materials/history?topic=Graphs&limit=2")

    assert response.status_code == 200
    assert response.json()[0]["topic"] == "Graphs"
    assert service.history_calls[0]["limit"] == 2
    assert service.search_calls == []
    app.dependency_overrides.clear()


def test_history_detail_route_maps_missing_saved_search_to_404():
    service = FakeMaterialSearchService(error=ValueError("Saved search result not found."))
    app.dependency_overrides[get_current_user] = make_user
    app.dependency_overrides[get_material_search_service] = lambda: service

    response = TestClient(app).get(f"/api/search-materials/history/{uuid4()}")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
    app.dependency_overrides.clear()
