from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from fastapi.testclient import TestClient

from backend.db.models import User, UserRole
from backend.dependencies import get_current_user, get_foundational_task_agent, get_topic_service
from backend.main import app


class FakeFoundationalTaskAgent:
    def __init__(self, response=None, error: Exception | None = None) -> None:
        self.response = response
        self.error = error
        self.calls: list[str] = []

    def generate_foundational_tasks(self, topic: str):
        self.calls.append(topic)
        if self.error:
            raise self.error
        return self.response


class FakeTopicService:
    def __init__(self, existing_tasks=None) -> None:
        self.existing_tasks = existing_tasks or []
        self.replace_calls = []

    def get_topic(self, user_id, topic_id):
        return SimpleNamespace(
            id=topic_id,
            title="Sorting",
            level="beginner",
            created_at=datetime.now(timezone.utc),
            user_id=str(user_id),
            learning_materials=[],
            roadmap=[],
            exercises=[],
            coding_tasks=self.existing_tasks,
        )

    def replace_coding_tasks(self, user_id, user_topic_id, tasks):
        self.replace_calls.append((str(user_id), user_topic_id, tasks))
        return [
            {
                "id": f"saved-{index}",
                "title": task.title,
                "task": task.task,
                "examples": [example.model_dump() for example in task.examples],
            }
            for index, task in enumerate(tasks)
        ]


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


def test_generate_foundational_tasks_returns_valid_response():
    agent = FakeFoundationalTaskAgent(
        {
            "topic": "Binary Search",
            "foundational_tasks": [
                {
                    "title": "Implement Binary Search",
                    "task": "Write a function that finds a target in a sorted array.",
                    "examples": [{"input": "nums = [1, 3, 5], target = 3", "output": "1"}],
                }
            ],
        }
    )
    app.dependency_overrides[get_current_user] = make_user
    app.dependency_overrides[get_foundational_task_agent] = lambda: agent

    response = TestClient(app).post("/api/topics/foundational-tasks", json={"topic": "Binary Search"})

    assert response.status_code == 200
    assert response.json()["topic"] == "Binary Search"
    assert response.json()["foundational_tasks"][0]["examples"][0]["output"] == "1"
    assert agent.calls == ["Binary Search"]
    app.dependency_overrides.clear()


def test_generate_foundational_tasks_rejects_empty_topic():
    app.dependency_overrides[get_current_user] = make_user
    app.dependency_overrides[get_foundational_task_agent] = lambda: FakeFoundationalTaskAgent({})

    response = TestClient(app).post("/api/topics/foundational-tasks", json={"topic": "   "})

    assert response.status_code == 422
    app.dependency_overrides.clear()


def test_generate_foundational_tasks_handles_invalid_agent_output():
    agent = FakeFoundationalTaskAgent({"topic": "Binary Search", "foundational_tasks": []})
    app.dependency_overrides[get_current_user] = make_user
    app.dependency_overrides[get_foundational_task_agent] = lambda: agent

    response = TestClient(app).post("/api/topics/foundational-tasks", json={"topic": "Binary Search"})

    assert response.status_code == 502
    assert "invalid task data" in response.json()["detail"].lower()
    app.dependency_overrides.clear()


def test_generate_foundational_tasks_handles_agent_failure():
    agent = FakeFoundationalTaskAgent(error=RuntimeError("llm unavailable"))
    app.dependency_overrides[get_current_user] = make_user
    app.dependency_overrides[get_foundational_task_agent] = lambda: agent

    response = TestClient(app).post("/api/topics/foundational-tasks", json={"topic": "Binary Search"})

    assert response.status_code == 502
    assert "unable to generate" in response.json()["detail"].lower()
    app.dependency_overrides.clear()


def test_topic_foundational_tasks_returns_saved_tasks_without_regenerating():
    saved_task = {
        "id": "saved-bubble-sort",
        "title": "Implement Bubble Sort",
        "task": "Sort an array using bubble sort.",
        "examples": [{"input": "[3, 1, 2]", "output": "[1, 2, 3]"}],
    }
    agent = FakeFoundationalTaskAgent(error=RuntimeError("should not be called"))
    service = FakeTopicService(existing_tasks=[saved_task])
    app.dependency_overrides[get_current_user] = make_user
    app.dependency_overrides[get_foundational_task_agent] = lambda: agent
    app.dependency_overrides[get_topic_service] = lambda: service

    response = TestClient(app).post(f"/api/topics/{uuid4()}/foundational-tasks", json={})

    assert response.status_code == 200
    assert response.json()["foundational_tasks"][0]["id"] == "saved-bubble-sort"
    assert agent.calls == []
    assert service.replace_calls == []
    app.dependency_overrides.clear()


def test_topic_foundational_tasks_generates_and_saves_when_empty():
    agent = FakeFoundationalTaskAgent(
        {
            "topic": "Sorting",
            "foundational_tasks": [
                {
                    "title": "Implement Bubble Sort",
                    "task": "Sort an array using bubble sort.",
                    "examples": [{"input": "[3, 1, 2]", "output": "[1, 2, 3]"}],
                }
            ],
        }
    )
    service = FakeTopicService()
    app.dependency_overrides[get_current_user] = make_user
    app.dependency_overrides[get_foundational_task_agent] = lambda: agent
    app.dependency_overrides[get_topic_service] = lambda: service

    response = TestClient(app).post(f"/api/topics/{uuid4()}/foundational-tasks", json={})

    assert response.status_code == 200
    assert response.json()["foundational_tasks"][0]["id"] == "saved-0"
    assert agent.calls == ["Sorting"]
    assert len(service.replace_calls) == 1
    app.dependency_overrides.clear()
