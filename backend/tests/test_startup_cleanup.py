"""Tests for startup cleanup of stale analyses."""
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.database import Analysis, gen_uuid
from app.main import _cleanup_stale_analyses


class TestCleanupStaleAnalyses:
    async def test_marks_processing_as_failed(self, test_db_engine):
        factory = async_sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)

        # Seed: one processing, one completed, one pending
        async with factory() as db:
            for status in ("processing", "completed", "pending"):
                db.add(Analysis(
                    id=gen_uuid(),
                    filename=f"{status}.txt",
                    status=status,
                    created_at=datetime.now(timezone.utc),
                    mode="full",
                ))
            await db.commit()

        # Run cleanup with patched session
        with patch("app.database.async_session", factory), \
             patch("app.main.async_session", factory, create=True):
            await _cleanup_stale_analyses()

        async with factory() as db:
            result = await db.execute(select(Analysis))
            rows = result.scalars().all()
            by_status = {r.status: r for r in rows}
            assert "completed" in by_status
            assert "failed" in by_status  # was "processing"
            # Both processing and pending should now be failed
            failed_ones = [r for r in rows if r.status == "failed"]
            assert len(failed_ones) == 2
            for r in failed_ones:
                assert r.not_ready == "Server restart during analysis"

    async def test_no_stale_rows_is_noop(self, test_db_engine):
        factory = async_sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)

        async with factory() as db:
            db.add(Analysis(
                id=gen_uuid(),
                filename="done.txt",
                status="completed",
                created_at=datetime.now(timezone.utc),
                mode="full",
            ))
            await db.commit()

        with patch("app.database.async_session", factory), \
             patch("app.main.async_session", factory, create=True):
            await _cleanup_stale_analyses()  # should not raise, should not change anything

        async with factory() as db:
            result = await db.execute(select(Analysis))
            rows = result.scalars().all()
            assert all(r.status == "completed" for r in rows)
