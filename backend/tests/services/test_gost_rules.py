"""Unit tests for deterministic GOST rule matchers."""
from app.knowledge.gost_rules import (
    find_ambiguous_phrases,
    find_missing_sections,
    find_undefined_abbreviations,
)


class TestFindMissingSections:
    def test_all_sections_present_by_title(self):
        doc = "\n".join([
            "1. Общие сведения",
            "2. Назначение и цели создания системы",
            "3. Характеристика объектов автоматизации",
            "4. Требования к системе",
            "5. Состав и содержание работ по созданию системы",
            "6. Порядок контроля и приёмки системы",
            "7. Требования к подготовке объекта автоматизации",
            "8. Требования к документированию",
        ])
        assert find_missing_sections(doc) == []

    def test_finds_sections_by_synonyms(self):
        # Synonym for "Общие сведения" is "введение"
        doc = (
            "Введение\n2. Цели и задачи\nОбъект автоматизации описан ниже.\n"
            "Системные требования: …\nЭтапы работ: ...\n"
            "Критерии приёмки\nПодготовка объекта\nСостав документации"
        )
        missing = find_missing_sections(doc)
        # All required sections should be found through synonyms
        assert missing == []

    def test_reports_missing_required(self):
        # Only one section; the rest should be missing
        doc = "1. Общие сведения\nПолное наименование системы."
        missing = find_missing_sections(doc)
        titles = {m["title"] for m in missing}
        assert "Требования к системе" in titles
        assert "Состав и содержание работ по созданию системы" in titles

    def test_missing_entries_carry_standard_ref(self):
        missing = find_missing_sections("")
        assert all("standard_ref" in m for m in missing)
        assert all("num" in m for m in missing)
        assert all(m["standard_ref"].startswith("ГОСТ 34.602") for m in missing)

    def test_case_insensitive_match(self):
        doc = "ТРЕБОВАНИЯ К СИСТЕМЕ описаны подробно."
        missing = find_missing_sections(doc)
        titles = {m["title"] for m in missing}
        assert "Требования к системе" not in titles


class TestFindUndefinedAbbreviations:
    def test_abbreviation_with_nearby_expansion(self):
        doc = "API (программный интерфейс приложения) используется для..."
        assert find_undefined_abbreviations(doc) == []

    def test_undefined_abbreviation_flagged(self):
        doc = "Система должна иметь API, SLA и RTO для всех сервисов."
        hits = find_undefined_abbreviations(doc)
        hit_abbrs = {h["abbreviation"] for h in hits}
        assert "API" in hit_abbrs
        assert "SLA" in hit_abbrs
        assert "RTO" in hit_abbrs

    def test_no_occurrence_means_no_hit(self):
        doc = "Никаких сокращений в этом документе нет."
        hits = find_undefined_abbreviations(doc)
        # There's no "API" etc. in the doc, so no hits
        assert all(h["abbreviation"] not in {"API", "SLA"} for h in hits)

    def test_occurrences_count_matches(self):
        doc = "API работает. API надёжен. API быстр."
        hits = find_undefined_abbreviations(doc)
        api_hit = next((h for h in hits if h["abbreviation"] == "API"), None)
        assert api_hit is not None
        assert api_hit["occurrences"] == 3


class TestFindAmbiguousPhrases:
    def test_flags_ambiguous_performance(self):
        doc = "Система должна работать достаточно быстро."
        hits = find_ambiguous_phrases(doc)
        assert len(hits) >= 1
        reasons = {h["reason"] for h in hits}
        assert any("производительность" in r for r in reasons)

    def test_flags_open_ended_list(self):
        doc = "Поддерживаются форматы PDF, DOCX и т.д."
        hits = find_ambiguous_phrases(doc)
        reasons = {h["reason"] for h in hits}
        assert any("перечень" in r for r in reasons)

    def test_no_ambiguity_in_concrete_text(self):
        doc = (
            "Время отклика API должно быть не более 200мс при нагрузке 1000 RPS. "
            "Поддерживаются форматы PDF, DOCX, TXT, XLSX."
        )
        hits = find_ambiguous_phrases(doc)
        assert hits == []

    def test_context_included(self):
        doc = "Интерфейс должен быть удобный интерфейс для пользователей."
        hits = find_ambiguous_phrases(doc)
        assert len(hits) >= 1
        h = hits[0]
        assert "phrase" in h
        assert "context" in h
        assert "occurrences" in h
