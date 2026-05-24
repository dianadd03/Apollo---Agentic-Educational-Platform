import re

from langchain_ollama import ChatOllama

from backend.schemas.code_review import CodeReviewRequest


MODEL = "gpt-oss:120b-cloud"

REQUIRED_SECTIONS = [
    "Critical issues (must-fix)",
    "Important improvements (should-fix)",
    "Nice-to-haves",
    "Suggested tests (with expected results)",
]

LEGACY_SECTIONS = [
    "Summary",
    "Patch suggestions",
]

OPTIONAL_IMPROVEMENT_TOKENS = [
    "nice-to-have",
    "optional",
    "readability",
    "style",
    "naming",
    "comment",
    "format",
    "cosmetic",
    "cleaner",
]

TEST_FEEDBACK_TOKENS = [
    "input:",
    "output:",
    "expected",
    "should return",
    "assert",
    "test case",
    "test with",
    "add a test",
    "include a test",
    "example input",
]

SYSTEM_PROMPT = """
You are a senior software engineer and strict, student-friendly code reviewer.
You review student-submitted implementations for a given programming task.

The task statement is the source of truth.
Your main goal is to determine whether the submitted code correctly solves the task.

Assume you cannot run the code. Reason only from static inspection.

Review priorities, in this exact order:
1. Check whether the submitted code matches the task statement.
2. Check whether the required function/class name and signature are present.
3. Check syntax carefully for the declared language.
4. Check correctness, edge cases, constraints, complexity, and forbidden approaches.
5. Check robustness and maintainability.
6. Check readability and style only after correctness.

Important behavior:
- Do NOT reject valid code just because it is short, incomplete, or has bugs.
- If the submission contains actual source code, review it normally.
- If the submission is mostly natural language, logs, Markdown, stack traces, or pseudocode with no real source code, report this as a Critical issue.
- If the code solves a different problem than the task, report this as a Critical issue.
- If the required function/signature is missing or different from the task, report this as a Critical issue.
- If the task explicitly requires a specific algorithm and the code uses a different approach, report this as a Critical issue.
- If the task explicitly forbids built-in helpers and the code uses them, report this as a Critical issue.
- Obvious syntax errors are Critical issues.
- Do not invent issues. If something is correct, do not criticize it.

Severity rules:
- Critical issues (must-fix): syntax errors, code that will not parse/compile, wrong or missing required function/signature, solving the wrong task, forbidden built-ins, clearly wrong results, crashes, infinite loops, out-of-bounds access, missing return values.
- Important improvements (should-fix): important edge cases, constraint handling, complexity problems, robustness issues, maintainability issues that may affect correctness or scalability.
- Nice-to-haves: optional readability, naming, formatting, comments, small cleanup only.
- Suggested tests: concrete test cases only, with expected results.

Output Markdown with exactly these section headings, in this order:
- Critical issues (must-fix)
- Important improvements (should-fix)
- Nice-to-haves
- Suggested tests (with expected results)

Formatting rules:
- Do not mention the model name or runtime.
- Keep each bullet short and actionable.
- Every bullet in Critical issues, Important improvements, and Nice-to-haves must include a concrete "Suggestion:" clause.
- Start line-specific bullets with "Line X:" or "Lines X-Y:" using the numbered code provided by the user.
- If a finding applies to the whole solution, start it with "General:".
- Do not invent line numbers.
- Do not duplicate the same issue in multiple sections.
- Put examples, inputs, outputs, expected results, and assertions only in Suggested tests.
- Suggested tests must include at least 5 concrete cases with expected results.
- If a section has no issues, write exactly:
  - General: No specific issues found for this section.

Be strict about correctness, but do not over-penalize style.
Focus on whether the code solves the given task.
"""


