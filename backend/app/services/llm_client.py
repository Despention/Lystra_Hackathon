import asyncio
import logging
from collections.abc import AsyncGenerator

import openai

from app.config import settings

logger = logging.getLogger(__name__)


class ContextOverflowError(Exception):
    """Raised when LLM responds that input exceeds the model's context window.

    Callers (orchestrator) catch this to trigger section-based fallback
    rather than retrying with the same oversized input.
    """

    def __init__(self, message: str, tokens_used: int | None = None):
        super().__init__(message)
        self.tokens_used = tokens_used


_RETRYABLE_EXCEPTIONS = (
    openai.APIConnectionError,
    openai.APITimeoutError,
    openai.RateLimitError,
    asyncio.TimeoutError,
)


def _is_context_overflow(err: Exception) -> bool:
    """Detect if the error is a context-window overflow from llama-server or OpenAI."""
    msg = str(err).lower()
    if "context size has been exceeded" in msg:
        return True
    if "context_length_exceeded" in msg:
        return True
    if "maximum context length" in msg:
        return True
    # BadRequestError with explicit code
    if isinstance(err, openai.BadRequestError):
        body = getattr(err, "body", None) or {}
        if isinstance(body, dict):
            code = (body.get("error") or {}).get("code") if isinstance(body.get("error"), dict) else body.get("code")
            if code == "context_length_exceeded":
                return True
    return False


class LLMClient:
    def __init__(self, base_url: str, model: str):
        self.client = openai.AsyncOpenAI(
            base_url=base_url,
            api_key="sk-no-key-required",
            timeout=settings.llm_timeout_seconds,
        )
        self.model = model

    async def _call_with_retry(self, coro_factory, stream: bool = False):
        """Call an openai coroutine factory with exponential backoff.

        coro_factory is a zero-arg callable returning a fresh coroutine each attempt.
        Raises ContextOverflowError on context overflow (no retry).
        """
        max_retries = settings.llm_max_retries
        base_delay = settings.llm_retry_backoff
        last_err: Exception | None = None

        for attempt in range(1, max_retries + 1):
            try:
                return await coro_factory()
            except Exception as err:
                if _is_context_overflow(err):
                    logger.info("LLM context overflow detected: %s", err)
                    raise ContextOverflowError(str(err)) from err

                if not isinstance(err, _RETRYABLE_EXCEPTIONS):
                    # Non-retryable — re-raise immediately
                    raise

                last_err = err
                if attempt >= max_retries:
                    logger.error("LLM retry exhausted after %d attempts: %s", attempt, err)
                    raise
                delay = base_delay * (2 ** (attempt - 1))
                logger.warning(
                    "LLM retry %d/%d after %.1fs: %s",
                    attempt, max_retries, delay, err,
                )
                await asyncio.sleep(delay)

        # Should be unreachable, but keep type-checker happy
        if last_err:
            raise last_err
        raise RuntimeError("LLM retry loop exited unexpectedly")

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        # Check cache first
        if settings.llm_cache_enabled:
            try:
                from app.services import llm_cache
                cached = await llm_cache.get_cached(self.model, system_prompt, user_prompt)
                if cached is not None:
                    logger.debug("LLM cache hit for model=%s", self.model)
                    return cached
            except Exception as e:
                logger.debug("LLM cache lookup failed (non-fatal): %s", e)

        async def _do():
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_tokens=4096,
            )
            return response.choices[0].message.content or ""

        result = await self._call_with_retry(_do)

        # Store in cache (best-effort)
        if settings.llm_cache_enabled and result:
            try:
                from app.services import llm_cache
                await llm_cache.store_cached(self.model, system_prompt, user_prompt, result)
            except Exception as e:
                logger.debug("LLM cache store failed (non-fatal): %s", e)

        return result

    async def stream(self, system_prompt: str, user_prompt: str) -> AsyncGenerator[str, None]:
        # Check cache — if hit, yield it as a single chunk (callers see one token burst,
        # which is fine for our use case since we accumulate anyway).
        if settings.llm_cache_enabled:
            try:
                from app.services import llm_cache
                cached = await llm_cache.get_cached(self.model, system_prompt, user_prompt)
                if cached is not None:
                    logger.debug("LLM cache hit (stream) for model=%s", self.model)
                    yield cached
                    return
            except Exception as e:
                logger.debug("LLM cache lookup failed (non-fatal): %s", e)

        # For streaming we open the stream with retry on connection/timeout errors
        # but once streaming has started we cannot retry mid-stream.
        async def _open_stream():
            return await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_tokens=4096,
                stream=True,
            )

        response = await self._call_with_retry(_open_stream, stream=True)
        full = []
        try:
            async for chunk in response:
                delta = chunk.choices[0].delta.content
                if delta:
                    full.append(delta)
                    yield delta
        except Exception as err:
            if _is_context_overflow(err):
                raise ContextOverflowError(str(err)) from err
            raise

        # Store full response in cache
        full_text = "".join(full)
        if settings.llm_cache_enabled and full_text:
            try:
                from app.services import llm_cache
                await llm_cache.store_cached(self.model, system_prompt, user_prompt, full_text)
            except Exception as e:
                logger.debug("LLM cache store failed (non-fatal): %s", e)
