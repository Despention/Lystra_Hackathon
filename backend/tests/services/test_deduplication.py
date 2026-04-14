"""Unit tests for cross-agent issue deduplication."""
import pytest

from app.agents.base import IssueData
from app.services.deduplication import deduplicate_issues


def _issue(title: str, severity: str = "warning", description: str = "") -> IssueData:
    return IssueData(
        severity=severity,
        title=title,
        description=description or title,
    )


class TestDeduplicate:
    def test_empty_input_returns_empty(self):
        assert deduplicate_issues([]) == []

    def test_single_issue_returned_as_is(self):
        issue = _issue("Отсутствует раздел Общие сведения")
        assert deduplicate_issues([issue]) == [issue]

    def test_distinct_issues_not_merged(self):
        a = _issue("Отсутствует раздел Требования")
        b = _issue("Неопределённая аббревиатура API")
        result = deduplicate_issues([a, b])
        assert len(result) == 2

    def test_near_duplicates_collapsed(self):
        a = _issue("Отсутствует раздел Требования к системе", severity="critical")
        b = _issue("Отсутствует раздел требования системы", severity="warning")
        result = deduplicate_issues([a, b])
        assert len(result) == 1
        # Higher-severity winner (critical > warning)
        assert result[0].severity == "critical"

    def test_severity_ranking_prefers_critical(self):
        a = _issue("нерасшифрованное сокращение API", severity="advice")
        b = _issue("нерасшифрованное сокращение API", severity="serious")
        c = _issue("нерасшифрованное сокращение API", severity="critical")
        result = deduplicate_issues([a, b, c])
        assert len(result) == 1
        assert result[0].severity == "critical"

    def test_tie_broken_by_longer_description(self):
        long_desc = "Подробное описание проблемы с конкретными примерами."
        # Identical titles → cluster guaranteed; same severity → description wins
        a = _issue("Отсутствует раздел Общие сведения", description="Кратко.")
        b = _issue("Отсутствует раздел Общие сведения", description=long_desc)
        result = deduplicate_issues([a, b])
        assert len(result) == 1
        assert result[0].description == long_desc

    def test_issues_below_threshold_kept_separate(self):
        a = _issue("Неопределённая аббревиатура API")
        b = _issue("Нарушена логическая структура документа")
        result = deduplicate_issues([a, b], threshold=0.7)
        assert len(result) == 2

    def test_threshold_lowered_merges_more(self):
        a = _issue("раздел требования отсутствует")
        b = _issue("требования неполные")
        # With a permissive threshold, these might be merged
        strict = deduplicate_issues([a, b], threshold=0.9)
        permissive = deduplicate_issues([a, b], threshold=0.3)
        assert len(strict) >= len(permissive)


class TestStemmerFallback:
    def test_works_without_snowballstemmer(self, monkeypatch):
        """If snowballstemmer is unavailable, dedup should still function."""
        import app.services.deduplication as dedup_mod

        # Reset cached stemmer and force import failure
        monkeypatch.setattr(dedup_mod, "_stemmer", None)

        def _fake_get_stemmer():
            # Simulate failed import
            dedup_mod._stemmer = False
            return None

        monkeypatch.setattr(dedup_mod, "_get_stemmer", _fake_get_stemmer)

        a = _issue("Отсутствует раздел Требования к системе")
        b = _issue("Отсутствует раздел Требования к системе")  # exact duplicate
        result = dedup_mod.deduplicate_issues([a, b])
        # Exact duplicates still collapse even without stemming
        assert len(result) == 1
