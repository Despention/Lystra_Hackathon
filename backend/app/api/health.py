import logging

from fastapi import APIRouter

from app.config import settings
from app.schemas import HealthResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/health", response_model=HealthResponse)
async def health_check():
    if settings.use_mock_llm:
        return HealthResponse(
            status="ok",
            llm_available=True,
            llm_model="mock",
            llm_url=None,
            use_mock=True,
            database="ok",
            version="0.1.0",
        )

    # Try to reach the actual llama.cpp server
    llm_available = False
    model_name = settings.llama_cpp_model_large

    try:
        import httpx
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{settings.llama_cpp_base_url}/models")
            if resp.status_code == 200:
                llm_available = True
                data = resp.json()
                # llama.cpp returns {"data": [{"id": "model-name", ...}]}
                if data.get("data") and len(data["data"]) > 0:
                    model_name = data["data"][0].get("id", model_name)
    except Exception:
        logger.warning("LLM server unreachable at %s", settings.llama_cpp_base_url)

    return HealthResponse(
        status="ok",
        llm_available=llm_available,
        llm_model=model_name,
        llm_url=settings.llama_cpp_base_url,
        use_mock=False,
        database="ok",
        version="0.1.0",
    )
