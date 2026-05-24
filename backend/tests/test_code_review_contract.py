from backend.agents.code_review_agent import CodeReviewAgent, REQUIRED_SECTIONS, enforce_review_contract
from backend.schemas.code_review import CodeReviewRequest


class FakeReviewResponse:
    def __init__(self, content: str) -> None:
        self.content = content


class FakeReviewLlm:
    def __init__(self, content: str) -> None:
        self.content = content
        self.messages = None

    def invoke(self, messages):
        self.messages = messages
        return FakeReviewResponse(self.content)


def make_payload() -> CodeReviewRequest:
    return CodeReviewRequest(
        task="Return the index of target in a sorted array or -1.",
        code="def search(nums, target):\n    return 0",
        language="Python",
    )


def section_body(review: str, section: str) -> str:
    marker = f"## {section}"
    start = review.index(marker) + len(marker)
    next_starts = [review.index(f"## {item}", start) for item in REQUIRED_SECTIONS if f"## {item}" in review[start:]]
    end = min(next_starts) if next_starts else len(review)
    return review[start:end]


def test_enforce_review_contract_adds_all_required_sections_in_order():
    review = enforce_review_contract(
        """
Critical issues (must-fix)
- Line 2: Always returns 0. Suggestion: Return -1 when the target is missing.
""",
        make_payload(),
    )

    positions = [review.index(f"## {section}") for section in REQUIRED_SECTIONS]
    assert positions == sorted(positions)
    for section in REQUIRED_SECTIONS:
        assert f"## {section}" in review
    assert "Always returns 0" in review


def test_legacy_summary_feedback_is_reclassified_into_modern_sections():
    review = enforce_review_contract(
        """
## Summary
- Line 2: Wrong result when the target is absent.
- Add a test with input [1, 3], target 2; expected -1.
- Optional readability cleanup: rename nums to sorted_values.
""",
        make_payload(),
    )

    critical = section_body(review, "Critical issues (must-fix)")
    tests = section_body(review, "Suggested tests (with expected results)")
    nice = section_body(review, "Nice-to-haves")

    assert "Wrong result" in critical
    assert "expected -1" in tests
    assert "Optional readability cleanup" in nice
    assert "## Summary" not in review


def test_test_feedback_is_moved_out_of_correctness_sections():
    review = enforce_review_contract(
        """
## Critical issues (must-fix)
- Line 2: Missing case for target not found. Suggestion: Return -1 after the loop.
- Test with nums=[1], target=2; expected -1.

## Important improvements (should-fix)
- General: Validate empty input. Suggestion: Return -1 immediately.

## Nice-to-haves
- General: Rename f to binary_search. Suggestion: Use a descriptive name.

## Suggested tests (with expected results)
- Input nums=[1], target=1; expected 0.
""",
        make_payload(),
    )

    critical = section_body(review, "Critical issues (must-fix)")
    tests = section_body(review, "Suggested tests (with expected results)")

    assert "Missing case" in critical
    assert "Test with nums=[1], target=2" not in critical
    assert "Test with nums=[1], target=2" in tests
    assert "Input nums=[1], target=1" in tests


def test_empty_review_uses_actionable_fallback_with_payload_context():
    review = enforce_review_contract("", make_payload())

    assert "Python solution" in review
    assert "Minimum valid input" in review
    assert "No specific feedback provided" not in review


def make_agent_with_response(content: str) -> CodeReviewAgent:
    agent = CodeReviewAgent.__new__(CodeReviewAgent)
    agent.model = "test-model"
    agent.llm = FakeReviewLlm(content)
    return agent


def test_review_code_preserves_non_code_submission_as_critical():
    payload = CodeReviewRequest(
        task="Implement bubble_sort(arr) and return the sorted list.",
        code="This solution sorts the array by repeatedly swapping adjacent items.",
        language="Python",
    )
    agent = make_agent_with_response(
        """
## Critical issues (must-fix)
- General: The submission is natural language rather than source code, so it cannot be reviewed as a valid Python implementation. Suggestion: Submit the complete `bubble_sort(arr)` function as Python source code.

## Important improvements (should-fix)
- General: No specific issues found for this section.

## Nice-to-haves
- General: No specific issues found for this section.

## Suggested tests (with expected results)
- Call `bubble_sort([])`; expected `[]`.
- Call `bubble_sort([1])`; expected `[1]`.
- Call `bubble_sort([2, 1])`; expected `[1, 2]`.
- Call `bubble_sort([3, 1, 2])`; expected `[1, 2, 3]`.
- Call `bubble_sort([2, 2, 1])`; expected `[1, 2, 2]`.
"""
    )

    review = agent.review_code(payload)

    critical = section_body(review, "Critical issues (must-fix)")
    assert "natural language rather than source code" in critical
    assert "Suggestion:" in critical
    assert "## Suggested tests (with expected results)" in review
    assert "This solution sorts the array" in agent.llm.messages[1][1]


def test_review_code_flags_python_syntax_error_as_critical():
    payload = CodeReviewRequest(
        task="Implement bubble_sort(arr) and return the sorted list.",
        code="def bubble_sort(arr)\n    return arr",
        language="Python",
    )
    agent = make_agent_with_response(
        """
## Critical issues (must-fix)
- Line 1: Missing colon after the function definition, so the Python code will not parse. Suggestion: Change it to `def bubble_sort(arr):`.

## Important improvements (should-fix)
- General: No specific issues found for this section.

## Nice-to-haves
- General: No specific issues found for this section.

## Suggested tests (with expected results)
- Call `bubble_sort([])`; expected `[]`.
- Call `bubble_sort([1])`; expected `[1]`.
- Call `bubble_sort([2, 1])`; expected `[1, 2]`.
- Call `bubble_sort([3, 1, 2])`; expected `[1, 2, 3]`.
- Call `bubble_sort([2, 2, 1])`; expected `[1, 2, 2]`.
"""
    )

    review = agent.review_code(payload)

    critical = section_body(review, "Critical issues (must-fix)")
    assert "Line 1:" in critical
    assert "will not parse" in critical
    assert "Suggestion:" in critical


def test_user_prompt_emphasizes_task_statement_as_source_of_truth():
    payload = make_payload()
    agent = CodeReviewAgent.__new__(CodeReviewAgent)

    prompt = agent._build_user_prompt(payload)

    assert "source of truth" in prompt
    assert "Task statement:" in prompt
    assert "Submitted code:" in prompt
    assert "Numbered code for line references:" in prompt
