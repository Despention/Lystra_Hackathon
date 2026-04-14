import logging
from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass, field

from app.config import settings
from app.services.document_parser import ParsedDocument, Section
from app.services.json_parser import parse_json_from_llm, validate_agent_output
from app.services.llm_client import ContextOverflowError

logger = logging.getLogger(__name__)


@dataclass
class IssueData:
    severity: str
    title: str
    description: str
    document_quote: str | None = None
    standard_reference: str | None = None
    recommendation: str = ""
    penalty: float = 0.0


@dataclass
class AgentResult:
    agent_name: str
    score: float
    issues: list[IssueData] = field(default_factory=list)
    raw_output: str = ""
    error: str | None = None


class BaseAgent(ABC):
    name: str
    weight: float
    model_size: str  # "large" or "small"

    @abstractmethod
    def get_system_prompt(self) -> str:
        ...

    def build_user_prompt(self, document: ParsedDocument) -> str:
        sections_info = ""
        if document.sections:
            sections_info = "\n\nОбнаруженные разделы документа:\n"
            for s in document.sections:
                sections_info += f"  {'  ' * s.level}• {s.title}\n"

        text = document.full_text
        max_chars = settings.llm_max_context_chars
        if len(text) > max_chars:
            text = text[:max_chars] + f"\n\n[... документ обрезан до {max_chars} символов ...]"

        return f"Проанализируй следующее техническое задание:{sections_info}\n\n---\n{text}\n---"

    async def analyze(
        self,
        document: ParsedDocument,
        llm,
        callback: Callable | None = None,
    ) -> AgentResult:
        system_prompt = self.get_system_prompt()
        user_prompt = self.build_user_prompt(document)

        full_response = ""
        try:
            async for token in llm.stream(system_prompt, user_prompt):
                full_response += token
                if callback:
                    await callback(token)
        except ContextOverflowError:
            # Let orchestrator catch and trigger section-based fallback
            raise
        except Exception as e:
            logger.error("Agent %s failed: %s", self.name, e)
            return AgentResult(
                agent_name=self.name,
                score=0.0,
                error=str(e),
                raw_output=full_response,
            )

        return self.parse_response(full_response)

    def build_section_user_prompt(
        self,
        section: Section,
        index: int,
        total: int,
        toc: str,
    ) -> str:
        """Build a user prompt for analyzing a single section (used in section fallback)."""
        return (
            f"Ты анализируешь фрагмент технического задания "
            f"(секция {index + 1} из {total}).\n"
            f"Оценивай только то, что видишь в фрагменте — не делай выводов "
            f"об отсутствии разделов, которые могут быть в других фрагментах.\n\n"
            f"Оглавление всего документа:\n{toc}\n\n"
            f"Текущий фрагмент — «{section.title}»:\n---\n{section.content}\n---"
        )

    async def analyze_sections(
        self,
        document: ParsedDocument,
        sections: list[Section],
        llm,
        callback: Callable | None = None,
    ) -> AgentResult:
        """Analyze each section separately and merge results.

        Used as fallback when full-document analysis hits context overflow.
        Runs sections sequentially (single local LLM can't parallelise anyway).
        """
        if not sections:
            return AgentResult(
                agent_name=self.name,
                score=0.0,
                error="No sections to analyze",
            )

        # Build TOC once
        toc_lines = []
        for s in (document.sections or []):
            toc_lines.append(f"  {'  ' * s.level}• {s.title}")
        toc = "\n".join(toc_lines) if toc_lines else "(оглавление не распознано)"

        system_prompt = self.get_system_prompt()
        section_scores: list[tuple[float, int]] = []  # (score, weight_chars)
        all_issues: list[IssueData] = []
        raw_outputs: list[str] = []
        errors: list[str] = []

        for idx, section in enumerate(sections):
            user_prompt = self.build_section_user_prompt(section, idx, len(sections), toc)
            response = ""
            try:
                async for token in llm.stream(system_prompt, user_prompt):
                    response += token
                    if callback:
                        await callback(token)
            except ContextOverflowError as e:
                logger.warning(
                    "Agent %s: section %d/%d still overflows context, skipping",
                    self.name, idx + 1, len(sections),
                )
                errors.append(f"section {idx + 1}: context overflow")
                continue
            except Exception as e:
                logger.warning(
                    "Agent %s: section %d/%d failed: %s",
                    self.name, idx + 1, len(sections), e,
                )
                errors.append(f"section {idx + 1}: {e}")
                continue

            raw_outputs.append(response)
            partial = self.parse_response(response)
            if partial.error:
                errors.append(f"section {idx + 1}: {partial.error}")
                continue

            section_scores.append((partial.score, max(1, len(section.content))))
            all_issues.extend(partial.issues)

        if not section_scores:
            return AgentResult(
                agent_name=self.name,
                score=0.0,
                issues=[],
                raw_output="\n---\n".join(raw_outputs),
                error="All section analyses failed: " + "; ".join(errors[:3]),
            )

        # Weighted average by section content length
        total_weight = sum(w for _, w in section_scores)
        weighted_score = sum(s * w for s, w in section_scores) / total_weight

        # If some sections failed but others succeeded, preserve non-fatal error info
        combined_error = None
        if errors and len(section_scores) < len(sections):
            combined_error = f"Partial: {len(errors)}/{len(sections)} sections failed"

        return AgentResult(
            agent_name=self.name,
            score=round(weighted_score, 1),
            issues=all_issues,
            raw_output="\n---\n".join(raw_outputs),
            error=combined_error,
        )

    def parse_response(self, raw: str) -> AgentResult:
        data = parse_json_from_llm(raw)
        if data is None:
            logger.warning("Agent %s: failed to parse JSON from response", self.name)
            return AgentResult(
                agent_name=self.name,
                score=0.0,
                issues=[],
                raw_output=raw,
                error="Parse error: no valid JSON found in LLM response",
            )

        validation_errors = validate_agent_output(data)
        if len(validation_errors) > 3:
            logger.warning(
                "Agent %s: response has %d validation errors: %s",
                self.name, len(validation_errors), validation_errors[:3],
            )
            return AgentResult(
                agent_name=self.name,
                score=0.0,
                issues=[],
                raw_output=raw,
                error=f"Validation errors: {'; '.join(validation_errors[:3])}",
            )

        issues = []
        for item in data.get("issues", []):
            if not isinstance(item, dict):
                continue
            try:
                issues.append(IssueData(
                    severity=str(item.get("severity", "warning")),
                    title=str(item.get("title", "")),
                    description=str(item.get("description", "")),
                    document_quote=item.get("document_quote"),
                    standard_reference=item.get("standard_reference"),
                    recommendation=str(item.get("recommendation", "")),
                    penalty=float(item.get("penalty", 0) or 0),
                ))
            except (TypeError, ValueError) as e:
                logger.debug("Agent %s: skipping malformed issue: %s", self.name, e)

        try:
            score = float(data.get("score", 0))
        except (TypeError, ValueError):
            score = 0.0
        score = max(0.0, min(100.0, score))

        return AgentResult(
            agent_name=self.name,
            score=score,
            issues=issues,
            raw_output=raw,
        )
