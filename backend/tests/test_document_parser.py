"""Tests for app.services.document_parser module."""

import tempfile
import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.services.document_parser import (
    ParsedDocument,
    Section,
    _detect_sections,
    parse_document,
    parse_text_input,
    parse_txt,
)


class TestParseTxt:
    """Test parse_txt with real temporary files."""

    def test_parse_valid_utf8(self, tmp_path):
        content = "Привет мир! Это тестовый документ."
        filepath = tmp_path / "test.txt"
        filepath.write_text(content, encoding="utf-8")

        result = parse_txt(str(filepath))

        assert isinstance(result, ParsedDocument)
        assert result.full_text == content
        assert result.metadata["word_count"] == len(content.split())
        assert result.metadata["char_count"] == len(content)

    def test_parse_empty_file(self, tmp_path):
        filepath = tmp_path / "empty.txt"
        filepath.write_text("", encoding="utf-8")

        result = parse_txt(str(filepath))

        assert result.full_text == ""
        assert result.metadata["word_count"] == 0
        assert result.metadata["char_count"] == 0
        # Parser may return a default "Введение" section for empty docs
        assert len(result.sections) <= 1

    def test_parse_windows_1251_encoding(self, tmp_path):
        content = "Текст в кодировке Windows-1251"
        filepath = tmp_path / "win1251.txt"
        filepath.write_bytes(content.encode("windows-1251"))

        result = parse_txt(str(filepath))

        # chardet should detect and decode properly
        assert isinstance(result, ParsedDocument)
        assert len(result.full_text) > 0

    def test_parse_with_sections(self, tmp_path):
        content = (
            "1. Введение\n"
            "Текст введения.\n\n"
            "2. Основная часть\n"
            "Текст основной части.\n\n"
            "2.1 Подраздел\n"
            "Текст подраздела.\n"
        )
        filepath = tmp_path / "structured.txt"
        filepath.write_text(content, encoding="utf-8")

        result = parse_txt(str(filepath))

        assert len(result.sections) >= 3
        assert result.sections[0].title == "1. Введение"
        assert result.sections[1].title == "2. Основная часть"
        assert result.sections[2].title == "2.1 Подраздел"

    def test_metadata_word_count(self, tmp_path):
        content = "one two three four five"
        filepath = tmp_path / "count.txt"
        filepath.write_text(content, encoding="utf-8")

        result = parse_txt(str(filepath))

        assert result.metadata["word_count"] == 5
        assert result.metadata["char_count"] == len(content)


class TestParseTextInput:
    """Test the parse_text_input function (no file I/O)."""

    def test_basic_text(self):
        text = "Простой тестовый текст для анализа."
        result = parse_text_input(text)

        assert isinstance(result, ParsedDocument)
        assert result.full_text == text
        assert result.metadata["word_count"] == len(text.split())
        assert result.metadata["char_count"] == len(text)

    def test_empty_text(self):
        result = parse_text_input("")
        assert result.full_text == ""
        assert result.metadata["word_count"] == 0
        assert result.metadata["char_count"] == 0

    def test_text_with_sections(self):
        text = (
            "1. Общие сведения\n"
            "Описание системы.\n"
            "2. Требования\n"
            "Функциональные требования.\n"
        )
        result = parse_text_input(text)

        assert len(result.sections) >= 2
        section_titles = [s.title for s in result.sections]
        assert "1. Общие сведения" in section_titles
        assert "2. Требования" in section_titles


