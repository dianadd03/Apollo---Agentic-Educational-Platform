from backend.agents.code_review_agent import REQUIRED_SECTIONS, enforce_review_contract
from backend.schemas.code_review import CodeReviewRequest


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
