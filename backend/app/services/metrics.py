"""Simple in-process counters + a Prometheus-style text endpoint.

Deliberately minimal — no `prometheus-client` dependency. Counters live in
memory and reset on restart; fine for local-first desktop use where the
operator opens `/api/metrics` in a browser to check health.
"""
from __future__ import annotations

import threading
from collections import defaultdict
from typing import Any

_lock = threading.Lock()

# counters: name -> labels (frozenset of (k,v) tuples) -> value
_counters: dict[str, dict[frozenset, float]] = defaultdict(lambda: defaultdict(float))
# histograms: name -> list of observed values (simplistic — we only emit count+sum)
_hist: dict[str, dict[frozenset, tuple[int, float]]] = defaultdict(
    lambda: defaultdict(lambda: (0, 0.0))
)

# Descriptions for the /metrics rendering. Not strictly required but nice.
_help: dict[str, str] = {}


def _labels_key(labels: dict[str, str] | None) -> frozenset:
    if not labels:
        return frozenset()
    return frozenset(labels.items())


def incr(name: str, labels: dict[str, str] | None = None, amount: float = 1.0) -> None:
    key = _labels_key(labels)
    with _lock:
        _counters[name][key] += amount


def observe(name: str, value: float, labels: dict[str, str] | None = None) -> None:
    key = _labels_key(labels)
    with _lock:
        count, total = _hist[name][key]
        _hist[name][key] = (count + 1, total + value)


def describe(name: str, text: str) -> None:
    _help[name] = text


def render() -> str:
    """Return Prometheus text-format snapshot of all counters/histograms.

    Emits HELP/TYPE lines for every pre-declared metric so `/metrics` is
    never completely empty on a fresh server.
    """
    lines: list[str] = []
    with _lock:
        # Declared metric names (from `describe`) — guarantees HELP even with 0 samples
        seen: set[str] = set()

        for name, by_labels in sorted(_counters.items()):
            seen.add(name)
            if name in _help:
                lines.append(f"# HELP {name} {_help[name]}")
            lines.append(f"# TYPE {name} counter")
            for labels, value in by_labels.items():
                lines.append(f"{name}{_fmt_labels(labels)} {value}")

        for name, by_labels in sorted(_hist.items()):
            seen.add(name)
            if name in _help:
                lines.append(f"# HELP {name} {_help[name]}")
            lines.append(f"# TYPE {name} summary")
            for labels, (count, total) in by_labels.items():
                lines.append(f"{name}_count{_fmt_labels(labels)} {count}")
                lines.append(f"{name}_sum{_fmt_labels(labels)} {total}")

        # Emit stubs for declared-but-unseen metrics
        for name, help_text in sorted(_help.items()):
            if name in seen:
                continue
            lines.append(f"# HELP {name} {help_text}")
            # Treat as counter by default; caller can always override via describe
            lines.append(f"# TYPE {name} counter")

    return "\n".join(lines) + "\n"


def _fmt_labels(labels: frozenset) -> str:
    if not labels:
        return ""
    pairs = sorted(labels)
    return "{" + ",".join(f'{k}="{_escape(v)}"' for k, v in pairs) + "}"


def _escape(v: Any) -> str:
    s = str(v)
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


# Pre-declare counters so a fresh /metrics isn't empty while nothing
# has happened yet.
describe("lystra_analyses_total", "Total analyses by final status")
describe("lystra_agent_duration_seconds", "Agent run duration in seconds")
describe("lystra_agent_errors_total", "Agent failures grouped by agent name")
describe("lystra_llm_cache_hits_total", "Number of LLM cache hits")
describe("lystra_llm_cache_misses_total", "Number of LLM cache misses")
describe("lystra_llm_retries_total", "Number of LLM retries")


__all__ = ["incr", "observe", "describe", "render"]
