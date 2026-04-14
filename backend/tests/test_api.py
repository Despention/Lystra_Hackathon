"""Tests for the FastAPI API endpoints."""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from app.database import Analysis, Issue, gen_uuid
from app.database import AgentResult as AgentResultModel


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------

class TestHealthEndpoint:
    """Test GET /api/health."""

    async def test_health_returns_ok(self, async_client):
        response = await async_client.get("/api/health")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "ok"
        assert data["version"] == "0.1.0"
        assert "llm_available" in data
        assert "database" in data

    async def test_health_with_mock_llm(self, async_client):
        """When use_mock_llm is True, llm_available should be True."""
        with patch("app.api.health.settings") as mock_settings:
            mock_settings.use_mock_llm = True
            response = await async_client.get("/api/health")
            data = response.json()
            assert data["llm_available"] is True


# ---------------------------------------------------------------------------
# Analyze endpoint
# ---------------------------------------------------------------------------

class TestAnalyzeEndpoint:
    """Test POST /api/analyze."""

    async def test_analyze_with_text(self, async_client):
        """Submitting text should create an analysis and return its ID."""
        response = await async_client.post(
            "/api/analyze",
            data={"text": "1. Введение\nТестовый документ для анализа.", "mode": "full"},
        )
        assert response.status_code == 200

        data = response.json()
        assert "analysis_id" in data
        assert data["status"] == "pending"
        assert len(data["analysis_id"]) > 10  # UUID should be long

    async def test_analyze_without_text_or_file_returns_error(self, async_client):
        """Neither file nor text should return 400 or 422."""
        response = await async_client.post("/api/analyze", data={})
        # The endpoint expects either file or text; sending neither should fail
        assert response.status_code in (400, 422)

    async def test_analyze_quick_mode(self, async_client):
        response = await async_client.post(
            "/api/analyze",
            data={"text": "Документ для быстрого анализа.", "mode": "quick"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"


# ---------------------------------------------------------------------------
# History endpoint
# ---------------------------------------------------------------------------

class TestHistoryEndpoint:
    """Test GET /api/history."""

    async def test_history_returns_list(self, async_client):
        response = await async_client.get("/api/history")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)

    async def test_history_after_analysis(self, async_client, test_db_engine):
        """After creating an analysis, it should appear in history."""
        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
        from datetime import datetime, timezone

        session_factory = async_sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
        async with session_factory() as db:
            analysis = Analysis(
                id=gen_uuid(),
                filename="test.txt",
                file_type="txt",
                status="completed",
                total_score=75.0,
                created_at=datetime.now(timezone.utc),
                document_text="Test text",
                mode="full",
            )
            db.add(analysis)
            await db.commit()

        response = await async_client.get("/api/history")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["status"] == "completed"

    async def test_history_pagination(self, async_client):
        response = await async_client.get("/api/history", params={"page": 1, "per_page": 5})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# ---------------------------------------------------------------------------
# Get analysis by ID
# ---------------------------------------------------------------------------

class TestGetAnalysisEndpoint:
    """Test GET /api/analysis/{id}."""

    async def test_get_nonexistent_analysis_returns_404(self, async_client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await async_client.get(f"/api/analysis/{fake_id}")
        assert response.status_code == 404

    async def test_get_existing_analysis(self, async_client, test_db_engine):
        """Seed an analysis and retrieve it."""
        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
        from datetime import datetime, timezone

        session_factory = async_sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
        analysis_id = gen_uuid()

        async with session_factory() as db:
            analysis = Analysis(
                id=analysis_id,
                filename="report.docx",
                file_type="docx",
                status="completed",
                total_score=82.5,
                created_at=datetime.now(timezone.utc),
                completed_at=datetime.now(timezone.utc),
                document_text="Sample TZ content",
                mode="full",
            )
            db.add(analysis)

            # Add an agent result
            ar = AgentResultModel(
                id=gen_uuid(),
                analysis_id=analysis_id,
                agent_name="structural",
                status="completed",
                score=80.0,
                weight=0.20,
                started_at=datetime.now(timezone.utc),
                completed_at=datetime.now(timezone.utc),
            )
            db.add(ar)

            # Add an issue
            issue = Issue(
                id=gen_uuid(),
                analysis_id=analysis_id,
                agent_name="structural",
                severity="warning",
                title="Minor issue",
                description="A minor structural issue",
                recommendation="Fix the order of sections",
                penalty=2.0,
            )
            db.add(issue)
            await db.commit()

        response = await async_client.get(f"/api/analysis/{analysis_id}")
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == analysis_id
        assert data["filename"] == "report.docx"
        assert data["status"] == "completed"
        assert data["total_score"] == 82.5
        assert len(data["agent_results"]) == 1
        assert data["agent_results"][0]["agent_name"] == "structural"
        assert len(data["issues"]) == 1
        assert data["issues"][0]["severity"] == "warning"


# ---------------------------------------------------------------------------
# Export endpoint
# ---------------------------------------------------------------------------

class TestExportEndpoint:
    """Test GET /api/export/{id}/pdf."""

    async def test_export_nonexistent_returns_404(self, async_client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await async_client.get(f"/api/export/{fake_id}/pdf")
        assert response.status_code == 404

    async def test_export_existing_analysis(self, async_client, test_db_engine):
        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
        from datetime import datetime, timezone

        session_factory = async_sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
        analysis_id = gen_uuid()

        async with session_factory() as db:
            analysis = Analysis(
                id=analysis_id,
                filename="export_test.txt",
                file_type="txt",
                status="completed",
                total_score=70.0,
                created_at=datetime.now(timezone.utc),
                completed_at=datetime.now(timezone.utc),
                document_text="Export test content",
                mode="full",
            )
            db.add(analysis)
            await db.commit()

        response = await async_client.get(f"/api/export/{analysis_id}/pdf")
        assert response.status_code == 200
        assert "application/pdf" in response.headers["content-type"]
        # PDF magic bytes — anything else means the endpoint regressed to HTML
        assert response.content.startswith(b"%PDF-")

    async def test_export_html_endpoint_returns_html(self, async_client, test_db_engine):
        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
        from datetime import datetime, timezone

        session_factory = async_sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
        analysis_id = gen_uuid()

        async with session_factory() as db:
            analysis = Analysis(
                id=analysis_id,
                filename="export_test.txt",
                file_type="txt",
                status="completed",
                total_score=70.0,
                created_at=datetime.now(timezone.utc),
                completed_at=datetime.now(timezone.utc),
                document_text="Export test content",
                mode="full",
            )
            db.add(analysis)
            await db.commit()

        response = await async_client.get(f"/api/export/{analysis_id}/html")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
        assert "TZ Analyzer" in response.text
