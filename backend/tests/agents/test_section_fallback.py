"""Integration tests for the section-based fallback when LLM hits context overflow."""
import json

import pytest

from app.agents.base import AgentResult, IssueData
from app.agents.structural import StructuralAgent
from app.services.document_parser import ParsedDocument, Section, chunk_document_for_agent
from app.services.llm_client import ContextOverflowError


class _FakeStreamingLLM:
    """Mock LLM that streams back a scripted JSON response per call."""

    def __init__(self, responses: list[str]):
        self._responses = list(responses)
        self.calls: list[tuple[str, str]] = []  # (system, user) tuples observed

    async def stream(self, system_prompt: str, user_prompt: str):
        self.calls.append((system_prompt, user_prompt))
        if not self._responses:
            raise RuntimeError("Mock LLM exhausted")
        resp = self._responses.pop(0)
        # Yield whole response as a single token for simplicity
        yield resp


class _OverflowThenSectionsLLM:
    """Raises ContextOverflowError on full-document call, serves sections normally."""

    def __init__(self, section_responses: list[str]):
        self.section_responses = list(section_responses)
        self.full_doc_calls = 0
        self.section_calls = 0

    async def stream(self, system_prompt: str, user_prompt: str):
        # Heuristic: if user_prompt looks like a section fragment (contains
        # "фрагмент"), serve from section_responses; otherwise treat as
        # full-document and overflow.
        if "фрагмент" in user_prompt:
            self.section_calls += 1
            if not self.section_responses:
                raise RuntimeError("no more section responses")
            yield self.section_responses.pop(0)
        else:
            self.full_doc_calls += 1
            raise ContextOverflowError("context size has been exceeded (12000 / 4096)")


@pytest.fixture
def long_document():
    """A multi-section document whose full_text would overflow a small context."""
    sections = [
        Section(title=f"{i}. Раздел {i}", level=1, content=f"Содержимое раздела {i}. " * 50)
        for i in range(1, 6)
    ]
    full = "\n\n".join(f"{s.title}\n{s.content}" for s in sections)
    return ParsedDocument(full_text=full, sections=sections, metadata={})


class TestChunkDocumentForAgent:
    def test_uses_existing_sections(self, long_document):
        chunks = chunk_document_for_agent(long_document, max_chars=2000)
        assert len(chunks) >= 1
        for c in chunks:
            assert isinstance(c, Section)

    def test_empty_document_produces_no_chunks(self):
        doc = ParsedDocument(full_text="", sections=[], metadata={})
        chunks = chunk_document_for_agent(doc, max_chars=2000)
        assert chunks == []

    def test_unsectioned_document_is_window_split(self):
        text = "x" * 10000
        doc = ParsedDocument(full_text=text, sections=[], metadata={})
        chunks = chunk_document_for_agent(doc, max_chars=3000)
        assert len(chunks) >= 3
        # All chunks should be Section objects with non-empty content
        for c in chunks:
            assert len(c.content) > 0


class TestAnalyzeSections:
    async def test_weighted_score_by_section_length(self, long_document):
        agent = StructuralAgent()
        # Two sections with different lengths; mock LLM returns distinct scores
        section_responses = [
            json.dumps({"score": 40, "issues": []}),
            json.dumps({"score": 80, "issues": []}),
            json.dumps({"score": 50, "issues": []}),
            json.dumps({"score": 60, "issues": []}),
            json.dumps({"score": 70, "issues": []}),
        ]
        llm = _OverflowThenSectionsLLM(section_responses=section_responses)

        result = await agent.analyze_sections(
            long_document,
            long_document.sections,
            llm,
        )

        assert isinstance(result, AgentResult)
        assert 0 <= result.score <= 100
        # 5 sections analyzed
        assert llm.section_calls == 5

    async def test_merges_issues_from_sections(self, long_document):
        agent = StructuralAgent()
        section_responses = [
            json.dumps({
                "score": 70,
                "issues": [{
                    "severity": "warning", "title": f"issue-{i}",
                    "description": "...", "recommendation": "fix"
                }],
            })
            for i in range(5)
        ]
        llm = _OverflowThenSectionsLLM(section_responses=section_responses)

        result = await agent.analyze_sections(
            long_document, long_document.sections, llm,
        )
        # Each section contributed one issue
        assert len(result.issues) == 5

    async def test_all_sections_failing_returns_error(self, long_document):
        """If every section call errors, result has error string."""
        class AlwaysFailingLLM:
            async def stream(self, system_prompt, user_prompt):
                if False:
                    yield ""
                raise ConnectionError("LLM down")

        agent = StructuralAgent()
        result = await agent.analyze_sections(
            long_document, long_document.sections, AlwaysFailingLLM(),
        )
        assert result.score == 0.0
        assert result.error is not None
        assert "failed" in result.error.lower()

    async def test_partial_failure_preserves_successful_sections(self, long_document):
        """Some sections fail, some succeed — result should still be a partial success."""
        responses = [
            json.dumps({"score": 80, "issues": []}),  # section 1 OK
            "not-valid-json",                           # section 2 parse failure
            json.dumps({"score": 70, "issues": []}),  # section 3 OK
            json.dumps({"score": 60, "issues": []}),  # section 4 OK
            json.dumps({"score": 90, "issues": []}),  # section 5 OK
        ]
        llm = _OverflowThenSectionsLLM(section_responses=responses)

        agent = StructuralAgent()
        result = await agent.analyze_sections(
            long_document, long_document.sections, llm,
        )
        # Score is computed from the 4 successful sections
        assert result.score > 0
        # Error string records the 1 failure
        assert result.error is not None
        assert "Partial" in result.error