class CodeReviewAgent:
    def __init__(self, model: str = MODEL) -> None:
        self.model = model
        self.llm = ChatOllama(model=model, temperature=0.0)

    def review_code(self, payload: CodeReviewRequest) -> str:
        response = self.llm.invoke(
            [
                ("system", SYSTEM_PROMPT),
                ("user", self._build_user_prompt(payload)),
            ]
        )
        return enforce_review_contract(str(response.content), payload)

    def _build_user_prompt(self, payload: CodeReviewRequest) -> str:
        context = f"\n\nOptional context / existing tests:\n{payload.context}" if payload.context else ""
        return (
            "Review the submitted code against the task statement.\n"
            "The task statement is the source of truth.\n\n"
            f"Task statement:\n{payload.task}\n\n"
            f"Declared language:\n{payload.language}\n\n"
            f"Submitted code:\n```{payload.language}\n{payload.code}\n```\n\n"
            f"Numbered code for line references:\n{_number_code(payload.code)}"
            f"{context}\n\n"
            "Important:\n"
            "- If the code does not match the task, say so in Critical issues.\n"
            "- If the required function/signature is missing, say so in Critical issues.\n"
            "- If syntax is invalid, say so in Critical issues.\n"
            "- Otherwise, review the code normally and focus on real correctness issues."
        )


def _number_code(code: str) -> str:
    return "\n".join(f"{index:>4}: {line}" for index, line in enumerate(code.splitlines(), start=1))


def enforce_review_contract(markdown: str, payload: CodeReviewRequest | None = None) -> str:
    cleaned = markdown.strip()
    if not cleaned:
        cleaned = _fallback_review(payload)

    section_bodies = {section: _extract_section(cleaned, section) for section in REQUIRED_SECTIONS}
    orphan_feedback = _orphan_feedback(cleaned, section_bodies)
    if orphan_feedback:
        for section, items in _classify_orphan_feedback(orphan_feedback).items():
            existing = section_bodies.get(section, "").strip()
            section_bodies[section] = "\n".join(part for part in [existing, "\n".join(items)] if part).strip()

    must_improvements, optional_improvements = _split_optional_improvements(section_bodies["Important improvements (should-fix)"])
    if optional_improvements:
        existing_nice = section_bodies.get("Nice-to-haves", "").strip()
        section_bodies["Important improvements (should-fix)"] = must_improvements
        section_bodies["Nice-to-haves"] = "\n".join(part for part in [existing_nice, optional_improvements] if part).strip()

    section_bodies = _move_test_feedback(section_bodies)
    section_bodies = _ensure_actionable_fallbacks(section_bodies, payload)

    normalized_sections: list[str] = []
    for section in REQUIRED_SECTIONS:
        body = section_bodies.get(section, "")
        if not body:
            body = "- No specific feedback provided for this section."
        normalized_sections.append(f"## {section}\n{body.strip()}")
    return "\n\n".join(normalized_sections)


def _fallback_review(payload: CodeReviewRequest | None) -> str:
    language = payload.language if payload else "the selected language"
    return (
        "## Critical issues (must-fix)\n"
        "- General: The reviewer returned no concrete blocking bug. Suggestion: Re-submit after checking the code against the task requirements and edge cases below.\n\n"
        "## Important improvements (should-fix)\n"
        f"- General: Verify that the {language} solution handles base cases, invalid or empty inputs, and impossible results exactly as the task asks. Suggestion: Add explicit guards before the main algorithm.\n"
        "- General: Confirm the algorithm fits the expected constraints, not just the sample cases. Suggestion: State the intended time and space complexity, then compare it with the largest input size.\n\n"
        "## Nice-to-haves\n"
        "- General: Make important variables describe their role in the algorithm. Suggestion: Prefer names that reflect the problem domain over single-letter placeholders when the meaning is not obvious.\n\n"
        "## Suggested tests (with expected results)\n"
        "- Minimum valid input: use the smallest input allowed by the task; expected result should match the base-case definition.\n"
        "- Typical sample input: use a normal case from the problem statement; expected result should match the provided sample.\n"
        "- Edge case with empty or missing data: expected result should be the task's documented fallback or error behavior.\n"
        "- Impossible or no-solution case: expected result should be the task's required sentinel value or empty result.\n"
        "- Larger stress case: expected result should remain correct within the intended complexity."
    )


