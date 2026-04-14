import glob
import os

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import Analysis, Correction, Issue, async_session
from app.schemas import (
    AgentResultResponse,
    AnalysisListItem,
    AnalysisResponse,
    CorrectionResponse,
    IssueResponse,
)

router = APIRouter()


@router.get("/api/analysis/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(analysis_id: str):
    async with async_session() as db:
        result = await db.execute(
            select(Analysis)
            .options(
                selectinload(Analysis.agent_results),
                selectinload(Analysis.issues),
                selectinload(Analysis.corrections),
            )
            .where(Analysis.id == analysis_id)
        )
        analysis = result.scalar_one_or_none()
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")

        return AnalysisResponse(
            id=analysis.id,
            filename=analysis.filename,
            file_type=analysis.file_type,
            status=analysis.status,
            total_score=analysis.total_score,
            created_at=analysis.created_at,
            completed_at=analysis.completed_at,
            mode=analysis.mode,
            not_ready=analysis.not_ready,
            summary=analysis.summary,
            improved_text=analysis.improved_text,
            folder_id=analysis.folder_id,
            agent_results=[
                AgentResultResponse(
                    agent_name=ar.agent_name,
                    status=ar.status,
                    score=ar.score,
                    weight=ar.weight,
                    started_at=ar.started_at,
                    completed_at=ar.completed_at,
                )
                for ar in analysis.agent_results
            ],
            issues=[
                IssueResponse(
                    id=issue.id,
                    agent_name=issue.agent_name,
                    severity=issue.severity,
                    title=issue.title,
                    description=issue.description,
                    document_quote=issue.document_quote,
                    standard_reference=issue.standard_reference,
                    recommendation=issue.recommendation,
                    penalty=issue.penalty,
                )
                for issue in sorted(analysis.issues, key=lambda i: (
                    {"critical": 0, "serious": 1, "warning": 2, "advice": 3}.get(i.severity, 4)
                ))
            ],
            corrections=[
                CorrectionResponse(
                    id=c.id,
                    analysis_id=c.analysis_id,
                    section=c.section,
                    original_text=c.original_text,
                    suggested_text=c.suggested_text,
                    reason=c.reason,
                    severity=c.severity,
                )
                for c in analysis.corrections
            ],
        )


@router.delete("/api/analysis/{analysis_id}", status_code=204)
async def delete_analysis(analysis_id: str):
    """Delete an analysis and all related data, including the uploaded file."""
    async with async_session() as db:
        result = await db.execute(
            select(Analysis).where(Analysis.id == analysis_id)
        )
        analysis = result.scalar_one_or_none()
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")

        # Delete uploaded file from disk if it exists
        upload_pattern = os.path.join(settings.upload_dir, f"{analysis_id}.*")
        for filepath in glob.glob(upload_pattern):
            try:
                os.remove(filepath)
            except OSError:
                pass  # Best effort file deletion

        # Delete the analysis (cascade will remove agent_results and issues)
        await db.delete(analysis)
        await db.commit()

    return Response(status_code=204)


@router.get("/api/history", response_model=list[AnalysisListItem])
async def get_history(
    page: int = 1,
    per_page: int = 20,
    search: str | None = Query(None, description="Filter by filename (case-insensitive substring match)"),
    min_score: float | None = Query(None, ge=0, le=100, description="Minimum total score"),
    max_score: float | None = Query(None, ge=0, le=100, description="Maximum total score"),
    mode: str | None = Query(None, description="Filter by analysis mode (quick/full)"),
    folder_id: str | None = Query(None, description="Filter by folder ID"),
):
    offset = (page - 1) * per_page

    async with async_session() as db:
        query = select(Analysis)

        # Apply filters
        if search:
            query = query.where(Analysis.filename.ilike(f"%{search}%"))
        if min_score is not None:
            query = query.where(Analysis.total_score >= min_score)
        if max_score is not None:
            query = query.where(Analysis.total_score <= max_score)
        if mode:
            query = query.where(Analysis.mode == mode)
        if folder_id is not None:
            query = query.where(Analysis.folder_id == folder_id)

        query = query.order_by(Analysis.created_at.desc()).offset(offset).limit(per_page)
        result = await db.execute(query)
        analyses = result.scalars().all()

        items = []
        for a in analyses:
            # Count issues
            issue_count_result = await db.execute(
                select(func.count()).select_from(Issue).where(Issue.analysis_id == a.id)
            )
            issues_count = issue_count_result.scalar() or 0

            critical_count_result = await db.execute(
                select(func.count()).select_from(Issue).where(
                    Issue.analysis_id == a.id, Issue.severity == "critical"
                )
            )
            critical_count = critical_count_result.scalar() or 0

            items.append(AnalysisListItem(
                id=a.id,
                filename=a.filename,
                status=a.status,
                total_score=a.total_score,
                created_at=a.created_at,
                mode=a.mode,
                summary=a.summary,
                folder_id=a.folder_id,
                issues_count=issues_count,
                critical_count=critical_count,
            ))

        return items
