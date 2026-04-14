"""Common fixtures for TZ Analyzer backend tests."""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.services.document_parser import ParsedDocument, Section


# ---------------------------------------------------------------------------
# Sample parsed documents
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_parsed_document() -> ParsedDocument:
    """A realistic parsed TZ document with sections and metadata."""
    text = (
        "1. Общие сведения\n"
        "Полное наименование системы: Автоматизированная информационная система.\n\n"
        "2. Назначение и цели создания системы\n"
        "Система предназначена для автоматизации процессов обработки данных.\n\n"
        "3. Характеристика объектов автоматизации\n"
        "Объектом автоматизации является отдел обработки данных.\n\n"
        "4. Требования к системе\n"
        "4.1 Требования к функциональности\n"
        "Система должна обеспечивать ввод и обработку данных.\n"
        "Время обработки запроса - не более 1 секунды.\n\n"
        "5. Состав и содержание работ\n"
        "Работы выполняются в три этапа.\n"
    )
    return ParsedDocument(
        full_text=text,
        sections=[
            Section(title="1. Общие сведения", level=1, content="Полное наименование системы: Автоматизированная информационная система."),
            Section(title="2. Назначение и цели создания системы", level=1, content="Система предназначена для автоматизации процессов обработки данных."),
            Section(title="3. Характеристика объектов автоматизации", level=1, content="Объектом автоматизации является отдел обработки данных."),
            Section(title="4. Требования к системе", level=1, content=""),
            Section(title="4.1 Требования к функциональности", level=2, content="Система должна обеспечивать ввод и обработку данных.\nВремя обработки запроса - не более 1 секунды."),
            Section(title="5. Состав и содержание работ", level=1, content="Работы выполняются в три этапа."),
        ],
        metadata={
            "word_count": len(text.split()),
            "char_count": len(text),
        },
    )


@pytest.fixture
def empty_parsed_document() -> ParsedDocument:
    """An empty parsed document."""
    return ParsedDocument(
        full_text="",
        sections=[],
        metadata={"word_count": 0, "char_count": 0},
    )


# ---------------------------------------------------------------------------
# Mock LLM
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_llm():
    """A mock LLM client that returns pre-built JSON."""
    from app.services.mock_llm import MockLLMClient
    return MockLLMClient()


# ---------------------------------------------------------------------------
# Database fixtures (in-memory SQLite)
# ---------------------------------------------------------------------------

@pytest.fixture
async def test_db_engine():
    """Create an in-memory async SQLite engine for tests."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    from app.database import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def test_db_session(test_db_engine):
    """Provide an async session bound to the in-memory database."""
    session_factory = async_sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session


# ---------------------------------------------------------------------------
# FastAPI test app with patched database
# ---------------------------------------------------------------------------

@pytest.fixture
async def test_app(test_db_engine):
    """Create a FastAPI test application with an in-memory database."""
    from app.database import Base

    test_session_factory = async_sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)

    # Patch the async_session used by the API modules to use our in-memory DB.
    # Also patch init_db so the lifespan does not try to use the production engine.
    async def noop_init_db():
        pass

    with patch("app.api.analyze.async_session", test_session_factory), \
         patch("app.api.results.async_session", test_session_factory), \
         patch("app.api.export.async_session", test_session_factory), \
         patch("app.database.async_session", test_session_factory), \
         patch("app.main.init_db", noop_init_db):
        from app.main import app
        yield app


@pytest.fixture
async def async_client(test_app):
    """Provide an httpx.AsyncClient bound to the test application."""
    from httpx import ASGITransport, AsyncClient
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