class TestDetectSections:
    """Test the _detect_sections helper function."""

    def test_numbered_headings(self):
        text = (
            "1. Первый раздел\n"
            "Содержимое первого раздела.\n"
            "2. Второй раздел\n"
            "Содержимое второго раздела.\n"
        )
        sections = _detect_sections(text)

        assert len(sections) == 2
        assert sections[0].title == "1. Первый раздел"
        assert sections[1].title == "2. Второй раздел"

    def test_nested_headings(self):
        text = (
            "1. Раздел\n"
            "Текст.\n"
            "1.1 Подраздел\n"
            "Текст подраздела.\n"
            "1.1.1 Подподраздел\n"
            "Глубокий текст.\n"
        )
        sections = _detect_sections(text)

        assert len(sections) == 3
        assert sections[0].level == 1
        assert sections[1].level == 2
        assert sections[2].level == 3

    def test_content_before_first_heading(self):
        text = (
            "Предисловие без номера.\n"
            "1. Первый раздел\n"
            "Содержимое.\n"
        )
        sections = _detect_sections(text)

        # First section should be the intro text (titled "Введение")
        assert len(sections) == 2
        assert sections[0].title == "Введение"
        assert "Предисловие" in sections[0].content

    def test_no_headings(self):
        text = "Просто текст без структуры.\nЕщё одна строка."
        sections = _detect_sections(text)

        # Should produce a single "Введение" section
        assert len(sections) == 1
        assert sections[0].title == "Введение"

    def test_empty_text(self):
        sections = _detect_sections("")
        # An empty string still produces one section with empty content
        assert len(sections) == 1

    def test_heading_with_trailing_dot(self):
        text = "1. Раздел с точкой\nТекст.\n"
        sections = _detect_sections(text)
        assert sections[0].title == "1. Раздел с точкой"

    def test_long_line_not_treated_as_heading(self):
        """Lines longer than 120 chars matching the pattern should not be treated as headings."""
        long_title = "1. " + "A" * 120
        text = f"{long_title}\nТекст.\n"
        sections = _detect_sections(text)
        # The long line should NOT be matched as a heading
        assert sections[0].title == "Введение"


class TestParsePdf:
    """Test parse_pdf with mocked pymupdf."""

    def test_parse_pdf_mock(self):
        mock_page = MagicMock()
        mock_page.get_text.return_value = "1. Введение\nТекст PDF документа.\n2. Требования\nТребования системы."

        mock_doc = MagicMock()
        mock_doc.__iter__ = MagicMock(return_value=iter([mock_page]))
        mock_doc.__len__ = MagicMock(return_value=1)

        with patch("app.services.document_parser.fitz") as mock_fitz:
            mock_fitz.open.return_value = mock_doc

            from app.services.document_parser import parse_pdf
            result = parse_pdf("fake.pdf")

        assert isinstance(result, ParsedDocument)
        assert "Текст PDF документа" in result.full_text
        assert result.metadata["page_count"] == 1
        assert result.metadata["word_count"] > 0
        assert result.metadata["char_count"] > 0


class TestParseDocx:
    """Test parse_docx with mocked python-docx."""

    def test_parse_docx_mock(self):
        mock_para1 = MagicMock()
        mock_para1.text = "1. Общие сведения"
        mock_para2 = MagicMock()
        mock_para2.text = "Описание системы автоматизации."

        mock_doc = MagicMock()
        mock_doc.paragraphs = [mock_para1, mock_para2]
        mock_doc.tables = []

        with patch("app.services.document_parser.DocxDocument") as mock_docx_cls:
            mock_docx_cls.return_value = mock_doc

            from app.services.document_parser import parse_docx
            result = parse_docx("fake.docx")

        assert isinstance(result, ParsedDocument)
        assert "Общие сведения" in result.full_text
        assert result.metadata["paragraph_count"] == 2
        assert result.metadata["word_count"] > 0


class TestParseDocument:
    """Test the dispatch function parse_document."""

    def test_dispatches_to_txt(self, tmp_path):
        filepath = tmp_path / "test.txt"
        filepath.write_text("Текст документа.", encoding="utf-8")

        result = parse_document(str(filepath))

        assert isinstance(result, ParsedDocument)
        assert result.full_text == "Текст документа."

    def test_dispatches_pdf_by_extension(self):
        with patch("app.services.document_parser.parse_pdf") as mock_parse:
            mock_parse.return_value = ParsedDocument(full_text="pdf text", sections=[], metadata={})
            result = parse_document("document.pdf")
            mock_parse.assert_called_once_with("document.pdf")

    def test_dispatches_docx_by_extension(self):
        with patch("app.services.document_parser.parse_docx") as mock_parse:
            mock_parse.return_value = ParsedDocument(full_text="docx text", sections=[], metadata={})
            result = parse_document("document.docx")
            mock_parse.assert_called_once_with("document.docx")

    def test_unknown_extension_falls_back_to_txt(self, tmp_path):
        filepath = tmp_path / "test.xyz"
        filepath.write_text("fallback text", encoding="utf-8")

        result = parse_document(str(filepath))

        assert result.full_text == "fallback text"
