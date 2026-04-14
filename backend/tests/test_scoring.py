"""Tests for app.services.scoring module."""

import pytest

from app.services.scoring import (
    SEVERITY_PENALTIES,
    WEIGHTS,
    AnalysisScore,
    calculate_score,
)


class TestWeightsAndConstants:
    """Verify that weights and penalty tables are correctly defined."""

    def test_weights_sum_to_one(self):
        total = sum(WEIGHTS.values())
        assert abs(total - 1.0) < 1e-9, f"Weights sum to {total}, expected 1.0"

    def test_all_five_agents_present(self):
        expected = {"structural", "terminological", "logical", "completeness", "scientific"}
        assert set(WEIGHTS.keys()) == expected

    def test_severity_penalty_ranges(self):
        assert SEVERITY_PENALTIES["critical"] == (8, 15)
        assert SEVERITY_PENALTIES["serious"] == (3, 7)
        assert SEVERITY_PENALTIES["warning"] == (1, 2)
        assert SEVERITY_PENALTIES["advice"] == (0, 0)


class TestCalculateScore:
    """Test the calculate_score function."""

    def test_all_agents_100(self):
        scores = {name: 100.0 for name in WEIGHTS}
        result = calculate_score(scores)
        assert result.total == 100.0
        assert result.not_ready_for_approval is False
        assert result.blocked_categories == []

    def test_all_agents_0(self):
        scores = {name: 0.0 for name in WEIGHTS}
        result = calculate_score(scores)
        assert result.total == 0.0
        assert result.not_ready_for_approval is True
        # All categories below 40 -> all blocked
        assert set(result.blocked_categories) == set(WEIGHTS.keys())

    def test_mixed_scores_weighted_formula(self):
        scores = {
            "structural": 80.0,
            "terminological": 60.0,
            "logical": 90.0,
            "completeness": 70.0,
            "scientific": 50.0,
        }
        # Manual calculation:
        # 80*0.20 + 60*0.15 + 90*0.25 + 70*0.25 + 50*0.15
        # = 16.0 + 9.0 + 22.5 + 17.5 + 7.5 = 72.5
        result = calculate_score(scores)
        assert result.total == 72.5
        assert result.not_ready_for_approval is False
        assert result.blocked_categories == []

    def test_score_clamped_above_100(self):
        """Scores above 100 should be clamped to 100."""
        scores = {name: 150.0 for name in WEIGHTS}
        result = calculate_score(scores)
        assert result.total == 100.0

    def test_score_clamped_below_0(self):
        """Negative scores should be clamped to 0."""
        scores = {name: -50.0 for name in WEIGHTS}
        result = calculate_score(scores)
        assert result.total == 0.0

    def test_missing_agent_scores_default_to_zero(self):
        """Missing agents should be treated as 0."""
        scores = {"structural": 100.0}  # Only one agent
        result = calculate_score(scores)
        # structural: 100 * 0.20 = 20.0, everything else: 0
        assert result.total == 20.0

    def test_not_ready_when_single_category_below_40(self):
        scores = {
            "structural": 80.0,
            "terminological": 80.0,
            "logical": 80.0,
            "completeness": 30.0,  # Below 40
            "scientific": 80.0,
        }
        result = calculate_score(scores)
        assert result.not_ready_for_approval is True
        assert result.blocked_categories == ["completeness"]

    def test_not_ready_with_multiple_categories_below_40(self):
        scores = {
            "structural": 10.0,
            "terminological": 20.0,
            "logical": 80.0,
            "completeness": 5.0,
            "scientific": 80.0,
        }
        result = calculate_score(scores)
        assert result.not_ready_for_approval is True
        assert "structural" in result.blocked_categories
        assert "terminological" in result.blocked_categories
        assert "completeness" in result.blocked_categories

    def test_boundary_score_at_40_not_blocked(self):
        """A score of exactly 40 should NOT be blocked (only < 40 is blocked)."""
        scores = {name: 40.0 for name in WEIGHTS}
        result = calculate_score(scores)
        assert result.not_ready_for_approval is False
        assert result.blocked_categories == []

    def test_boundary_score_at_39_is_blocked(self):
        """A score of 39 should be blocked."""
        scores = {name: 39.0 for name in WEIGHTS}
        result = calculate_score(scores)
        assert result.not_ready_for_approval is True
        assert set(result.blocked_categories) == set(WEIGHTS.keys())

    def test_result_categories_reflect_input(self):
        scores = {
            "structural": 55.0,
            "terminological": 65.0,
            "logical": 75.0,
            "completeness": 85.0,
            "scientific": 95.0,
        }
        result = calculate_score(scores)
        assert result.categories == scores

    def test_result_total_is_rounded(self):
        scores = {
            "structural": 73.0,
            "terminological": 61.0,
            "logical": 88.0,
            "completeness": 77.0,
            "scientific": 54.0,
        }
        # 73*0.20 + 61*0.15 + 88*0.25 + 77*0.25 + 54*0.15
        # = 14.6 + 9.15 + 22.0 + 19.25 + 8.1 = 73.1
        result = calculate_score(scores)
        assert result.total == 73.1

    def test_returns_analysis_score_dataclass(self):
        scores = {name: 50.0 for name in WEIGHTS}
        result = calculate_score(scores)
        assert isinstance(result, AnalysisScore)
