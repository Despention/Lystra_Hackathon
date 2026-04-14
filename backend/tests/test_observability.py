"""Tests for observability features: request IDs and metrics endpoint."""
import pytest

from app.services import metrics as metrics_mod


class TestMetricsModule:
    def setup_method(self):
        # Reset state so tests don't see counters from other tests
        metrics_mod._counters.clear()
        metrics_mod._hist.clear()

    def test_counter_increments(self):
        metrics_mod.incr("test_counter")
        metrics_mod.incr("test_counter")
        metrics_mod.incr("test_counter", amount=2.5)
        rendered = metrics_mod.render()
        assert "test_counter 4.5" in rendered

    def test_counter_with_labels(self):
        metrics_mod.incr("test_labeled", {"agent": "structural"})
        metrics_mod.incr("test_labeled", {"agent": "structural"})
        metrics_mod.incr("test_labeled", {"agent": "logical"})
        rendered = metrics_mod.render()
        assert 'test_labeled{agent="structural"} 2' in rendered
        assert 'test_labeled{agent="logical"} 1' in rendered

    def test_histogram_sum_and_count(self):
        metrics_mod.observe("test_duration", 0.5, {"agent": "x"})
        metrics_mod.observe("test_duration", 1.5, {"agent": "x"})
        rendered = metrics_mod.render()
        assert 'test_duration_count{agent="x"} 2' in rendered
        assert 'test_duration_sum{agent="x"} 2.0' in rendered

    def test_label_values_escaped(self):
        metrics_mod.incr("esc", {"k": 'has"quote'})
        rendered = metrics_mod.render()
        assert 'k="has\\"quote"' in rendered

    def test_render_includes_help(self):
        rendered = metrics_mod.render()
        # Pre-declared counters have HELP lines, even if counter value is 0
        assert "# HELP lystra_analyses_total" in rendered or "# HELP" in rendered


class TestMetricsEndpoint:
    async def test_metrics_returns_prometheus_text(self, async_client):
        response = await async_client.get("/api/metrics")
        assert response.status_code == 200
        assert "text/plain" in response.headers["content-type"]
        body = response.text
        # Pre-declared counters should have their HELP lines
        assert "lystra_analyses_total" in body or "# HELP" in body


class TestRequestID:
    async def test_response_has_request_id_header(self, async_client):
        response = await async_client.get("/api/history")
        assert response.status_code == 200
        assert "x-request-id" in response.headers
        rid = response.headers["x-request-id"]
        assert len(rid) >= 8

    async def test_client_provided_id_echoed_back(self, async_client):
        response = await async_client.get(
            "/api/history",
            headers={"X-Request-ID": "client-trace-42"},
        )
        assert response.headers["x-request-id"] == "client-trace-42"

    async def test_each_request_gets_unique_id(self, async_client):
        r1 = await async_client.get("/api/history")
        r2 = await async_client.get("/api/history")
        assert r1.headers["x-request-id"] != r2.headers["x-request-id"]


class TestStructuredErrors:
    async def test_not_found_has_structured_shape(self, async_client):
        response = await async_client.get("/api/analysis/no-such-id")
        assert response.status_code == 404
        body = response.json()
        assert body["code"] == "not_found"
        assert "message" in body
        # "Analysis not found" preserves the original detail
        assert "not found" in body["message"].lower()
