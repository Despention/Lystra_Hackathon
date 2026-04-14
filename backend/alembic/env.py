"""Alembic environment for Lystra.

Uses the same async SQLAlchemy engine as the app. Reads database URL from
app.config.settings so dev and migrations can't drift.
"""
from __future__ import annotations

import asyncio
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool
from sqlalchemy.ext.asyncio import AsyncEngine

# Ensure the app package is importable when invoked via `alembic ...`.
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402
from app.database import Base  # noqa: E402

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# URL resolution order (first non-empty wins):
#   1. sqlalchemy.url already set on the Config (via command.upgrade with
#      a pre-configured Config object — used by app.database.init_db)
#   2. ALEMBIC_DATABASE_URL env var (CLI override for staging runs)
#   3. app.config.settings.database_url (default — same DB as the app)
_preset = config.get_main_option("sqlalchemy.url") or ""
database_url = _preset or os.environ.get("ALEMBIC_DATABASE_URL") or settings.database_url
config.set_main_option("sqlalchemy.url", database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (no live DB connection)."""
    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        render_as_batch=True,  # SQLite needs batch mode for ALTERs
    )
    with context.begin_transaction():
        context.run_migrations()


def _is_async_url(url: str) -> bool:
    # e.g. sqlite+aiosqlite, postgresql+asyncpg
    return "+async" in url or "+aiosqlite" in url or "+asyncpg" in url


async def run_migrations_online_async() -> None:
    """Run migrations in 'online' mode against an async engine."""
    connectable = AsyncEngine(
        engine_from_config(
            config.get_section(config.config_ini_section, {}),
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
            future=True,
        )
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online_sync() -> None:
    """Run migrations with a sync engine (for plain sqlite:/// URLs)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        do_run_migrations(connection)
    connectable.dispose()


def run_migrations_online() -> None:
    if _is_async_url(database_url):
        asyncio.run(run_migrations_online_async())
    else:
        run_migrations_online_sync()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
