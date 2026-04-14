"""baseline: folders, analyses, agent_results, issues, corrections, llm_cache

Revision ID: 20260414_2040_baseline
Revises:
Create Date: 2026-04-14 20:40:00
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260414_2040_baseline"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "folders",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("parent_id", sa.String(), sa.ForeignKey("folders.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "analyses",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("filename", sa.String(), nullable=True),
        sa.Column("file_type", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("total_score", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("document_text", sa.Text(), nullable=True),
        sa.Column("mode", sa.String(), nullable=True),
        sa.Column("not_ready", sa.String(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("improved_text", sa.Text(), nullable=True),
        sa.Column("folder_id", sa.String(), sa.ForeignKey("folders.id"), nullable=True),
    )

    op.create_table(
        "agent_results",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("analysis_id", sa.String(), sa.ForeignKey("analyses.id"), nullable=False),
        sa.Column("agent_name", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("weight", sa.Float(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("raw_output", sa.Text(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
    )

    op.create_table(
        "issues",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("analysis_id", sa.String(), sa.ForeignKey("analyses.id"), nullable=False),
        sa.Column("agent_name", sa.String(), nullable=False),
        sa.Column("severity", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("document_quote", sa.Text(), nullable=True),
        sa.Column("standard_reference", sa.String(), nullable=True),
        sa.Column("recommendation", sa.Text(), nullable=False),
        sa.Column("penalty", sa.Float(), nullable=True),
    )

    op.create_table(
        "corrections",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("analysis_id", sa.String(), sa.ForeignKey("analyses.id"), nullable=False),
        sa.Column("section", sa.String(), nullable=False),
        sa.Column("original_text", sa.Text(), nullable=False),
        sa.Column("suggested_text", sa.Text(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(), nullable=False),
    )

    op.create_table(
        "llm_cache",
        sa.Column("key", sa.String(), primary_key=True),
        sa.Column("model", sa.String(), nullable=False),
        sa.Column("response", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("hit_count", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_table("llm_cache")
    op.drop_table("corrections")
    op.drop_table("issues")
    op.drop_table("agent_results")
    op.drop_table("analyses")
    op.drop_table("folders")
