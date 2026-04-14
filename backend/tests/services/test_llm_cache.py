"""Unit tests for the SQLite-backed LLM response cache."""
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.database import LLMCache
from app.services.llm_cache import _make_key, clear_old_cache, get_cached, store_cached


class TestMakeKey:
    def test_deterministic(self):
        k1 = _make_key("model-a", "system", "user")
        k2 = _make_key("model-a", "system", "user")
        assert k1 == k2

    def test_model_affects_key(self):
        assert _make_key("model-a", "s", "u") != _make_key("model-b", "s", "u")

    def test_system_affects_key(self):
        assert _make_key("m", "sys-a", "u") != _make_key("m", "sys-b", "u")

    def test_user_affects_key(self):
        assert _make_key("m", "s", "user-a") != _make_key("m", "s", "user-b")

    def test_separator_prevents_collisions(self):
        # "ab|||cd|||ef" vs "a|||bcd|||ef" — should give different hashes
        # thanks to the |||-separator.
        k1 = _make_key("ab", "cd", "ef")
        k2 = _make_key("a", "bcd", "ef")
        assert k1 != k2

    def test_key_length_64(self):
        # SHA-256 → 64 hex chars
        assert len(_make_key("a", "b", "c")) == 64


class TestCacheRoundtrip:
    @pytest.fixture
    async def patched_session(self, test_db_engine, monkeypatch):
        """Point llm_cache.async_session at the in-memory DB."""
        from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
        import app.services.llm_cache as cache_mod
        factory = async_sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
        monkeypatch.setattr(cache_mod, "async_session", factory)
        yield factory

    async def test_miss_returns_none(self, patched_session):
        result = await get_cached("model-x", "sys", "user")
        assert result is None

    async def test_store_then_hit(self, patched_session):
        await store_cached("model-x", "sys", "user", "hello world")
        result = await get_cached("model-x", "sys", "user")
        assert result == "hello world"

    async def test_hit_count_increments(self, patched_session):
        await store_cached("model-x", "sys", "user", "cached-value")
        await get_cached("model-x", "sys", "user")
        await get_cached("model-x", "sys", "user")
        await get_cached("model-x", "sys", "user")

        async with patched_session() as s:
            row = (await s.execute(select(LLMCache))).scalar_one()
            assert row.hit_count == 3

    async def test_different_keys_isolated(self, patched_session):
        await store_cached("m1", "s", "u", "one")
        await store_cached("m2", "s", "u", "two")
        assert await get_cached("m1", "s", "u") == "one"
        assert await get_cached("m2", "s", "u") == "two"

    async def test_empty_response_not_stored(self, patched_session):
        await store_cached("m", "s", "u", "")
        assert await get_cached("m", "s", "u") is None

    async def test_store_overwrites_existing(self, patched_session):
        await store_cached("m", "s", "u", "v1")
        await store_cached("m", "s", "u", "v2")
        assert await get_cached("m", "s", "u") == "v2"


class TestTTL:
    @pytest.fixture
    async def patched_session(self, test_db_engine, monkeypatch):
        from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
        import app.services.llm_cache as cache_mod
        factory = async_sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
        monkeypatch.setattr(cache_mod, "async_session", factory)
        yield factory

    async def test_expired_entry_returns_none(self, patched_session, monkeypatch):
        # TTL = 1 day
        import app.services.llm_cache as cache_mod
        monkeypatch.setattr(cache_mod.settings, "llm_cache_ttl_days", 1)

        await store_cached("m", "s", "u", "old")
        # Force the stored entry to look 10 days old
        async with patched_session() as s:
            row = (await s.execute(select(LLMCache))).scalar_one()
            row.created_at = datetime.now(timezone.utc) - timedelta(days=10)
            await s.commit()

        # Read should treat as expired → miss
        assert await get_cached("m", "s", "u") is None

    async def test_clear_old_cache_deletes_expired(self, patched_session, monkeypatch):
        import app.services.llm_cache as cache_mod
        monkeypatch.setattr(cache_mod.settings, "llm_cache_ttl_days", 1)

        await store_cached("m", "s", "u1", "fresh")
        await store_cached("m", "s", "u2", "old")

        # Age u2
        async with patched_session() as s:
            rows = (await s.execute(select(LLMCache))).scalars().all()
            # Find and age the second entry (the one with body "old")
            for row in rows:
                if row.response == "old":
                    row.created_at = datetime.now(timezone.utc) - timedelta(days=30)
            await s.commit()

        deleted = await clear_old_cache(days=1)
        assert deleted == 1

        # "fresh" still there
        assert await get_cached("m", "s", "u1") == "fresh"

    async def test_ttl_zero_disables_expiration(self, patched_session, monkeypatch):
        import app.services.llm_cache as cache_mod
        monkeypatch.setattr(cache_mod.settings, "llm_cache_ttl_days", 0)

        # Should not delete anything
        await store_cached("m", "s", "u", "val")
        deleted = await clear_old_cache()
        assert deleted == 0


class TestDisabled:
    async def test_disabled_cache_returns_none(self, monkeypatch):
        import app.services.llm_cache as cache_mod
        monkeypatch.setattr(cache_mod.settings, "llm_cache_enabled", False)
        # No DB needed — should short-circuit
        assert await get_cached("m", "s", "u") is None

    async def test_disabled_cache_skips_store(self, test_db_engine, monkeypatch):
        from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
        import app.services.llm_cache as cache_mod

        factory = async_sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
        monkeypatch.setattr(cache_mod, "async_session", factory)
        monkeypatch.setattr(cache_mod.settings, "llm_cache_enabled", False)

        await store_cached("m", "s", "u", "hello")
        async with factory() as s:
            rows = (await s.execute(select(LLMCache))).scalars().all()
            assert rows == []
