"""Machine-readable GOST rules for deterministic pre-analysis.

Agents use these rules to find obvious issues (missing sections, undefined
abbreviations) BEFORE calling the LLM. The LLM then receives a list of
pre-detected suspicions plus the full document, which improves both speed
(fewer tokens needed) and consistency (deterministic regex hits).
"""
from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class GostSection:
    num: str
    title: str
    synonyms: tuple[str, ...]  # alternate wordings that also satisfy the requirement
    required: bool
    standard_ref: str


# ГОСТ 34.602-89 — structure of technical specifications for automated systems
GOST_34_602_SECTIONS: list[GostSection] = [
    GostSection(
        num="1", title="Общие сведения",
        synonyms=("общие положения", "введение", "назначение документа"),
        required=True, standard_ref="ГОСТ 34.602-89, п. 2.1",
    ),
    GostSection(
        num="2", title="Назначение и цели создания системы",
        synonyms=("назначение системы", "цели создания", "цели и задачи"),
        required=True, standard_ref="ГОСТ 34.602-89, п. 2.2",
    ),
    GostSection(
        num="3", title="Характеристика объектов автоматизации",
        synonyms=("объект автоматизации", "описание объекта", "характеристики объекта"),
        required=True, standard_ref="ГОСТ 34.602-89, п. 2.3",
    ),
    GostSection(
        num="4", title="Требования к системе",
        synonyms=("требования к системе", "системные требования", "функциональные требования"),
        required=True, standard_ref="ГОСТ 34.602-89, п. 2.4",
    ),
    GostSection(
        num="5", title="Состав и содержание работ по созданию системы",
        synonyms=("состав работ", "этапы работ", "этапы создания"),
        required=True, standard_ref="ГОСТ 34.602-89, п. 2.5",
    ),
    GostSection(
        num="6", title="Порядок контроля и приёмки системы",
        synonyms=("порядок приёмки", "приёмочные испытания", "критерии приёмки"),
        required=True, standard_ref="ГОСТ 34.602-89, п. 2.6",
    ),
    GostSection(
        num="7", title="Требования к подготовке объекта автоматизации",
        synonyms=("подготовка объекта", "мероприятия по подготовке"),
        required=True, standard_ref="ГОСТ 34.602-89, п. 2.7",
    ),
    GostSection(
        num="8", title="Требования к документированию",
        synonyms=("требования к документации", "состав документации"),
        required=True, standard_ref="ГОСТ 34.602-89, п. 2.8",
    ),
    GostSection(
        num="9", title="Источники разработки",
        synonyms=("источники разработки", "использованные материалы"),
        required=False, standard_ref="ГОСТ 34.602-89, п. 2.9",
    ),
]


# Abbreviations that commonly appear without definition in Russian tech specs.
# When found WITHOUT a nearby Russian expansion in parentheses, it's a terminology issue.
COMMON_UNDEFINED_ABBREVIATIONS: list[tuple[str, str]] = [
    ("API", "программный интерфейс приложения"),
    ("SLA", "соглашение об уровне обслуживания"),
    ("RTO", "целевое время восстановления"),
    ("RPO", "целевая точка восстановления"),
    ("ТЗ", "техническое задание"),
    ("НИР", "научно-исследовательская работа"),
    ("ОКР", "опытно-конструкторская работа"),
    ("ПО", "программное обеспечение"),
    ("БД", "база данных"),
    ("СУБД", "система управления базами данных"),
]


# Ambiguous phrases that should be replaced with measurable criteria.
AMBIGUOUS_PHRASES: list[tuple[str, str]] = [
    (r"\bдостаточно\s+быстр", "неопределённая производительность"),
    (r"\bпри\s+необходимости\b", "условие не конкретизировано"),
    (r"\bи\s+т\.?\s*д\.?\b", "незакрытый перечень"),
    (r"\bудобный\s+интерфейс\b", "неизмеримое UX-требование"),
    (r"\bвысокая\s+производительность\b", "неколичественная метрика"),
    (r"\bмаксимально\s+быстр", "неизмеримый срок"),
]


def find_missing_sections(document_text: str) -> list[dict]:
    """Return a list of required GOST 34.602-89 sections missing from the document."""
    text_lower = document_text.lower()
    missing = []
    for sec in GOST_34_602_SECTIONS:
        if not sec.required:
            continue
        found = False
        candidates = (sec.title.lower(), *[s.lower() for s in sec.synonyms])
        for candidate in candidates:
            # Normalize whitespace for matching
            pattern = re.sub(r"\s+", r"\\s+", re.escape(candidate))
            if re.search(pattern, text_lower):
                found = True
                break
        if not found:
            missing.append({
                "num": sec.num,
                "title": sec.title,
                "standard_ref": sec.standard_ref,
            })
    return missing


def find_undefined_abbreviations(document_text: str) -> list[dict]:
    """Find abbreviations used without a nearby definition.

    Heuristic: the abbreviation appears at least once without an expansion in
    parentheses or dash within 100 characters. Simple, not perfect.
    """
    hits = []
    for abbr, expansion in COMMON_UNDEFINED_ABBREVIATIONS:
        # Match standalone abbr as a whole word
        abbr_positions = [m.start() for m in re.finditer(rf"\b{re.escape(abbr)}\b", document_text)]
        if not abbr_positions:
            continue
        # Check if any occurrence has an expansion nearby (within 150 chars before/after)
        has_definition = False
        expansion_lower = expansion.lower()
        for pos in abbr_positions:
            window_start = max(0, pos - 150)
            window_end = min(len(document_text), pos + 150)
            window = document_text[window_start:window_end].lower()
            if expansion_lower in window:
                has_definition = True
                break
        if not has_definition:
            hits.append({
                "abbreviation": abbr,
                "expected_expansion": expansion,
                "occurrences": len(abbr_positions),
            })
    return hits


def find_ambiguous_phrases(document_text: str) -> list[dict]:
    """Find ambiguous / unmeasurable phrases."""
    hits = []
    for pattern, reason in AMBIGUOUS_PHRASES:
        matches = list(re.finditer(pattern, document_text, re.IGNORECASE))
        if matches:
            # Grab the first occurrence with some context
            m = matches[0]
            start = max(0, m.start() - 40)
            end = min(len(document_text), m.end() + 40)
            hits.append({
                "phrase": m.group(0),
                "reason": reason,
                "context": document_text[start:end].strip(),
                "occurrences": len(matches),
            })
    return hits


__all__ = [
    "GOST_34_602_SECTIONS",
    "COMMON_UNDEFINED_ABBREVIATIONS",
    "AMBIGUOUS_PHRASES",
    "find_missing_sections",
    "find_undefined_abbreviations",
    "find_ambiguous_phrases",
]
