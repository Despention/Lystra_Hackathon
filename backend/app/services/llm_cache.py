"""LLM response cache backed by SQLite.

Goal: avoid re-running the same (model, system, user) triple through the LLM.
Key = SHA-256 hex of the three strings joined by a separator.

Usage:
    from app.services import llm_cache
    cached = await llm_cache.get_cached(session, model, system, user)
    if cached is not None:
        return cached
    response = await llm.complete(...)
    await llm_cache.store_cached(session, model, system, user, response)
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import LLMCache, async_session, utcnow

logger = logging.getLogger(__name__)


def _make_key(model: str, system: str, user: str) -> str:
    h = hashlib.sha256()
    h.update(model.encode("utf-8"))
    h.update(b"|||")
    h.update(system.encode("utf-8"))
    h.update(b"|||")
    h.update(user.encode("utf-8"))
    return h.hexdigest()


async def get_cached(
    model: str,
    system: str,
    user: str,
    session: AsyncSession | None = None,
) -> str | None:
    """Return cached response or None. Increments hit_count on hit.

    If session is None, opens a new one.
    """
    if not settings.llm_cache_enabled:
        return None

    key = _make_key(model, system, user)

    async def _query(s: AsyncSession) -> str | None:
        result = await s.execute(select(LLMCache).where(LLMCache.key == key))
        entry = result.scalar_one_or_none()
        if entry is None:
            return None

        # TTL check
        if settings.llm_cache_ttl_days > 0:
            age = datetime.now(timezone.utc) - entry.created_at.replace(tzinfo=timezone.utc)
            if age > timedelta(days=settings.llm_cache_ttl_days):
                return None

        entry.hit_count = (entry.hit_count or 0) + 1
        await s.commit()
        return entry.response

    if session is not None:
        return await _query(session)

    async with async_session() as s:
        return await _query(s)


async def store_cached(
    model: str,
    system: str,
    user: str,
    response: str,
    session: AsyncSession | None = None,
) -> None:
    """Insert or update a cache entry. Silent on failure (cache is best-effort)."""
    if not settings.llm_cache_enabled:
        return
    if not response:
        return  # don't cache empty responses

    key = _make_key(model, system, user)

    async def _store(s: AsyncSession) -> None:
        try:
            # Upsert via primary-key lookup (SQLite doesn't love ON CONFLICT here)
            existing = await s.execute(select(LLMCache).where(LLMCache.key == key))
            entry = existing.scalar_one_or_none()
            if entry is None:
                s.add(LLMCache(
                    key=key,
                    model=model,
                    response=response,
                    created_at=utcnow(),
                    hit_count=0,
                ))
            else:
                entry.response = response
                entry.created_at = utcnow()
            await s.commit()
        except Exception as e:
            logger.warning("llm_cache store failed: %s", e)
            await s.rollback()

    if session is not None:
        await _store(session)
    else:
        async with async_session() as s:
            await _store(s)


async def clear_old_cache(days: int | None = None) -> int:
    """Delete entries older than `days`. Returns number of deleted rows."""
    ttl_days = days if days is not None else settings.llm_cache_ttl_days
    if ttl_days <= 0:
        return 0

    cutoff = datetime.now(timezone.utc) - timedelta(days=ttl_days)
    from sqlalchemy import delete
    async with async_session() as s:
        result = await s.execute(delete(LLMCache).where(LLMCache.created_at < cutoff))
        await s.commit()
        return result.rowcount or 0


__all__ = ["get_cached", "store_cached", "clear_old_cache"]
