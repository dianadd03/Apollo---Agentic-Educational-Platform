"""Normalize platform-specific difficulty into a 1..10 scale + TopicLevel label."""

from __future__ import annotations

from backend.db.models import TopicLevel


def difficulty_to_label(score: int) -> TopicLevel:
    if score <= 3:
        return TopicLevel.beginner
    if score <= 6:
        return TopicLevel.intermediate
    return TopicLevel.advanced


def normalize_codeforces(rating: int | None) -> tuple[int, TopicLevel]:
    """Codeforces rating range ~800..3500."""
    if rating is None:
        return 5, TopicLevel.intermediate
    if rating < 1000:
        score = 1
    elif rating < 1200:
        score = 2
    elif rating < 1400:
        score = 3
    elif rating < 1600:
        score = 4
    elif rating < 1800:
        score = 5
    elif rating < 2000:
        score = 6
    elif rating < 2200:
        score = 7
    elif rating < 2500:
        score = 8
    elif rating < 2800:
        score = 9
    else:
        score = 10
    return score, difficulty_to_label(score)


def normalize_leetcode(level: str | None) -> tuple[int, TopicLevel]:
    """LeetCode levels: Easy / Medium / Hard."""
    if not level:
        return 5, TopicLevel.intermediate
    normalized = level.strip().lower()
    if normalized == "easy":
        return 2, TopicLevel.beginner
    if normalized == "medium":
        return 5, TopicLevel.intermediate
    if normalized == "hard":
        return 8, TopicLevel.advanced
    return 5, TopicLevel.intermediate


def normalize_atcoder(contest_type: str | None, problem_letter: str | None) -> tuple[int, TopicLevel]:
    """AtCoder contests: ABC (beginner), ARC (regular), AGC (grand)."""
    contest = (contest_type or "").lower()
    letter = (problem_letter or "").lower()
    if contest.startswith("abc"):
        mapping = {"a": 1, "b": 2, "c": 3, "d": 4, "e": 5, "f": 6, "g": 7}
        score = mapping.get(letter, 4)
    elif contest.startswith("arc"):
        mapping = {"a": 5, "b": 6, "c": 7, "d": 8, "e": 9, "f": 10}
        score = mapping.get(letter, 7)
    elif contest.startswith("agc"):
        mapping = {"a": 7, "b": 8, "c": 9, "d": 10, "e": 10, "f": 10}
        score = mapping.get(letter, 9)
    else:
        score = 5
    return score, difficulty_to_label(score)
