from __future__ import annotations

import re
from collections.abc import Iterable

from app.agents.base import BaseAgent, IssueData
from app.config import settings
from app.knowledge.prompts import CORRECTION_SYSTEM_PROMPT
from app.services.document_parser import ParsedDocument, Section


class CorrectionAgent(BaseAgent):
    name = "correction"
    weight = 0.0  # Does NOT affect scoring
    model_size = "large"

    def get_system_prompt(self) -> str:
        return CORRECTION_SYSTEM_PROMPT

    def build_user_prompt(
        self,
        document: ParsedDocument,
        issues_context: str = "",
        issues: Iterable[IssueData] | None = None,
    ) -> str:
        """Build a prompt that includes only sections relevant to the given issues.

        This avoids blindly truncating the document to N chars — which was
        preventing the model from finding originals in the tail of large ТЗ.
        Falls back to the first max_chars of the full text if no sections or
        relevant content can be identified.
        """
        max_chars = settings.llm_max_context_chars
        budget = max(2000, max_chars - 2000)  # reserve room for prompt + issues_context

        doc_excerpt = self._select_relevant_text(document, issues, budget)

        sections_info = ""
        if document.sections:
            sections_info = "\n\nСекции документа:\n" + "\n".join(
                f"- {s.title}" for s in document.sections
            )

        return (
            f"Текст документа (релевантные секции):\n{doc_excerpt}"
            f"{sections_info}\n\nНайденные проблемы:\n{issues_context[:2000]}"
        )

    @staticmethod
    def _select_relevant_text(
        document: ParsedDocument,
        issues: Iterable[IssueData] | None,
        budget: int,
    ) -> str:
        """Pick sections likely to contain the issues' originals, up to budget chars."""
        full = document.full_text

        # Simple path: no sections or no issues → truncate from start
        if not document.sections or issues is None:
            return full[:budget]

        issues_list = list(issues)
        if not issues_list:
            return full[:budget]

        # Build search terms from each issue: document_quote (most reliable)
        # plus a few keywords from the title.
        section_scores: dict[int, float] = {}
        for issue in issues_list:
            quote = (issue.document_quote or "").strip()
            terms: list[str] = []
            if quote:
                terms.append(quote.lower())
            title_words = [w for w in re.findall(r"[а-яА-Яa-zA-Z]{4,}", issue.title or "")]
            terms.extend(w.lower() for w in title_words[:3])

            if not terms:
                continue

            for idx, section in enumerate(document.sections):
                content_lower = section.content.lower()
                match_weight = 0.0
                if quote and quote.lower() in content_lower:
                    match_weight += 5.0  # direct quote match is strong signal
                for term in terms:
                    if term in content_lower:
                        match_weight += 1.0
                if match_weight > 0:
                    section_scores[idx] = section_scores.get(idx, 0.0) + match_weight

        # Rank sections by match score; if no matches, fall back to document order
        if not section_scores:
            return full[:budget]

        ranked_indices = sorted(
            section_scores.keys(), key=lambda i: section_scores[i], reverse=True,
        )

        # Pick top-scoring sections until budget is exhausted. Preserve original order
        # for readability.
        picked: set[int] = set()
        used = 0
        for idx in ranked_indices:
            content_len = len(document.sections[idx].content)
            if used + content_len > budget and picked:
                break
            picked.add(idx)
            used += content_len

        # Emit sections in original order
        parts: list[str] = []
        for idx in sorted(picked):
            s = document.sections[idx]
            parts.append(f"[{s.title}]\n{s.content}")

        return "\n\n".join(parts) or full[:budget]
