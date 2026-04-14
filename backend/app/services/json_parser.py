"""Robust JSON parsing for LLM responses.

The 4B model often returns:
- JSON wrapped in markdown code fences (```json ... ```)
- JSON with trailing commas
- JSON with single quotes instead of double
- JSON preceded/followed by explanatory text
- Truncated JSON when hitting max_tokens

parse_json_from_llm tries progressively looser strategies and returns
None (not {}) if nothing works, so callers can distinguish "empty" from "broken".
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

_VALID_SEVERITIES = {"critical", "serious", "warning", "advice"}

# Matches ```json ... ``` or ``` ... ``` fences
_FENCE_RE = re.compile(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", re.IGNORECASE)
# Trailing comma before } or ]
_TRAILING_COMMA_RE = re.compile(r",(\s*[}\]])")


def _try_loads(s: str) -> dict | None:
    try:
        result = json.loads(s)
        return result if isinstance(result, dict) else None
    except (json.JSONDecodeError, ValueError):
        return None


def _normalize(s: str) -> str:
    """Light normalization: strip trailing commas."""
    return _TRAILING_COMMA_RE.sub(r"\1", s)


def _extract_balanced(s: str, start: int) -> str | None:
    """Given string and index of '{', return the substring of the balanced block,
    or None if no balanced closer found. Respects strings and escapes."""
    depth = 0
    i = start
    in_string = False
    escape = False
    while i < len(s):
        ch = s[i]
        if escape:
            escape = False
        elif ch == "\\" and in_string:
            escape = True
        elif ch == '"':
            in_string = not in_string
        elif not in_string:
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return s[start:i + 1]
        i += 1
    return None


def parse_json_from_llm(raw: str) -> dict | None:
    """Parse a dict from an LLM response using progressively looser strategies.

    Returns None if no valid JSON object can be extracted.
    """
    if not raw or not raw.strip():
        return None

    # Strategy 1: markdown code fence
    fence_match = _FENCE_RE.search(raw)
    if fence_match:
        candidate = fence_match.group(1)
        result = _try_loads(candidate) or _try_loads(_normalize(candidate))
        if result is not None:
            return result

    # Strategy 2: first { to last } (outer slice)
    first = raw.find("{")
    last = raw.rfind("}")
    if first != -1 and last > first:
        candidate = raw[first:last + 1]
        result = _try_loads(candidate) or _try_loads(_normalize(candidate))
        if result is not None:
            return result

    # Strategy 3: walk { positions, try balanced extraction for each
    # This handles cases where there are multiple {...} blocks or explanatory
    # prose mixed in.
    i = 0
    while True:
        idx = raw.find("{", i)
        if idx == -1:
            break
        block = _extract_balanced(raw, idx)
        if block is not None:
            result = _try_loads(block) or _try_loads(_normalize(block))
            if result is not None and _looks_like_agent_output(result):
                return result
        i = idx + 1

    # Strategy 4: single-quote fallback — only if no double quotes present at all
    # (rare but happens with badly-tuned small models)
    if '"' not in raw and "'" in raw:
        repaired = raw.replace("'", '"')
        first = repaired.find("{")
        last = repaired.rfind("}")
        if first != -1 and last > first:
            result = _try_loads(_normalize(repaired[first:last + 1]))
            if result is not None:
                return result

    logger.debug("parse_json_from_llm: all strategies failed, raw[:200]=%r", raw[:200])
    return None


def _looks_like_agent_output(data: dict) -> bool:
    """Heuristic: does this dict look like an agent response?"""
    return (
        "score" in data
        or "issues" in data
        or "corrections" in data
    )


def validate_agent_output(data: dict) -> list[str]:
    """Validate that a parsed agent response has the expected shape.

    Returns a list of error strings (empty = valid).
    Callers may treat >3 errors as "response is garbage".
    """
    errors: list[str] = []

    # score: number in [0, 100] — only required for scoring agents
    if "score" in data:
        score = data.get("score")
        if not isinstance(score, (int, float)):
            errors.append(f"score is not a number: {type(score).__name__}")
        elif not (0 <= float(score) <= 100):
            errors.append(f"score out of range [0,100]: {score}")

    # issues: list (if present)
    if "issues" in data:
        issues = data.get("issues")
        if not isinstance(issues, list):
            errors.append(f"issues is not a list: {type(issues).__name__}")
        else:
            for idx, item in enumerate(issues):
                if not isinstance(item, dict):
                    errors.append(f"issues[{idx}] is not an object")
                    continue
                sev = item.get("severity")
                if sev is not None and sev not in _VALID_SEVERITIES:
                    errors.append(f"issues[{idx}].severity invalid: {sev!r}")
                penalty = item.get("penalty", 0)
                if penalty is not None and not isinstance(penalty, (int, float)):
                    try:
                        float(penalty)
                    except (TypeError, ValueError):
                        errors.append(f"issues[{idx}].penalty not numeric: {penalty!r}")

    # corrections: list (if present)
    if "corrections" in data:
        corr = data.get("corrections")
        if not isinstance(corr, list):
            errors.append(f"corrections is not a list: {type(corr).__name__}")

    return errors


__all__ = ["parse_json_from_llm", "validate_agent_output"]
