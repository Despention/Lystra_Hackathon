from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse, StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

import io

from app.database import Analysis, Issue, async_session
from app.services.export_xlsx import export_history, export_single_analysis

router = APIRouter()

REPORT_TEMPLATE = """\
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>TZ Analyzer — Отчёт</title>
<style>
  body {{ font-family: 'Inter', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #111827; background: #fff; }}
  h1 {{ color: #2563EB; font-size: 24px; border-bottom: 2px solid #2563EB; padding-bottom: 8px; }}
  h2 {{ color: #374151; font-size: 18px; margin-top: 32px; }}
  .score-box {{ background: {score_bg}; color: #fff; font-size: 48px; font-weight: bold; text-align: center; padding: 24px; border-radius: 12px; margin: 20px 0; }}
  .score-label {{ font-size: 14px; font-weight: normal; }}
  .not-ready {{ background: #FEE2E2; color: #EF4444; padding: 12px; border-radius: 8px; text-align: center; margin: 12px 0; font-weight: 600; }}
  .category {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E5E7EB; }}
  .category-name {{ font-weight: 500; }}
  .category-score {{ font-weight: 600; }}
  .issue {{ border-left: 4px solid {issue_color}; padding: 12px 16px; margin: 12px 0; background: #F9FAFB; border-radius: 0 8px 8px 0; }}
  .issue-title {{ font-weight: 600; margin-bottom: 4px; }}
  .severity {{ display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; color: #fff; }}
  .severity-critical {{ background: #EF4444; }}
  .severity-serious {{ background: #F97316; }}
  .severity-warning {{ background: #F59E0B; }}
  .severity-advice {{ background: #6B7280; }}
  .quote {{ font-style: italic; color: #6B7280; margin: 8px 0; padding: 8px; background: #F3F4F6; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 13px; }}
  .recommendation {{ color: #059669; margin-top: 8px; }}
  .standard-ref {{ color: #2563EB; font-size: 13px; }}
  .footer {{ margin-top: 40px; padding-top: 16px; border-top: 1px solid #E5E7EB; color: #9CA3AF; font-size: 12px; text-align: center; }}
</style>
</head>
<body>
<h1>TZ Analyzer — Отчёт об анализе</h1>
<p><strong>Файл:</strong> {filename}</p>
<p><strong>Режим:</strong> {mode}</p>
<p><strong>Дата:</strong> {date}</p>

<div class="score-box">
  {total_score}<br>
  <span class="score-label">из 100 баллов</span>
</div>

{not_ready_html}

<h2>Оценки по категориям</h2>
{categories_html}

<h2>Замечания ({issues_count})</h2>
{issues_html}

<div class="footer">
  Сгенерировано TZ Analyzer MVP v0.1.0
</div>
</body>
</html>
"""

SEVERITY_COLORS = {
    "critical": "#EF4444",
    "serious": "#F97316",
    "warning": "#F59E0B",
    "advice": "#6B7280",
}

SEVERITY_LABELS = {
    "critical": "Критично",
    "serious": "Серьёзно",
    "warning": "Замечание",
    "advice": "Совет",
}

AGENT_LABELS = {
    "structural": "Структура",
    "terminological": "Терминология",
    "logical": "Логика",
    "completeness": "Полнота",
    "scientific": "Научность",
}


