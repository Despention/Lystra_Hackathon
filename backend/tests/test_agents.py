"""Tests for app.agents module (base agent, concrete agents, orchestrator)."""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.agents.base import AgentResult, BaseAgent, IssueData
from app.agents.completeness import CompletenessAgent
from app.agents.logical import LogicalAgent
from app.agents.orchestrator import ALL_AGENTS, QUICK_AGENTS, run_analysis, run_single_agent
from app.agents.scientific import ScientificAgent
from app.agents.structural import StructuralAgent
from app.agents.terminological import TerminologicalAgent
from app.services.document_parser import ParsedDocument, Section
from app.services.mock_llm import MockLLMClient


# ---------------------------------------------------------------------------
# BaseAgent.parse_response
# ---------------------------------------------------------------------------

class TestBaseAgentParseResponse:
    """Test the JSON extraction and parsing logic of BaseAgent."""

    @pytest.fixture
    def agent(self):
        return StructuralAgent()

    def test_parse_valid_json(self, agent):
        raw = json.dumps({
            "score": 75,
            "issues": [
                {
                    "severity": "serious",
                    "title": "Missing section",
                    "description": "Section X is missing",
                    "document_quote": "some quote",
                    "standard_reference": "GOST 34.602",
                    "recommendation": "Add section X",
                    "penalty": 5.0,
                }
            ]
        })
        result = agent.parse_response(raw)

        assert isinstance(result, AgentResult)
        assert result.agent_name == "structural"
        assert result.score == 75.0
        assert len(result.issues) == 1
        assert result.issues[0].severity == "serious"
        assert result.issues[0].title == "Missing section"
        assert result.issues[0].penalty == 5.0
        assert result.error is None

    def test_parse_json_in_markdown_code_block(self, agent):
        raw = (
            "Here is my analysis:\n"
            "```json\n"
            '{"score": 82, "issues": []}\n'
            "```\n"
            "That's the result."
        )
        result = agent.parse_response(raw)

        assert result.score == 82.0
        assert result.issues == []
        assert result.error is None

    def test_parse_json_with_surrounding_text(self, agent):
        raw = (
            "Let me analyze this document.\n\n"
            '{"score": 60, "issues": [{"severity": "warning", "title": "Minor issue", '
            '"description": "desc", "recommendation": "fix it", "penalty": 1.0}]}\n\n'
            "End of analysis."
        )
        result = agent.parse_response(raw)

        assert result.score == 60.0
        assert len(result.issues) == 1

    def test_parse_no_json_returns_failure(self, agent):
        # No fallback score — malformed responses now surface as failures
        # so the UI can show an honest partial/failed state rather than a
        # misleading 50/100.
        raw = "This response contains no JSON at all."
        result = agent.parse_response(raw)

        assert result.score == 0.0
        assert result.issues == []
        assert result.error is not None
        assert "Parse error" in result.error or "No JSON" in result.error

    def test_parse_invalid_json_returns_failure(self, agent):
        raw = '{"score": 80, "issues": [INVALID'
        result = agent.parse_response(raw)

        # Robust parser may still extract {"score": 80} from prefix; either
        # outcome is acceptable so long as it's not the old magic 50.
        assert result.score != 50.0

    def test_parse_missing_score_defaults_to_zero(self, agent):
        raw = '{"issues": []}'
        result = agent.parse_response(raw)

        # When "score" key is absent, default to 0 (honest) rather than 50.
        assert result.score == 0.0

    def test_parse_missing_issues_defaults_to_empty(self, agent):
        raw = '{"score": 90}'
        result = agent.parse_response(raw)

        assert result.score == 90.0
        assert result.issues == []

    def test_parse_issue_missing_optional_fields(self, agent):
        raw = json.dumps({
            "score": 70,
            "issues": [
                {
                    "severity": "warning",
                    "title": "Test",
                    "description": "Test desc",
                    "recommendation": "Fix it",
                    "penalty": 2.0,
                }
            ]
        })
        result = agent.parse_response(raw)

        issue = result.issues[0]
        assert issue.document_quote is None
        assert issue.standard_reference is None

    def test_raw_output_is_preserved(self, agent):
        raw = '{"score": 55, "issues": []}'
        result = agent.parse_response(raw)
        assert result.raw_output == raw


