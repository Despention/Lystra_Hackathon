"""Unit tests for CorrectionAgent's section-aware prompt building."""
import pytest

from app.agents.base import IssueData
from app.agents.correction import CorrectionAgent
from app.services.document_parser import ParsedDocument, Section


def _doc(sections: list[Section]) -> ParsedDocument:
    full = "\n\n".join(f"{s.title}\n{s.content}" for s in sections)
    return ParsedDocument(full_text=full, sections=sections, metadata={})


class TestSelectRelevantText:
    def test_no_sections_returns_prefix(self):
        doc = ParsedDocument(full_text="A" * 5000, sections=[], metadata={})
        result = CorrectionAgent._select_relevant_text(doc, None, 1000)
        assert len(result) == 1000
        assert result == "A" * 1000

    def test_no_issues_returns_prefix(self):
        sections = [Section(title="§1", level=1, content="content one" * 100)]
        doc = _doc(sections)
        result = CorrectionAgent._select_relevant_text(doc, [], 500)
        # With no issues, fallback to first N chars
        assert len(result) <= 500

    def test_quote_match_prioritises_containing_section(self):
        s1 = Section(title="Секция 1", level=1, content="Описание системы. Общие сведения без уникальной цитаты.")
        s2 = Section(title="Секция 2", level=1, content="Требования: время отклика 200мс. Метка-ЦЕЛЬ.")
        s3 = Section(title="Секция 3", level=1, content="Прочее.")

        doc = _doc([s1, s2, s3])
        issue = IssueData(
            severity="warning",
            title="Какое-то замечание",
            description="...",
            document_quote="Метка-ЦЕЛЬ",
        )

        # Budget big enough for just one section
        result = CorrectionAgent._select_relevant_text(doc, [issue], budget=200)
        assert "Метка-ЦЕЛЬ" in result

    def test_keyword_match_from_title(self):
        s_relevant = Section(
            title="Требования", level=1,
            content="Функциональные требования к системе перечислены здесь."
        )
        s_irrelevant = Section(
            title="Прочее", level=1,
            content="Историческая справка без совпадений."
        )
        doc = _doc([s_relevant, s_irrelevant])

        issue = IssueData(
            severity="warning",
            title="Отсутствуют требования к надёжности",
            description="...",
        )
        result = CorrectionAgent._select_relevant_text(doc, [issue], budget=150)
        assert "требования" in result.lower()

    def test_no_match_falls_back_to_prefix(self):
        s1 = Section(title="A", level=1, content="совсем" * 50)
        s2 = Section(title="B", level=1, content="другое" * 50)
        doc = _doc([s1, s2])
        issue = IssueData(
            severity="warning",
            title="ЗагадочныйТермин", description="...",
            document_quote="нигде-не-встречающаяся-строка",
        )
        result = CorrectionAgent._select_relevant_text(doc, [issue], budget=200)
        # Falls back to full_text[:budget]
        assert len(result) <= 200

    def test_multiple_sections_picked_under_budget(self):
        s1 = Section(title="A", level=1, content="требования " * 30)  # ~300 chars
        s2 = Section(title="B", level=1, content="требования " * 30)
        s3 = Section(title="C", level=1, content="неактуально " * 30)

        doc = _doc([s1, s2, s3])
        issue = IssueData(
            severity="warning",
            title="Требования перечислены дважды",
            description="...",
        )
        # Budget allows both matching sections
        result = CorrectionAgent._select_relevant_text(doc, [issue], budget=10000)
        assert "[A]" in result
        assert "[B]" in result


class TestBuildUserPrompt:
    def test_prompt_includes_issues_context(self):
        agent = CorrectionAgent()
        doc = _doc([Section(title="§", level=1, content="some content here")])
        prompt = agent.build_user_prompt(doc, issues_context="[critical] title: desc")
        assert "[critical] title: desc" in prompt

    def test_prompt_truncates_long_issues_context(self):
        agent = CorrectionAgent()
        doc = _doc([Section(title="§", level=1, content="x")])
        big = "a" * 5000
        prompt = agent.build_user_prompt(doc, issues_context=big)
        # Truncated to 2000 chars
        assert len([c for c in prompt if c == "a"]) <= 2000 + 100

    def test_prompt_includes_section_titles(self):
        agent = CorrectionAgent()
        doc = _doc([
            Section(title="Требования", level=1, content="..."),
            Section(title="Цели", level=1, content="..."),
        ])
        prompt = agent.build_user_prompt(doc, issues_context="")
        assert "Требования" in prompt
        assert "Цели" in prompt