@router.get("/api/export/{analysis_id}/pdf")
async def export_report(analysis_id: str):
    async with async_session() as db:
        result = await db.execute(
            select(Analysis)
            .options(selectinload(Analysis.agent_results), selectinload(Analysis.issues))
            .where(Analysis.id == analysis_id)
        )
        analysis = result.scalar_one_or_none()
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")

        score = analysis.total_score or 0
        score_bg = "#10B981" if score >= 70 else "#F59E0B" if score >= 40 else "#EF4444"

        not_ready_html = ""
        if analysis.not_ready:
            not_ready_html = '<div class="not-ready">⚠ Документ не готов к утверждению</div>'

        # Categories
        categories_html = ""
        for ar in analysis.agent_results:
            label = AGENT_LABELS.get(ar.agent_name, ar.agent_name)
            s = ar.score or 0
            color = "#10B981" if s >= 70 else "#F59E0B" if s >= 40 else "#EF4444"
            categories_html += f'<div class="category"><span class="category-name">{label}</span><span class="category-score" style="color:{color}">{s:.0f}/100</span></div>\n'

        # Issues
        issues_html = ""
        sorted_issues = sorted(analysis.issues, key=lambda i: (
            {"critical": 0, "serious": 1, "warning": 2, "advice": 3}.get(i.severity, 4)
        ))
        for issue in sorted_issues:
            color = SEVERITY_COLORS.get(issue.severity, "#6B7280")
            label = SEVERITY_LABELS.get(issue.severity, issue.severity)
            quote_html = f'<div class="quote">{issue.document_quote}</div>' if issue.document_quote else ""
            ref_html = f'<div class="standard-ref">{issue.standard_reference}</div>' if issue.standard_reference else ""
            issues_html += f"""
<div class="issue" style="border-left-color: {color}">
  <span class="severity severity-{issue.severity}">{label}</span>
  <div class="issue-title">{issue.title}</div>
  <div>{issue.description}</div>
  {quote_html}
  {ref_html}
  <div class="recommendation">💡 {issue.recommendation}</div>
</div>
"""

        html = REPORT_TEMPLATE.format(
            filename=analysis.filename or "Текст",
            mode="Полный" if analysis.mode == "full" else "Быстрый",
            date=analysis.created_at.strftime("%d.%m.%Y %H:%M") if analysis.created_at else "",
            total_score=f"{score:.0f}",
            score_bg=score_bg,
            not_ready_html=not_ready_html,
            categories_html=categories_html,
            issues_count=len(sorted_issues),
            issues_html=issues_html,
            issue_color="#E5E7EB",
        )

        return HTMLResponse(content=html)


@router.get("/api/export/{analysis_id}/xlsx")
async def export_xlsx(analysis_id: str):
    async with async_session() as db:
        result = await db.execute(
            select(Analysis)
            .options(selectinload(Analysis.agent_results), selectinload(Analysis.issues))
            .where(Analysis.id == analysis_id)
        )
        analysis = result.scalar_one_or_none()
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")

        data = {
            "filename": analysis.filename,
            "created_at": analysis.created_at,
            "mode": analysis.mode,
            "total_score": analysis.total_score,
            "status": analysis.status,
            "summary": analysis.summary,
            "agent_results": [
                {
                    "agent_name": ar.agent_name,
                    "score": ar.score,
                    "weight": ar.weight,
                    "status": ar.status,
                }
                for ar in analysis.agent_results
            ],
            "issues": [
                {
                    "severity": issue.severity,
                    "title": issue.title,
                    "agent_name": issue.agent_name,
                    "description": issue.description,
                    "recommendation": issue.recommendation,
                    "penalty": issue.penalty,
                }
                for issue in sorted(analysis.issues, key=lambda i: (
                    {"critical": 0, "serious": 1, "warning": 2, "advice": 3}.get(i.severity, 4)
                ))
            ],
        }

        xlsx_bytes = export_single_analysis(data)
        filename = f"analysis_{analysis_id[:8]}.xlsx"

        return StreamingResponse(
            io.BytesIO(xlsx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )


@router.get("/api/export/history/xlsx")
async def export_history_xlsx(
    search: str | None = Query(None),
    folder_id: str | None = Query(None),
    min_score: float | None = Query(None, ge=0, le=100),
    max_score: float | None = Query(None, ge=0, le=100),
):
    async with async_session() as db:
        query = select(Analysis)

        if search:
            query = query.where(Analysis.filename.ilike(f"%{search}%"))
        if folder_id:
            query = query.where(Analysis.folder_id == folder_id)
        if min_score is not None:
            query = query.where(Analysis.total_score >= min_score)
        if max_score is not None:
            query = query.where(Analysis.total_score <= max_score)

        query = query.order_by(Analysis.created_at.desc())
        result = await db.execute(query)
        analyses = result.scalars().all()

        items = []
        for a in analyses:
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

            items.append({
                "filename": a.filename,
                "created_at": a.created_at,
                "mode": a.mode,
                "total_score": a.total_score,
                "issues_count": issues_count,
                "critical_count": critical_count,
                "status": a.status,
            })

        xlsx_bytes = export_history(items)

        return StreamingResponse(
            io.BytesIO(xlsx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="history.xlsx"'},
        )
