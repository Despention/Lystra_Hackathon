"""Tests for app.services.mock_llm module."""

import json

import pytest

from app.services.mock_llm import MOCK_RESPONSES, MockLLMClient


AGENT_NAMES = ["structural", "terminological", "logical", "completeness", "scientific"]


class TestMockLLMComplete:
    """Test MockLLMClient.complete() returns valid JSON for each agent."""

    @pytest.fixture
    def client(self):
        return MockLLMClient()

    @pytest.mark.parametrize("agent_name", AGENT_NAMES)
    async def test_complete_returns_valid_json(self, client, agent_name):
        # Use agent-specific keywords so _detect_agent picks the right one
        keywords = {
            "structural": "структурный анализ (structural)",
            "terminological": "терминологический анализ (terminological)",
            "logical": "логический анализ противоречий (logical)",
            "completeness": "полнота и чеклист (completeness)",
            "scientific": "научная верификация (scientific)",
        }
        system_prompt = keywords[agent_name]
        result = await client.complete(system_prompt, "Анализируй документ")

        data = json.loads(result)
        assert "score" in data
        assert "issues" in data
        assert isinstance(data["score"], (int, float))
        assert isinstance(data["issues"], list)

    @pytest.mark.parametrize("agent_name", AGENT_NAMES)
    async def test_complete_score_within_range(self, client, agent_name):
        keywords = {
            "structural": "structural",
            "terminological": "terminological",
            "logical": "logical",
            "completeness": "completeness",
            "scientific": "scientific",
        }
        result = await client.complete(keywords[agent_name], "test")
        data = json.loads(result)
        assert 0 <= data["score"] <= 100

    @pytest.mark.parametrize("agent_name", AGENT_NAMES)
    async def test_complete_issues_have_required_fields(self, client, agent_name):
        result = await client.complete(agent_name, "test")
        data = json.loads(result)

        for issue in data["issues"]:
            assert "severity" in issue
            assert "title" in issue
            assert "description" in issue
            assert "recommendation" in issue
            assert "penalty" in issue
            assert issue["severity"] in ("critical", "serious", "warning", "advice")

    async def test_unknown_agent_defaults_to_structural(self, client):
        result = await client.complete("unknown prompt with no keywords", "test")
        data = json.loads(result)
        # Should fall back to structural response
        assert data["score"] == MOCK_RESPONSES["structural"]["score"]


class TestMockLLMStream:
    """Test MockLLMClient.stream() yields chunks that form valid JSON."""

    @pytest.fixture
    def client(self):
        return MockLLMClient()

    @pytest.mark.parametrize("agent_name", AGENT_NAMES)
    async def test_stream_yields_valid_json(self, client, agent_name):
        chunks = []
        async for chunk in client.stream(agent_name, "test"):
            chunks.append(chunk)

        full_response = "".join(chunks)
        data = json.loads(full_response)
        assert "score" in data
        assert "issues" in data

    async def test_stream_yields_individual_characters(self, client):
        chunks = []
        async for chunk in client.stream("structural", "test"):
            chunks.append(chunk)
            # Each chunk should be a single character
            assert len(chunk) == 1

        # Reassembled text should be valid JSON
        full = "".join(chunks)
        data = json.loads(full)
        assert isinstance(data, dict)

    @pytest.mark.parametrize("agent_name", AGENT_NAMES)
    async def test_stream_matches_complete_response(self, client, agent_name):
        """Stream output should represent the same data as complete() output."""
        complete_result = await client.complete(agent_name, "test")
        complete_data = json.loads(complete_result)

        chunks = []
        async for chunk in client.stream(agent_name, "test"):
            chunks.append(chunk)
        stream_data = json.loads("".join(chunks))

        assert complete_data["score"] == stream_data["score"]
        assert len(complete_data["issues"]) == len(stream_data["issues"])


class TestDetectAgent:
    """Test the _detect_agent helper method."""

    @pytest.fixture
    def client(self):
        return MockLLMClient()

    def test_detect_structural_russian(self, client):
        assert client._detect_agent("структурный анализ") == "structural"

    def test_detect_structural_english(self, client):
        assert client._detect_agent("structural analysis") == "structural"

    def test_detect_terminological_russian(self, client):
        assert client._detect_agent("терминологический") == "terminological"

    def test_detect_logical_russian(self, client):
        assert client._detect_agent("логический анализ") == "logical"

    def test_detect_logical_contradiction(self, client):
        assert client._detect_agent("поиск противоречий") == "logical"

    def test_detect_completeness_russian(self, client):
        assert client._detect_agent("проверка полноты") == "completeness"

    def test_detect_completeness_checklist(self, client):
        assert client._detect_agent("чеклист полноты") == "completeness"

    def test_detect_scientific_russian(self, client):
        assert client._detect_agent("научная обоснованность") == "scientific"

    def test_detect_scientific_verification(self, client):
        assert client._detect_agent("верификация требований") == "scientific"

    def test_detect_unknown_defaults_to_structural(self, client):
        assert client._detect_agent("something random") == "structural"


class TestMockResponses:
    """Verify the MOCK_RESPONSES dictionary is well-formed."""

    @pytest.mark.parametrize("agent_name", AGENT_NAMES)
    def test_response_structure(self, agent_name):
        response = MOCK_RESPONSES[agent_name]
        assert "score" in response
        assert "issues" in response
        assert 0 <= response["score"] <= 100
        assert isinstance(response["issues"], list)
        assert len(response["issues"]) > 0

    @pytest.mark.parametrize("agent_name", AGENT_NAMES)
    def test_all_issues_have_valid_severity(self, agent_name):
        for issue in MOCK_RESPONSES[agent_name]["issues"]:
            assert issue["severity"] in ("critical", "serious", "warning", "advice")

    @pytest.mark.parametrize("agent_name", AGENT_NAMES)
    def test_all_issues_have_penalty(self, agent_name):
        for issue in MOCK_RESPONSES[agent_name]["issues"]:
            assert isinstance(issue["penalty"], (int, float))
            assert issue["penalty"] >= 0
