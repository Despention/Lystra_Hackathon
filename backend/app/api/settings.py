"""API endpoint для чтения и изменения LLM настроек на лету.

GET  /api/settings  — возвращает текущие настройки (без раскрытия API ключа)
POST /api/settings  — обновляет настройки в памяти (без перезапуска сервера)
"""
import logging

from fastapi import APIRouter

from app.config import settings
from app.schemas import LLMSettingsResponse, LLMSettingsUpdateRequest

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/api/settings", response_model=LLMSettingsResponse)
async def get_settings():
    return LLMSettingsResponse(
        use_mock_llm=settings.use_mock_llm,
        use_cloud_llm=settings.use_cloud_llm,
        cloud_provider=settings.cloud_provider,
        cloud_model=settings.cloud_model,
        cloud_api_key_set=bool(settings.cloud_api_key),
        llama_cpp_base_url=settings.llama_cpp_base_url,
        llama_cpp_model_large=settings.llama_cpp_model_large,
        llm_max_context_chars=settings.llm_max_context_chars,
    )


@router.post("/api/settings", response_model=LLMSettingsResponse)
async def update_settings(req: LLMSettingsUpdateRequest):
    """Обновляет настройки LLM без перезапуска сервера.

    Изменения хранятся в памяти до следующего рестарта.
    Для постоянного сохранения — обновите файл .env вручную.
    """
    if req.use_mock_llm is not None:
        settings.use_mock_llm = req.use_mock_llm

    if req.use_cloud_llm is not None:
        settings.use_cloud_llm = req.use_cloud_llm

    if req.cloud_provider is not None:
        settings.cloud_provider = req.cloud_provider

    if req.cloud_api_key is not None:
        settings.cloud_api_key = req.cloud_api_key
        # Автоматически включаем cloud если задан ключ и провайдер
        if req.cloud_api_key and settings.cloud_provider != "none":
            settings.use_cloud_llm = True
            settings.use_mock_llm = False

    if req.cloud_model is not None:
        settings.cloud_model = req.cloud_model

    if req.llama_cpp_base_url is not None:
        settings.llama_cpp_base_url = req.llama_cpp_base_url

    if req.llama_cpp_model_large is not None:
        settings.llama_cpp_model_large = req.llama_cpp_model_large

    if req.llm_max_context_chars is not None:
        settings.llm_max_context_chars = req.llm_max_context_chars

    logger.info(
        "LLM settings updated: mock=%s cloud=%s provider=%s model=%s",
        settings.use_mock_llm,
        settings.use_cloud_llm,
        settings.cloud_provider,
        settings.cloud_model or settings.llama_cpp_model_large,
    )

    return LLMSettingsResponse(
        use_mock_llm=settings.use_mock_llm,
        use_cloud_llm=settings.use_cloud_llm,
        cloud_provider=settings.cloud_provider,
        cloud_model=settings.cloud_model,
        cloud_api_key_set=bool(settings.cloud_api_key),
        llama_cpp_base_url=settings.llama_cpp_base_url,
        llama_cpp_model_large=settings.llama_cpp_model_large,
        llm_max_context_chars=settings.llm_max_context_chars,
    )
