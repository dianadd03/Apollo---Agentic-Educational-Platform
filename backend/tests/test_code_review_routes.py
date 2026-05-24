from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from backend.agents.code_review_agent import REQUIRED_SECTIONS, enforce_review_contract
from backend.db.models import User, UserRole
from backend.dependencies import get_code_review_agent, get_current_user
from backend.main import app


class FakeCodeReviewAgent:
    model = "qwen2.5-coder:3b"

    def __init__(self, response: str = "", error: Exception | None = None) -> None:
        self.response = response
        self.error = error
        self.calls = []

    def review_code(self, payload):
        self.calls.append(payload)
        if self.error:
            raise self.error
        return enforce_review_contract(self.response)


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


def test_review_code_returns_contract_sections():
    agent = FakeCodeReviewAgent(
        """
## Critical issues (must-fix)
- Missing impossible-case handling.
"""
    )
    app.dependency_overrides[get_current_user] = make_user
    app.dependency_overrides[get_code_review_agent] = lambda: agent

    response = TestClient(app).post(
        "/api/code-review",
        json={"task": "Return min coins or -1.", "code": "def f():\n    return 0", "language": "Python"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["model"] == "qwen2.5-coder:3b"
    for section in REQUIRED_SECTIONS:
        assert f"## {section}" in body["review_markdown"]
    assert agent.calls[0].task == "Return min coins or -1."
    app.dependency_overrides.clear()


def test_review_code_preserves_legacy_summary_feedback():
    agent = FakeCodeReviewAgent(
        """
## Summary
- Line 3: Wrong comparison causes the sort to skip swaps.
- Missing test for an already sorted array.
"""
    )
    app.dependency_overrides[get_current_user] = make_user
    app.dependency_overrides[get_code_review_agent] = lambda: agent

    response = TestClient(app).post(
        "/api/code-review",
        json={"task": "Sort the array.", "code": "def f(a):\n    return a", "language": "Python"},
    )

    assert response.status_code == 200
    review = response.json()["review_markdown"]
    assert "## Critical issues (must-fix)" in review
    assert "Wrong comparison" in review
    assert "## Suggested tests (with expected results)" in review
    assert "already sorted array" in review
    assert "## Summary" not in review
    app.dependency_overrides.clear()


def test_review_code_moves_optional_improvements_to_nice_to_haves():
    agent = FakeCodeReviewAgent(
        """
## Important improvements (should-fix)
- Line 4: Validate empty input before indexing the list.
- General: Optional readability cleanup: rename x to sorted_values.
"""
    )
    app.dependency_overrides[get_current_user] = make_user
    app.dependency_overrides[get_code_review_agent] = lambda: agent

    response = TestClient(app).post(
        "/api/code-review",
        json={"task": "Sort the array.", "code": "def f(x):\n    return x", "language": "Python"},
    )

    assert response.status_code == 200
    review = response.json()["review_markdown"]
    important = review.split("## Important improvements (should-fix)", 1)[1].split("## Nice-to-haves", 1)[0]
    nice = review.split("## Nice-to-haves", 1)[1].split("## Suggested tests (with expected results)", 1)[0]
    assert "Validate empty input" in important
    assert "Optional readability cleanup" not in important
    assert "Optional readability cleanup" in nice
    app.dependency_overrides.clear()


def test_review_code_empty_agent_response_returns_actionable_fallback():
    agent = FakeCodeReviewAgent("")
    app.dependency_overrides[get_current_user] = make_user
    app.dependency_overrides[get_code_review_agent] = lambda: agent

    response = TestClient(app).post(
        "/api/code-review",
        json={"task": "Return min coins or -1.", "code": "def f():\n    return 0", "language": "Python"},
    )

    assert response.status_code == 200
    review = response.json()["review_markdown"]
    assert "Suggestion:" in review
    assert "## Suggested tests (with expected results)" in review
    assert "Minimum valid input" in review
    assert "No specific feedback provided" not in review
    app.dependency_overrides.clear()


def test_review_code_rejects_empty_code():
    app.dependency_overrides[get_current_user] = make_user
    app.dependency_overrides[get_code_review_agent] = lambda: FakeCodeReviewAgent()

    response = TestClient(app).post(
        "/api/code-review",
        json={"task": "Return min coins or -1.", "code": "   ", "language": "Python"},
    )

    assert response.status_code == 422
    app.dependency_overrides.clear()


def test_review_code_handles_agent_failure():
    app.dependency_overrides[get_current_user] = make_user
    app.dependency_overrides[get_code_review_agent] = lambda: FakeCodeReviewAgent(error=RuntimeError("ollama unavailable"))

    response = TestClient(app).post(
        "/api/code-review",
        json={"task": "Return min coins or -1.", "code": "def f():\n    return 0", "language": "Python"},
    )

    assert response.status_code == 502
    assert "unable to review code" in response.json()["detail"].lower()
    app.dependency_overrides.clear()