def _ensure_actionable_fallbacks(section_bodies: dict[str, str], payload: CodeReviewRequest | None) -> dict[str, str]:
    if any(_has_specific_feedback(body) for body in section_bodies.values()):
        return section_bodies

    fallback = _fallback_review(payload)
    return {section: _extract_section(fallback, section) for section in REQUIRED_SECTIONS}


def _has_specific_feedback(body: str) -> bool:
    cleaned = body.strip().lower()
    if not cleaned:
        return False
    empty_markers = [
        "no review content was produced",
        "no specific feedback provided",
        "no feedback",
        "no issues",
        "nothing to report",
    ]
    return not any(marker in cleaned for marker in empty_markers)


def _extract_section(markdown: str, section: str) -> str:
    headings = "|".join(re.escape(item) for item in [*REQUIRED_SECTIONS, *LEGACY_SECTIONS])
    heading_prefix = r"(?:#+\s*)?(?:\*\*)?"
    heading_suffix = r"(?:\*\*)?:?\s*"
    pattern = re.compile(
        rf"(?:^|\n){heading_prefix}{re.escape(section)}{heading_suffix}\n"
        rf"(?P<body>.*?)(?=\n{heading_prefix}(?:{headings}){heading_suffix}\n|\Z)",
        re.IGNORECASE | re.DOTALL,
    )
    match = pattern.search(markdown)
    return match.group("body").strip() if match else ""


def _orphan_feedback(markdown: str, section_bodies: dict[str, str]) -> list[str]:
    legacy_text = "\n".join(_extract_section(markdown, section) for section in LEGACY_SECTIONS)
    if legacy_text.strip():
        return _feedback_lines(legacy_text)

    if any(body.strip() for body in section_bodies.values()):
        return []

    return _feedback_lines(markdown)


def _feedback_lines(text: str) -> list[str]:
    lines = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or line.startswith("```"):
            continue
        line = re.sub(r"^[-*]\s+", "", line).strip()
        if line:
            lines.append(f"- {line}")
    return lines


def _classify_orphan_feedback(lines: list[str]) -> dict[str, list[str]]:
    classified = {section: [] for section in REQUIRED_SECTIONS}
    for line in lines:
        lower = line.lower()
        if any(token in lower for token in ["bug", "incorrect", "wrong", "fails", "error", "out of bounds", "infinite", "crash", "does not return", "missing return"]):
            classified["Critical issues (must-fix)"].append(line)
        elif _is_test_feedback(line):
            classified["Suggested tests (with expected results)"].append(line)
        elif _is_optional_improvement(line):
            classified["Nice-to-haves"].append(line)
        else:
            classified["Important improvements (should-fix)"].append(line)
    return classified


def _split_optional_improvements(body: str) -> tuple[str, str]:
    must_fix: list[str] = []
    optional: list[str] = []
    for line in body.splitlines():
        target = optional if _is_optional_improvement(line) else must_fix
        target.append(line)
    return "\n".join(must_fix).strip(), "\n".join(optional).strip()


def _is_optional_improvement(text: str) -> bool:
    lower = text.lower()
    return any(token in lower for token in OPTIONAL_IMPROVEMENT_TOKENS)


def _move_test_feedback(section_bodies: dict[str, str]) -> dict[str, str]:
    test_items: list[str] = []
    for section in ["Critical issues (must-fix)", "Important improvements (should-fix)", "Nice-to-haves"]:
        kept: list[str] = []
        for line in section_bodies.get(section, "").splitlines():
            if _is_test_feedback(line):
                test_items.append(line)
            else:
                kept.append(line)
        section_bodies[section] = "\n".join(kept).strip()

    if test_items:
        existing_tests = section_bodies.get("Suggested tests (with expected results)", "").strip()
        section_bodies["Suggested tests (with expected results)"] = "\n".join(part for part in [existing_tests, "\n".join(test_items)] if part).strip()
    return section_bodies


def _is_test_feedback(text: str) -> bool:
    lower = text.lower()
    return any(token in lower for token in TEST_FEEDBACK_TOKENS)
