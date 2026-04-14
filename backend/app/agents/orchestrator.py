import asyncio
import logging
from collections.abc import Callable
from datetime import datetime, timezone

from app.agents.base import AgentResult, BaseAgent
from app.agents.completeness import CompletenessAgent
from app.agents.correction import CorrectionAgent
from app.agents.logical import LogicalAgent
from app.agents.scientific import ScientificAgent
from app.agents.structural import StructuralAgent
from app.agents.terminological import TerminologicalAgent
from app.config import settings
from app.services.deduplication import deduplicate_issues
from app.services.document_parser import ParsedDocument, chunk_document_for_agent
from app.services.json_parser import parse_json_from_llm
from app.services.llm_client import ContextOverflowError
from app.services.scoring import WEIGHTS, calculate_score

logger = logging.getLogger(__name__)

ALL_AGENTS: list[BaseAgent] = [
    StructuralAgent(),
    TerminologicalAgent(),
    LogicalAgent(),
    CompletenessAgent(),
    ScientificAgent(),
]

QUICK_AGENTS = {"structural", "completeness"}


async def run_single_agent(
    agent: BaseAgent,
    document: ParsedDocument,
    llm,
    on_event: Callable | None = None,
) -> AgentResult:
    started = datetime.now(timezone.utc)

    if on_event:
        await on_event({
            "type": "agent_start",
            "agent": agent.name,
            "timestamp": started.isoformat(),
        })

    async def stream_callback(token: str):
        if on_event:
            await on_event({
                "type": "agent_stream",
                "agent": agent.name,
                "token": token,
            })

    timeout = settings.llm_timeout_seconds
    try:
        result = await asyncio.wait_for(
            agent.analyze(document, llm, stream_callback),
            timeout=timeout,
        )
    except ContextOverflowError as overflow_err:
        # Fall back to section-based analysis
        logger.warning(
            "Agent %s hit context overflow, retrying section-by-section",
            agent.name,
        )
        try:
            max_chunk_chars = max(1500, settings.llm_max_context_chars - 1500)
            sections = chunk_document_for_agent(document, max_chars=max_chunk_chars)
            result = await asyncio.wait_for(
                agent.analyze_sections(document, sections, llm, stream_callback),
                timeout=timeout * 3,  # section analysis takes longer (N sequential calls)
            )
        except Exception as e2:
            logger.error(
                "Agent %s section fallback also failed: %s (original: %s)",
                agent.name, e2, overflow_err,
            )
            result = AgentResult(
                agent_name=agent.name,
                score=0.0,
                error=f"Context overflow; section fallback failed: {e2}",
            )
    except asyncio.TimeoutError:
        logger.error("Agent %s timed out after %ds", agent.name, timeout)
        result = AgentResult(
            agent_name=agent.name,
            score=0.0,
            error=f"Timeout: agent did not complete within {timeout} seconds",
        )
    except Exception as e:
        logger.error("Agent %s raised exception: %s", agent.name, e)
        result = AgentResult(
            agent_name=agent.name,
            score=0.0,
            error=str(e),
        )

    completed = datetime.now(timezone.utc)
    duration_ms = int((completed - started).total_seconds() * 1000)

    if on_event:
        if result.error:
            # Send a dedicated agent_error event
            await on_event({
                "type": "agent_error",
                "agent": agent.name,
                "error": result.error,
                "duration_ms": duration_ms,
            })
        await on_event({
            "type": "agent_done",
            "agent": agent.name,
            "score": result.score,
            "issues_count": len(result.issues),
            "duration_ms": duration_ms,
            "error": result.error,
        })

    return result


