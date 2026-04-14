import logging

from fastapi import APIRouter, HTTPException

from app.api.analyze import get_llm_clients
from app.knowledge.prompts import TZ_EXAMPLE_SYSTEM_PROMPT, TZ_STRUCTURE_SYSTEM_PROMPT
from app.schemas import (
    GenerateExampleRequest,
    GenerateExampleResponse,
    GenerateStructureRequest,
    GenerateStructureResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/generate/structure", response_model=GenerateStructureResponse)
async def generate_structure(request: GenerateStructureRequest):
    """Generate recommended TZ structure for a given topic."""
    user_prompt = (
        f"Тема/название проекта: {request.topic}\n"
        f"Краткое описание: {request.description or 'не указано'}\n\n"
        f"Сгенерируй рекомендуемую структуру технического задания для данного проекта."
    )
    llm_large, _ = get_llm_clients()
    try:
        structure = await llm_large.complete(TZ_STRUCTURE_SYSTEM_PROMPT, user_prompt)
        return GenerateStructureResponse(structure=structure)
    except Exception as e:
        logger.error("Generate structure error: %s", e)
        raise HTTPException(status_code=500, detail=f"LLM error: {e}")


@router.post("/api/generate/example", response_model=GenerateExampleResponse)
async def generate_example(request: GenerateExampleRequest):
    """Generate a full example TZ for a given topic."""
    user_prompt = (
        f"Тема/название проекта: {request.topic}\n\n"
        f"Сгенерируй полный пример технического задания по ГОСТ 34.602-89."
    )
    llm_large, _ = get_llm_clients()
    try:
        example = await llm_large.complete(TZ_EXAMPLE_SYSTEM_PROMPT, user_prompt)
        return GenerateExampleResponse(example_tz=example)
    except Exception as e:
        logger.error("Generate example error: %s", e)
        raise HTTPException(status_code=500, detail=f"LLM error: {e}")
