from backend.agents.problem_providers.difficulty_normalizer import (
    difficulty_to_label,
    normalize_atcoder,
    normalize_codeforces,
    normalize_leetcode,
)
from backend.db.models import TopicLevel


class TestDifficultyToLabel:
    def test_beginner_range(self):
        assert difficulty_to_label(1) == TopicLevel.beginner
        assert difficulty_to_label(3) == TopicLevel.beginner

    def test_intermediate_range(self):
        assert difficulty_to_label(4) == TopicLevel.intermediate
        assert difficulty_to_label(6) == TopicLevel.intermediate

    def test_advanced_range(self):
        assert difficulty_to_label(7) == TopicLevel.advanced
        assert difficulty_to_label(10) == TopicLevel.advanced


class TestNormalizeCodeforces:
    def test_none_rating_defaults_intermediate(self):
        score, label = normalize_codeforces(None)
        assert 4 <= score <= 6
        assert label == TopicLevel.intermediate

    def test_low_rating_is_beginner(self):
        score, label = normalize_codeforces(900)
        assert score == 1
        assert label == TopicLevel.beginner

    def test_mid_rating_is_intermediate(self):
        score, label = normalize_codeforces(1500)
        assert label == TopicLevel.intermediate

    def test_high_rating_is_advanced(self):
        score, label = normalize_codeforces(2600)
        assert score == 9
        assert label == TopicLevel.advanced

    def test_extreme_rating_caps_at_ten(self):
        score, _ = normalize_codeforces(3500)
        assert score == 10


class TestNormalizeLeetcode:
    def test_easy(self):
        score, label = normalize_leetcode("Easy")
        assert score == 2
        assert label == TopicLevel.beginner

    def test_medium(self):
        score, label = normalize_leetcode("Medium")
        assert score == 5
        assert label == TopicLevel.intermediate

    def test_hard(self):
        score, label = normalize_leetcode("Hard")
        assert score == 8
        assert label == TopicLevel.advanced

    def test_unknown_falls_back(self):
        score, label = normalize_leetcode("Unknown")
        assert label == TopicLevel.intermediate
        assert 4 <= score <= 6

    def test_none(self):
        score, label = normalize_leetcode(None)
        assert label == TopicLevel.intermediate


class TestNormalizeAtcoder:
    def test_abc_a_is_beginner(self):
        score, label = normalize_atcoder("abc", "a")
        assert score == 1
        assert label == TopicLevel.beginner

    def test_abc_e_is_intermediate(self):
        score, label = normalize_atcoder("abc", "e")
        assert label == TopicLevel.intermediate

    def test_arc_high_is_advanced(self):
        score, label = normalize_atcoder("arc", "f")
        assert score == 10
        assert label == TopicLevel.advanced

    def test_agc_default(self):
        score, label = normalize_atcoder("agc", "a")
        assert label == TopicLevel.advanced

    def test_unknown_contest_intermediate(self):
        score, label = normalize_atcoder(None, None)
        assert label == TopicLevel.intermediate
