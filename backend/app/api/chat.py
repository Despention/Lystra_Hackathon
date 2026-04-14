import logging

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.analyze import get_llm_clients
from app.database import Analysis, Issue, async_session
from app.knowledge.prompts import CHAT_SYSTEM_PROMPT
from app.schemas import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """AI assistant chat about a specific analysis."""
    async with async_session() as db:
        result = await db.execute(
            select(Analysis)
            .options(selectinload(Analysis.issues), selectinload(Analysis.agent_results))
            .where(Analysis.id == request.analysis_id)
        )
        analysis = result.scalar_one_or_none()
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")

    # Build context from analysis
    score = analysis.total_score or 0
    summary = analysis.summary or "Краткое резюме недоступно."

    top_issues = sorted(analysis.issues, key=lambda i: (
        {"critical": 0, "serious": 1, "warning": 2, "advice": 3}.get(i.severity, 4)
    ))[:5]

    issues_text = "\n".join(
        f"- [{i.severity}] {i.title}: {i.description[:120]}"
        for i in top_issues
    ) or "Замечания не найдены."

    agent_scores = "\n".join(
        f"- {ar.agent_name}: {ar.score:.0f}/100"
        for ar in analysis.agent_results
        if ar.score is not None
    )

    context = (
        f"КОНТЕКСТ АНАЛИЗА ТЗ:\n"
        f"Файл: {analysis.filename or 'текст'}\n"
        f"Итоговый балл: {score:.0f}/100\n"
        f"Оценки агентов:\n{agent_scores}\n\n"
        f"Резюме: {summary}\n\n"
        f"Топ-5 проблем:\n{issues_text}\n"
    )

    # Build conversation history
    history_text = ""
    for msg in request.history[-6:]:  # last 6 messages max
        role = "Пользователь" if msg.get("role") == "user" else "Ассистент"
        history_text += f"{role}: {msg.get('content', '')}\n"

    user_prompt = f"{context}\n{history_text}\nВОПРОС ПОЛЬЗОВАТЕЛЯ: {request.message}"

    llm_large, _ = get_llm_clients()
    try:
        reply = await llm_large.complete(CHAT_SYSTEM_PROMPT, user_prompt)
        return ChatResponse(reply=reply)
    except Exception as e:
        logger.error("Chat LLM error: %s", e)
        raise HTTPException(status_code=500, detail=f"LLM error: {e}")