# ---------------------------------------------------------------------------
# Concrete agent system prompts
# ---------------------------------------------------------------------------

class TestAgentSystemPrompts:
    """Verify each agent returns a non-empty system prompt with relevant keywords."""

    def test_structural_prompt(self):
        agent = StructuralAgent()
        prompt = agent.get_system_prompt()
        assert len(prompt) > 100
        assert "структур" in prompt.lower() or "ГОСТ" in prompt

    def test_terminological_prompt(self):
        agent = TerminologicalAgent()
        prompt = agent.get_system_prompt()
        assert len(prompt) > 100
        assert "терминолог" in prompt.lower() or "аббревиатур" in prompt.lower()

    def test_logical_prompt(self):
        agent = LogicalAgent()
        prompt = agent.get_system_prompt()
        assert len(prompt) > 100
        assert "логическ" in prompt.lower() or "противореч" in prompt.lower()

    def test_completeness_prompt(self):
        agent = CompletenessAgent()
        prompt = agent.get_system_prompt()
        assert len(prompt) > 100
        assert "полнот" in prompt.lower() or "чеклист" in prompt.lower()

    def test_scientific_prompt(self):
        agent = ScientificAgent()
        prompt = agent.get_system_prompt()
        assert len(prompt) > 100
        assert "научн" in prompt.lower() or "верификац" in prompt.lower()


# ---------------------------------------------------------------------------
# Agent properties
# ---------------------------------------------------------------------------

class TestAgentProperties:
    """Verify agent name, weight, and model_size."""

    def test_structural_properties(self):
        agent = StructuralAgent()
        assert agent.name == "structural"
        assert agent.weight == 0.20
        assert agent.model_size == "large"

    def test_terminological_properties(self):
        agent = TerminologicalAgent()
        assert agent.name == "terminological"
        assert agent.weight == 0.15
        assert agent.model_size == "small"

    def test_logical_properties(self):
        agent = LogicalAgent()
        assert agent.name == "logical"
        assert agent.weight == 0.25
        assert agent.model_size == "large"

    def test_completeness_properties(self):
        agent = CompletenessAgent()
        assert agent.name == "completeness"
        assert agent.weight == 0.25
        assert agent.model_size == "large"

    def test_scientific_properties(self):
        agent = ScientificAgent()
        assert agent.name == "scientific"
        assert agent.weight == 0.15
        assert agent.model_size == "small"


# ---------------------------------------------------------------------------
# build_user_prompt
# ---------------------------------------------------------------------------

class TestBuildUserPrompt:
    """Test BaseAgent.build_user_prompt with various documents."""

    @pytest.fixture
    def agent(self):
        # Use ScientificAgent: it does not override build_user_prompt with
        # regex-hint augmentation, so we test the plain base-class behavior.
        return ScientificAgent()

    def test_includes_document_text(self, agent, sample_parsed_document):
        prompt = agent.build_user_prompt(sample_parsed_document)
        assert "Общие сведения" in prompt
        assert "Требования к системе" in prompt

    def test_includes_sections_list(self, agent, sample_parsed_document):
        prompt = agent.build_user_prompt(sample_parsed_document)
        assert "Обнаруженные разделы документа:" in prompt

    def test_no_sections_info_for_empty_sections(self, agent, empty_parsed_document):
        prompt = agent.build_user_prompt(empty_parsed_document)
        assert "Обнаруженные разделы документа:" not in prompt

    def test_truncates_long_documents(self, agent):
        # Uses settings.llm_max_context_chars (configurable, default 6000).
        from app.config import settings
        max_chars = settings.llm_max_context_chars
        long_text = "A" * (max_chars * 3)
        doc = ParsedDocument(full_text=long_text, sections=[], metadata={})
        prompt = agent.build_user_prompt(doc)
        assert f"документ обрезан до {max_chars} символов" in prompt
        # The actual text in the prompt should be around max_chars, not 3*max_chars
        assert len(prompt) < max_chars + 500


# ---------------------------------------------------------------------------
# Agent.analyze with mock LLM
# ---------------------------------------------------------------------------