async def run_analysis(
    document: ParsedDocument,
    llm_large,
    llm_small,
    mode: str = "full",
    on_event: Callable | None = None,
    cancel_check: Callable | None = None,
) -> tuple[list[AgentResult], dict]:
    agents = ALL_AGENTS if mode == "full" else [a for a in ALL_AGENTS if a.name in QUICK_AGENTS]

    agent_results: list[AgentResult] = []
    failed_agents: list[dict] = []

    # Run agents, checking for cancellation before each one
    tasks = []
    for agent in agents:
        if cancel_check and cancel_check():
            break
        llm = llm_large if agent.model_size == "large" else llm_small
        tasks.append(run_single_agent(agent, document, llm, on_event))

    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for r in results:
            if isinstance(r, Exception):
                logger.error("Agent task exception: %s", r)
                failed_agents.append({
                    "agent": "unknown",
                    "error": str(r),
                })
            else:
                agent_results.append(r)
                if r.error:
                    failed_agents.append({
                        "agent": r.agent_name,
                        "error": r.error,
                    })

    # Deduplicate issues across agents (same problem found by multiple agents).
    # deduplicate_issues returns a subset of the input list (by identity),
    # so we filter each agent's issues to keep only survivors.
    all_issues = [issue for ar in agent_results for issue in ar.issues]
    if all_issues:
        deduped = deduplicate_issues(all_issues)
        removed = len(all_issues) - len(deduped)
        if removed > 0:
            logger.info(
                "Deduplicated %d issues → %d (removed %d)",
                len(all_issues), len(deduped), removed,
            )
            dedup_ids = {id(i) for i in deduped}
            for ar in agent_results:
                ar.issues = [i for i in ar.issues if id(i) in dedup_ids]

    # Count failures AFTER collecting — decide if whole analysis should be marked failed
    total_agents_run = len(agent_results)
    failed_count = len(failed_agents)
    all_failed = total_agents_run > 0 and failed_count >= total_agents_run
    mostly_failed = total_agents_run > 0 and failed_count >= (total_agents_run + 1) // 2

    # Calculate scores
    agent_scores = {r.agent_name: r.score for r in agent_results if not r.error}
    # Fill missing agents with neutral score for quick mode (only when not failed)
    for name in WEIGHTS:
        if name not in agent_scores:
            agent_scores[name] = 50.0

    score_result = calculate_score(agent_scores)

    if on_event:
        done_event = {
            "type": "analysis_done",
            "total_score": score_result.total,
            "categories": score_result.categories,
            "not_ready": score_result.not_ready_for_approval,
            "blocked_categories": score_result.blocked_categories,
        }
        # Include error info if any agents failed
        if failed_agents:
            done_event["failed_agents"] = failed_agents
            done_event["has_errors"] = True
            if all_failed:
                done_event["all_failed"] = True
            elif mostly_failed:
                done_event["mostly_failed"] = True
        await on_event(done_event)

    return agent_results, {
        "total_score": score_result.total,
        "not_ready": score_result.not_ready_for_approval,
        "blocked_categories": score_result.blocked_categories,
        "failed_agents": failed_agents,
        "all_failed": all_failed,
        "mostly_failed": mostly_failed,
    }


async def run_correction_agent(document, agent_results, llm, on_event=None):
    """Run correction agent after main analysis, using issues as context."""
    agent = CorrectionAgent()

    # Build issues context from main agent results
    issues_lines = []
    all_issues = []
    for ar in agent_results:
        for issue in ar.issues:
            issues_lines.append(f"[{issue.severity}] {issue.title}: {issue.description}")
            all_issues.append(issue)
    issues_context = "\n".join(issues_lines)

    if on_event:
        await on_event({"type": "agent_start", "agent": "correction"})

    try:
        prompt = agent.build_user_prompt(document, issues_context, issues=all_issues)
        raw = await asyncio.wait_for(
            llm.complete(agent.get_system_prompt(), prompt),
            timeout=120,
        )
        # Parse corrections from JSON using robust parser
        corrections: list = []
        data = parse_json_from_llm(raw)
        if data is not None:
            raw_corrections = data.get("corrections", [])
            if isinstance(raw_corrections, list):
                # Anti-hallucination filter: keep only corrections whose `original`
                # is an actual substring of the document text.
                doc_text = document.full_text
                for c in raw_corrections:
                    if not isinstance(c, dict):
                        continue
                    original = c.get("original", "")
                    if original and isinstance(original, str) and original.strip() in doc_text:
                        corrections.append(c)
                    else:
                        logger.debug(
                            "Correction dropped — original not found in document: %r",
                            original[:80] if isinstance(original, str) else original,
                        )
        else:
            logger.warning("Correction agent: failed to parse JSON, no corrections extracted")

        if on_event:
            await on_event({"type": "agent_done", "agent": "correction", "corrections_count": len(corrections)})

        return corrections
    except Exception as e:
        logger.error("Correction agent failed: %s", e)
        if on_event:
            await on_event({"type": "agent_error", "agent": "correction", "error": str(e)})
        return []
