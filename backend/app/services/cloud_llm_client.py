"""Cloud LLM client — поддерживает Anthropic и OpenAI API.

Используется когда settings.use_cloud_llm == True.
Реализует тот же интерфейс что и LLMClient:
  - complete(system_prompt, user_prompt) -> str
  - stream(system_prompt, user_prompt) -> AsyncGenerator[str, None]
"""
import asyncio
import logging
from collections.abc import AsyncGenerator

from app.config import settings

logger = logging.getLogger(__name__)


class CloudLLMClient:
    """Unified cloud LLM client для Anthropic и OpenAI."""

    def __init__(self):
        self.provider = settings.cloud_provider.lower()
        self.api_key = settings.cloud_api_key
        self.model = settings.cloud_model or self._default_model()

    def _default_model(self) -> str:
        if self.provider == "anthropic":
            return "claude-sonnet-4-6"
        if self.provider == "openai":
            return "gpt-4o-mini"
        return ""

    # ── Anthropic ─────────────────────────────────────────────────────────────

    async def _anthropic_complete(self, system_prompt: str, user_prompt: str) -> str:
        try:
            import anthropic
        except ImportError:
            raise RuntimeError("Установите библиотеку: pip install anthropic")

        client = anthropic.AsyncAnthropic(api_key=self.api_key)
        message = await client.messages.create(
            model=self.model,
            max_tokens=4096,
            temperature=0.3,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return message.content[0].text if message.content else ""

    async def _anthropic_stream(self, system_prompt: str, user_prompt: str) -> AsyncGenerator[str, None]:
        try:
            import anthropic
        except ImportError:
            raise RuntimeError("Установите библиотеку: pip install anthropic")

        client = anthropic.AsyncAnthropic(api_key=self.api_key)
        full = []
        async with client.messages.stream(
            model=self.model,
            max_tokens=4096,
            temperature=0.3,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        ) as stream:
            async for text in stream.text_stream:
                full.append(text)
                yield text

        # Cache store (best-effort)
        full_text = "".join(full)
        if settings.llm_cache_enabled and full_text:
            try:
                from app.services import llm_cache
                await llm_cache.store_cached(f"cloud:{self.model}", system_prompt, user_prompt, full_text)
            except Exception as e:
                logger.debug("Cloud LLM cache store failed: %s", e)

    # ── OpenAI ────────────────────────────────────────────────────────────────

    async def _openai_complete(self, system_prompt: str, user_prompt: str) -> str:
        try:
            import openai as oai
        except ImportError:
            raise RuntimeError("Установите библиотеку: pip install openai")

        client = oai.AsyncOpenAI(api_key=self.api_key)
        response = await client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=4096,
        )
        return response.choices[0].message.content or ""

    async def _openai_stream(self, system_prompt: str, user_prompt: str) -> AsyncGenerator[str, None]:
        try:
            import openai as oai
        except ImportError:
            raise RuntimeError("Установите библиотеку: pip install openai")

        client = oai.AsyncOpenAI(api_key=self.api_key)
        full = []
        response = await client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=4096,
            stream=True,
        )
        async for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta:
                full.append(delta)
                yield delta

        full_text = "".join(full)
        if settings.llm_cache_enabled and full_text:
            try:
                from app.services import llm_cache
                await llm_cache.store_cached(f"cloud:{self.model}", system_prompt, user_prompt, full_text)
            except Exception as e:
                logger.debug("Cloud LLM cache store failed: %s", e)

    # ── Public interface ──────────────────────────────────────────────────────

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        # Check cache
        if settings.llm_cache_enabled:
            try:
                from app.services import llm_cache
                cached = await llm_cache.get_cached(f"cloud:{self.model}", system_prompt, user_prompt)
                if cached is not None:
                    logger.debug("Cloud LLM cache hit for model=%s", self.model)
                    return cached
            except Exception as e:
                logger.debug("Cloud LLM cache lookup failed: %s", e)

        if self.provider == "anthropic":
            result = await self._anthropic_complete(system_prompt, user_prompt)
        elif self.provider == "openai":
            result = await self._openai_complete(system_prompt, user_prompt)
        else:
            raise ValueError(f"Неизвестный cloud провайдер: {self.provider!r}. Используйте 'anthropic' или 'openai'.")

        if settings.llm_cache_enabled and result:
            try:
                from app.services import llm_cache
                await llm_cache.store_cached(f"cloud:{self.model}", system_prompt, user_prompt, result)
            except Exception as e:
                logger.debug("Cloud LLM cache store failed: %s", e)

        return result

    async def stream(self, system_prompt: str, user_prompt: str) -> AsyncGenerator[str, None]:
        # Check cache — если есть, отдать одним куском
        if settings.llm_cache_enabled:
            try:
                from app.services import llm_cache
                cached = await llm_cache.get_cached(f"cloud:{self.model}", system_prompt, user_prompt)
                if cached is not None:
                    logger.debug("Cloud LLM cache hit (stream) for model=%s", self.model)
                    yield cached
                    return
            except Exception as e:
                logger.debug("Cloud LLM cache lookup failed: %s", e)

        if self.provider == "anthropic":
            async for token in self._anthropic_stream(system_prompt, user_prompt):
                yield token
        elif self.provider == "openai":
            async for token in self._openai_stream(system_prompt, user_prompt):
                yield token
        else:
            raise ValueError(f"Неизвестный cloud провайдер: {self.provider!r}")
