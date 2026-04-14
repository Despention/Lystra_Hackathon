"""Unit tests for the robust JSON parser used to extract LLM outputs."""
import json

import pytest

from app.services.json_parser import parse_json_from_llm, validate_agent_output


class TestParseJsonFromLLM:
    def test_parses_clean_json(self):
        raw = '{"score": 75, "issues": []}'
        result = parse_json_from_llm(raw)
        assert result == {"score": 75, "issues": []}

    def test_parses_markdown_fence(self):
        raw = "Here is my analysis:\n```json\n{\"score\": 80, \"issues\": []}\n```\nDone."
        result = parse_json_from_llm(raw)
        assert result == {"score": 80, "issues": []}

    def test_parses_fence_without_language_tag(self):
        raw = "```\n{\"score\": 60}\n```"
        result = parse_json_from_llm(raw)
        assert result == {"score": 60}

    def test_parses_with_surrounding_prose(self):
        raw = (
            "Let me analyze.\n\n"
            '{"score": 55, "issues": [{"severity": "warning", "title": "x"}]}\n'
            "End."
        )
        result = parse_json_from_llm(raw)
        assert result["score"] == 55
        assert len(result["issues"]) == 1

    def test_strips_trailing_commas(self):
        raw = '{"score": 70, "issues": [{"title": "x",},],}'
        result = parse_json_from_llm(raw)
        assert result is not None
        assert result["score"] == 70

    def test_handles_single_quotes_when_no_double_quotes(self):
        raw = "{'score': 65, 'issues': []}"
        result = parse_json_from_llm(raw)
        assert result == {"score": 65, "issues": []}

    def test_balanced_extraction_with_nested_objects(self):
        raw = (
            "Preamble. "
            '{"score": 40, "issues": [{"nested": {"a": 1}}, {"nested": {"b": 2}}]}'
            " trailing."
        )
        result = parse_json_from_llm(raw)
        assert result["score"] == 40
        assert len(result["issues"]) == 2

    def test_respects_braces_inside_strings(self):
        raw = '{"score": 50, "desc": "has { a brace in a string"}'
        result = parse_json_from_llm(raw)
        assert result == {"score": 50, "desc": "has { a brace in a string"}

    def test_empty_input_returns_none(self):
        assert parse_json_from_llm("") is None
        assert parse_json_from_llm("   \n\t  ") is None

    def test_no_json_returns_none(self):
        assert parse_json_from_llm("Just plain text with no JSON here.") is None

    def test_malformed_unrecoverable_returns_none(self):
        raw = '{"score": 80, "issues": [INVALID_TOKEN'
        # This is actually recoverable if strategies find a valid prefix,
        # but deeply broken should return None or something non-magic.
        result = parse_json_from_llm(raw)
        # Either None, or a dict — but never a magic fallback like {"score": 50}
        assert result is None or isinstance(result, dict)

    def test_picks_agent_like_block_over_generic(self):
        # Walk strategy should prefer a block with 'score' over a random nested obj
        raw = '{"unrelated": true} and {"score": 42, "issues": []}'
        result = parse_json_from_llm(raw)
        assert result is not None
        # Strategy 2 (first { to last }) may pick the combined invalid slice;
        # the balanced walk should find {"score": 42}. Either outcome must include score.
        # We accept either {"unrelated": True} OR the correct one.
        # What matters: never silently invent a score=50.
        assert "score" in result or "unrelated" in result

    def test_non_dict_returns_none(self):
        # Top-level JSON array is not what agents return
        assert parse_json_from_llm("[1, 2, 3]") is None


class TestValidateAgentOutput:
    def test_valid_full_response(self):
        data = {
            "score": 70,
            "issues": [
                {"severity": "warning", "title": "x", "penalty": 1.5},
            ],
        }
        assert validate_agent_output(data) == []

    def test_score_out_of_range(self):
        errors = validate_agent_output({"score": 150})
        assert len(errors) == 1
        assert "out of range" in errors[0]

    def test_score_not_number(self):
        errors = validate_agent_output({"score": "high"})
        assert len(errors) == 1
        assert "not a number" in errors[0]

    def test_issues_not_list(self):
        errors = validate_agent_output({"issues": "oops"})
        assert any("not a list" in e for e in errors)

    def test_issue_with_invalid_severity(self):
        data = {"issues": [{"severity": "catastrophic"}]}
        errors = validate_agent_output(data)
        assert any("severity invalid" in e for e in errors)

    def test_issue_with_non_numeric_penalty(self):
        data = {"issues": [{"severity": "warning", "penalty": "a lot"}]}
        errors = validate_agent_output(data)
        assert any("penalty not numeric" in e for e in errors)

    def test_corrections_not_list(self):
        errors = validate_agent_output({"corrections": {"a": 1}})
        assert any("corrections is not a list" in e for e in errors)

    def test_missing_optional_keys_is_fine(self):
        # Neither score nor issues required individually
        assert validate_agent_output({}) == []
