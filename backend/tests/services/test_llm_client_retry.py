"""Unit tests for LLMClient retry logic and ContextOverflowError detection."""
import asyncio
from unittest.mock import AsyncMock, patch

import openai
import pytest

from app.services.llm_client import (
    ContextOverflowError,
    LLMClient,
    _is_context_overflow,
)


class TestIsContextOverflow:
    def test_llama_server_phrasing(self):
        err = RuntimeError("Error: context size has been exceeded (6213 / 4096)")
        assert _is_context_overflow(err) is True

    def test_openai_error_code(self):
        err = RuntimeError("Request failed: context_length_exceeded")
        assert _is_context_overflow(err) is True

    def test_maximum_context_length(self):
        err = RuntimeError("This model's maximum context length is 4096 tokens")
        assert _is_context_overflow(err) is True

    def test_bad_request_with_explicit_code(self):
        # The string-based check already covers context_length_exceeded appearing
        # in the error message. Verify that path is exercised.
        err = RuntimeError(
            "400 Bad Request: {'error': {'code': 'context_length_exceeded'}}"
        )
        assert _is_context_overflow(err) is True

    def test_generic_error_not_overflow(self):
        assert _is_context_overflow(ConnectionError("network is down")) is False
        assert _is_context_overflow(TimeoutError("timeout")) is False


class TestCallWithRetry:
    @pytest.fixture
    def client(self):
        # Minimal client — we're only exercising _call_with_retry
        return LLMClient(base_url="http://mock/v1", model="mock-model")

    async def test_success_on_first_try(self, client):
        call_count = 0

        async def factory():
            nonlocal call_count
            call_count += 1
            return "ok"

        result = await client._call_with_retry(factory)
        assert result == "ok"
        assert call_count == 1

    async def test_retries_on_connection_error(self, client, monkeypatch):
        monkeypatch.setattr("app.services.llm_client.settings.llm_max_retries", 3)
        monkeypatch.setattr("app.services.llm_client.settings.llm_retry_backoff", 0.0)

        call_count = 0

        async def factory():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise openai.APIConnectionError(request=None)
            return "recovered"

        result = await client._call_with_retry(factory)
        assert result == "recovered"
        assert call_count == 3

    async def test_exhausts_retries_and_raises(self, client, monkeypatch):
        monkeypatch.setattr("app.services.llm_client.settings.llm_max_retries", 2)
        monkeypatch.setattr("app.services.llm_client.settings.llm_retry_backoff", 0.0)

        call_count = 0

        async def factory():
            nonlocal call_count
            call_count += 1
            raise openai.APITimeoutError(request=None)

        with pytest.raises(openai.APITimeoutError):
            await client._call_with_retry(factory)
        assert call_count == 2

    async def test_context_overflow_not_retried(self, client, monkeypatch):
        monkeypatch.setattr("app.services.llm_client.settings.llm_max_retries", 5)
        monkeypatch.setattr("app.services.llm_client.settings.llm_retry_backoff", 0.0)

        call_count = 0

        async def factory():
            nonlocal call_count
            call_count += 1
            raise RuntimeError("context size has been exceeded")

        with pytest.raises(ContextOverflowError):
            await client._call_with_retry(factory)
        # Must NOT retry — single call only
        assert call_count == 1

    async def test_non_retryable_error_raised_immediately(self, client, monkeypatch):
        monkeypatch.setattr("app.services.llm_client.settings.llm_max_retries", 3)
        monkeypatch.setattr("app.services.llm_client.settings.llm_retry_backoff", 0.0)

        call_count = 0

        async def factory():
            nonlocal call_count
            call_count += 1
            raise ValueError("programming error")

        with pytest.raises(ValueError):
            await client._call_with_retry(factory)
        assert call_count == 1  # not retried

    async def test_exponential_backoff_timing(self, client, monkeypatch):
        monkeypatch.setattr("app.services.llm_client.settings.llm_max_retries", 4)
        monkeypatch.setattr("app.services.llm_client.settings.llm_retry_backoff", 1.0)

        delays: list[float] = []

        async def fake_sleep(d):
            delays.append(d)

        monkeypatch.setattr("app.services.llm_client.asyncio.sleep", fake_sleep)

        async def factory():
            raise openai.APIConnectionError(request=None)

        with pytest.raises(openai.APIConnectionError):
            await client._call_with_retry(factory)

        # Delays: 1.0, 2.0, 4.0 (3 sleeps before 4th attempt; last attempt has no sleep)
        assert delays == [1.0, 2.0, 4.0]


class TestSemaphore:
    async def test_get_semaphore_cached_per_base_url(self, monkeypatch):
        import app.services.llm_client as client_mod
        monkeypatch.setattr(client_mod, "_semaphores", {})
        monkeypatch.setattr(client_mod.settings, "llm_max_concurrent", 2)

        sem1 = await client_mod._get_semaphore("http://a/v1")
        sem2 = await client_mod._get_semaphore("http://a/v1")
        sem3 = await client_mod._get_semaphore("http://b/v1")

        assert sem1 is sem2
        assert sem1 is not sem3

    async def test_semaphore_limits_concurrency(self, monkeypatch):
        import app.services.llm_client as client_mod
        monkeypatch.setattr(client_mod, "_semaphores", {})
        monkeypatch.setattr(client_mod.settings, "llm_max_concurrent", 2)

        sem = await client_mod._get_semaphore("http://test/v1")
        # With limit=2, the semaphore initial value is 2
        assert sem._value == 2
