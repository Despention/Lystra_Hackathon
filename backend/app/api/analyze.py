import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from sqlalchemy import select

from app.agents.orchestrator import run_analysis, run_correction_agent
from app.api.websocket import manager
from app.config import settings
from app.database import AgentResult as AgentResultModel
from app.database import Analysis, Correction, Issue, async_session, gen_uuid
from app.schemas import AnalyzeStartResponse
from app.services.document_parser import parse_document, parse_text_input
from app.services.llm_client import LLMClient
from app.services.mock_llm import MockLLMClient
from app.services.scoring import WEIGHTS
from app.services.summary_generator import generate_summary

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory set of cancelled analysis IDs
_cancelled_analyses: set[str] = set()


def is_cancelled(analysis_id: str) -> bool:
    """Check if an analysis has been cancelled."""
    return analysis_id in _cancelled_analyses


def get_llm_clients():
    if settings.use_mock_llm:
        mock = MockLLMClient()
        return mock, mock
    large = LLMClient(settings.llama_cpp_base_url, settings.llama_cpp_model_large)
    # Малая модель идёт на отдельный порт если задан, иначе на тот же сервер
    small_url = settings.llama_cpp_base_url_small or settings.llama_cpp_base_url
    small = LLMClient(small_url, settings.llama_cpp_model_small)
    return large, small


async def _run_analysis_task(analysis_id: str, document, mode: str):
    llm_large, llm_small = get_llm_clients()

    async def on_event(event: dict):
        await manager.broadcast(analysis_id, event)

    async with async_session() as db:
        # Check if already cancelled before starting
        if is_cancelled(analysis_id):
            result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
            analysis = result.scalar_one()
            analysis.status = "cancelled"
            await db.commit()
            await on_event({"type": "analysis_cancelled", "analysis_id": analysis_id})
            _cancelled_analyses.discard(analysis_id)
            return

        # Mark as processing
        result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
        analysis = result.scalar_one()
        analysis.status = "processing"
        await db.commit()

        # Generate summary
        try:
            summary = await generate_summary(document.full_text, llm_large)
            analysis.summary = summary
            await db.commit()
        except Exception as e:
            logger.warning("Summary generation failed: %s", e)

        try:
            agent_results, score_info = await run_analysis(
                document, llm_large, llm_small, mode, on_event,
                cancel_check=lambda: is_cancelled(analysis_id),
            )

            # If cancelled during execution
            if is_cancelled(analysis_id):
                analysis.status = "cancelled"
                await db.commit()
                await on_event({"type": "analysis_cancelled", "analysis_id": analysis_id})
                _cancelled_analyses.discard(analysis_id)
                return

            # Save agent results and issues
            for ar in agent_results:
                db_ar = AgentResultModel(
                    id=gen_uuid(),
                    analysis_id=analysis_id,
                    agent_name=ar.agent_name,
                    status="completed" if not ar.error else "failed",
                    score=ar.score,
                    weight=WEIGHTS.get(ar.agent_name, 0.0),
                    started_at=datetime.now(timezone.utc),
                    completed_at=datetime.now(timezone.utc),
                    raw_output=ar.raw_output,
                )
                db.add(db_ar)

                for issue in ar.issues:
                    db_issue = Issue(
                        id=gen_uuid(),
                        analysis_id=analysis_id,
                        agent_name=ar.agent_name,
                        severity=issue.severity,
                        title=issue.title,
                        description=issue.description,
                        document_quote=issue.document_quote,
                        standard_reference=issue.standard_reference,
                        recommendation=issue.recommendation,
                        penalty=issue.penalty,
                    )
                    db.add(db_issue)

            # Detect if all/most agents failed
            failed_count = sum(1 for ar in agent_results if ar.error)
            total_count = len(agent_results)
            all_failed = total_count > 0 and failed_count == total_count

            if all_failed:
                # All agents failed — mark analysis as failed
                first_error = next((ar.error for ar in agent_results if ar.error), "Unknown error")
                analysis.status = "failed"
                analysis.not_ready = f"Все агенты завершились с ошибкой: {first_error[:200]}"
                analysis.completed_at = datetime.now(timezone.utc)
                await db.commit()
                await manager.broadcast_error(analysis_id, first_error)
                return

            # Run correction agent after main analysis (only if at least one agent succeeded)
            corrections = await run_correction_agent(document, agent_results, llm_large, on_event)
            for c in corrections:
                db_corr = Correction(
                    id=gen_uuid(),
                    analysis_id=analysis_id,
                    section=c.get("section", ""),
                    original_text=c.get("original", ""),
                    suggested_text=c.get("suggested", ""),
                    reason=c.get("reason", ""),
                    severity=c.get("severity", "advice"),
                )
                db.add(db_corr)

            # Mark as completed (with warning if some agents failed)
            analysis.status = "completed"
            analysis.total_score = score_info["total_score"]
            analysis.completed_at = datetime.now(timezone.utc)
            not_ready_reasons = []
            if failed_count > 0:
                not_ready_reasons.append(f"{failed_count} агент(ов) завершились с ошибкой")
            if score_info["not_ready"]:
                not_ready_reasons.append(", ".join(score_info["blocked_categories"]))
            if not_ready_reasons:
                analysis.not_ready = "; ".join(not_ready_reasons)
            await db.commit()

        except Exception as e:
            logger.exception("Analysis %s failed: %s", analysis_id, e)
            analysis.status = "failed"
            await db.commit()
            await manager.broadcast_error(analysis_id, str(e))


@router.post("/api/analyze", response_model=AnalyzeStartResponse)
async def start_analysis(
    background_tasks: BackgroundTasks,
    file: UploadFile | None = File(None),
    text: str | None = Form(None),
    mode: str = Form("full"),
):
    if not file and not text:
        raise HTTPException(status_code=400, detail="Provide either a file or text")

    analysis_id = gen_uuid()
    filename = None
    file_type = None
    document = None

    if file:
        filename = file.filename
        file_type = os.path.splitext(filename or "")[1].lstrip(".")
        filepath = os.path.join(settings.upload_dir, f"{analysis_id}.{file_type}")
        content = await file.read()

        if len(content) > settings.max_file_size_mb * 1024 * 1024:
            raise HTTPException(status_code=413, detail=f"File too large (max {settings.max_file_size_mb} MB)")

        with open(filepath, "wb") as f:
            f.write(content)
        document = parse_document(filepath)
    else:
        document = parse_text_input(text)
        file_type = "txt"

    # Save to DB
    async with async_session() as db:
        analysis = Analysis(
            id=analysis_id,
            filename=filename,
            file_type=file_type,
            status="pending",
            document_text=document.full_text[:50000],
            mode=mode,
        )
        db.add(analysis)
        await db.commit()

    background_tasks.add_task(_run_analysis_task, analysis_id, document, mode)

    return AnalyzeStartResponse(analysis_id=analysis_id, status="pending")


@router.post("/api/analysis/{analysis_id}/cancel")
async def cancel_analysis(analysis_id: str):
    """Cancel a running or pending analysis."""
    async with async_session() as db:
        result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
        analysis = result.scalar_one_or_none()
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")

        if analysis.status in ("completed", "failed", "cancelled"):
            raise HTTPException(
                status_code=400,
                detail=f"Analysis already {analysis.status}, cannot cancel",
            )

    _cancelled_analyses.add(analysis_id)
    return {"status": "cancelled"}