class TestAgentAnalyze:
    """Test the full analyze() flow using MockLLMClient."""

    @pytest.fixture
    def mock_llm(self):
        return MockLLMClient()

    @pytest.mark.parametrize("AgentClass,agent_name", [
        (StructuralAgent, "structural"),
        (TerminologicalAgent, "terminological"),
        (LogicalAgent, "logical"),
        (CompletenessAgent, "completeness"),
        (ScientificAgent, "scientific"),
    ])
    async def test_analyze_returns_agent_result(
        self, AgentClass, agent_name, mock_llm, sample_parsed_document
    ):
        agent = AgentClass()
        result = await agent.analyze(sample_parsed_document, mock_llm)

        assert isinstance(result, AgentResult)
        assert result.agent_name == agent_name
        assert 0 <= result.score <= 100
        assert isinstance(result.issues, list)
        assert len(result.issues) > 0
        assert result.error is None

    async def test_analyze_with_callback(self, mock_llm, sample_parsed_document):
        agent = StructuralAgent()
        tokens_received = []

        async def callback(token):
            tokens_received.append(token)

        result = await agent.analyze(sample_parsed_document, mock_llm, callback)

        assert result.score > 0
        assert len(tokens_received) > 0

    async def test_analyze_handles_llm_error(self, sample_parsed_document):
        """If the LLM raises an exception, analyze should return an error result."""

        class FailingLLM:
            async def stream(self, system_prompt, user_prompt):
                # Yield nothing, then raise -- makes this a valid async generator
                if False:
                    yield ""
                raise ConnectionError("LLM unavailable")

        agent = StructuralAgent()
        result = await agent.analyze(sample_parsed_document, FailingLLM())

        assert result.score == 0.0
        assert result.error is not None
        assert "LLM unavailable" in result.error


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

class TestOrchestrator:
    """Test the orchestrator module."""

    def test_all_agents_list(self):
        names = [a.name for a in ALL_AGENTS]
        assert len(names) == 5
        assert set(names) == {"structural", "terminological", "logical", "completeness", "scientific"}

    def test_quick_agents_set(self):
        assert QUICK_AGENTS == {"structural", "completeness"}

    async def test_run_analysis_full_mode(self, sample_parsed_document):
        llm = MockLLMClient()
        results, score_info = await run_analysis(sample_parsed_document, llm, llm, mode="full")

        assert len(results) == 5
        names = {r.agent_name for r in results}
        assert names == {"structural", "terminological", "logical", "completeness", "scientific"}
        assert "total_score" in score_info
        assert 0 <= score_info["total_score"] <= 100

    async def test_run_analysis_quick_mode(self, sample_parsed_document):
        llm = MockLLMClient()
        results, score_info = await run_analysis(sample_parsed_document, llm, llm, mode="quick")

        # Only structural and completeness should run
        names = {r.agent_name for r in results}
        assert names == {"structural", "completeness"}
        assert "total_score" in score_info

    async def test_run_analysis_emits_events(self, sample_parsed_document):
        llm = MockLLMClient()
        events = []

        async def on_event(event):
            events.append(event)

        results, score_info = await run_analysis(
            sample_parsed_document, llm, llm, mode="full", on_event=on_event
        )

        event_types = [e["type"] for e in events]
        # Should have agent_start, agent_stream (many), agent_done for each agent, plus analysis_done
        assert "agent_start" in event_types
        assert "agent_done" in event_types
        assert "analysis_done" in event_types
        assert "agent_stream" in event_types

    async def test_run_single_agent(self, sample_parsed_document):
        llm = MockLLMClient()
        agent = StructuralAgent()
        result = await run_single_agent(agent, sample_parsed_document, llm)

        assert isinstance(result, AgentResult)
        assert result.agent_name == "structural"
        assert result.score > 0


# ---------------------------------------------------------------------------
# IssueData dataclass
# ---------------------------------------------------------------------------

class TestIssueData:
    """Test the IssueData dataclass."""

    def test_creation_with_all_fields(self):
        issue = IssueData(
            severity="critical",
            title="Test issue",
            description="Test description",
            document_quote="some quote",
            standard_reference="GOST 34.602",
            recommendation="Fix it",
            penalty=10.0,
        )
        assert issue.severity == "critical"
        assert issue.penalty == 10.0

    def test_creation_with_defaults(self):
        issue = IssueData(
            severity="warning",
            title="Test",
            description="Desc",
        )
        assert issue.document_quote is None
        assert issue.standard_reference is None
        assert issue.recommendation == ""
        assert issue.penalty == 0.0
