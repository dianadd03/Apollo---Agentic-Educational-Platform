from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from backend.db.models import User, UserRole
from backend.dependencies import get_current_user, get_foundational_task_agent
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
