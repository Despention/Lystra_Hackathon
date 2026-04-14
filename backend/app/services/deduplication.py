"""Issue deduplication across agents.

5 agents often surface the same underlying problem under different titles.
This module collapses near-duplicates so the UI shows each issue once.

Strategy:
- Normalize each title: lowercase, strip punctuation, stem Russian words
  (via snowballstemmer), drop stopwords.
- Compute pairwise Jaccard similarity of normalized token sets.
- If similarity >= 0.7, treat as duplicates.
- When merging, keep the issue with the highest severity (critical > serious >
  warning > advice). Ties broken by longer description.
"""
from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.agents.base import IssueData

logger = logging.getLogger(__name__)

_SEVERITY_RANK = {"critical": 4, "serious": 3, "warning": 2, "advice": 1}

_STOPWORDS_RU = {
    "и", "в", "во", "не", "что", "он", "на", "я", "с", "со", "как", "а",
    "то", "все", "она", "так", "его", "но", "да", "ты", "к", "у", "же",
    "вы", "за", "бы", "по", "только", "ее", "мне", "было", "вот", "от",
    "меня", "еще", "нет", "о", "из", "ему", "теперь", "когда", "даже",
    "ну", "вдруг", "ли", "если", "уже", "или", "ни", "быть", "был",
    "него", "до", "вас", "нибудь", "опять", "уж", "вам", "ведь", "там",
    "потом", "себя", "ничего", "ей", "может", "они", "тут", "где", "есть",
    "надо", "ней", "для", "мы", "тебя", "их", "чем", "была", "сам", "чтоб",
    "без", "будто", "чего", "раз", "тоже", "себе", "под", "будет", "ж",
    "тогда", "кто", "этот", "того", "потому", "этого", "какой", "совсем",
    "ним", "здесь", "этом", "один", "почти", "мой", "тем", "чтобы", "нее",
    "сейчас", "были", "куда", "зачем", "всех", "никогда", "можно", "при",
    "наконец", "два", "об", "другой", "хоть", "после", "над", "больше",
    "тот", "через", "эти", "нас", "про", "всего", "них", "какая", "много",
    "разве", "три", "эту", "моя", "впрочем", "хорошо", "свою", "этой",
    "перед", "иногда", "лучше", "чуть", "том", "нельзя", "такой", "ним",
    "всегда", "конечно", "всю", "между",
    # технические служебные
    "должен", "должна", "должны", "отсутствует", "отсутствуют", "требуется",
    "необходимо", "также",
}

_WORD_RE = re.compile(r"[а-яА-Яa-zA-Z0-9]+", re.UNICODE)

# Lazy-loaded stemmer (import is cheap; construction is cheaper still)
_stemmer = None


def _get_stemmer():
    global _stemmer
    if _stemmer is None:
        try:
            import snowballstemmer
            _stemmer = snowballstemmer.stemmer("russian")
        except Exception as e:  # snowballstemmer not installed → fall back to no stemming
            logger.debug("snowballstemmer unavailable, dedup will use raw tokens: %s", e)
            _stemmer = False  # sentinel for "tried and failed"
    return _stemmer if _stemmer is not False else None


def _tokenize(text: str) -> set[str]:
    """Tokenize + lowercase + stopword removal + stem."""
    if not text:
        return set()
    tokens = [m.group(0).lower() for m in _WORD_RE.finditer(text)]
    tokens = [t for t in tokens if t not in _STOPWORDS_RU and len(t) > 2]

    stemmer = _get_stemmer()
    if stemmer is not None:
        tokens = [stemmer.stemWord(t) for t in tokens]

    return set(tokens)


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def deduplicate_issues(
    issues: list,
    threshold: float = 0.7,
) -> list:
    """Remove near-duplicate issues based on normalized title token overlap.

    Returns a subset of the input list (same objects, by identity).
    The object with the highest severity wins within each cluster; on ties,
    the one with the longer description wins.
    """
    if len(issues) <= 1:
        return list(issues)

    # Pre-compute token sets
    token_sets = [_tokenize(getattr(i, "title", "") or "") for i in issues]

    # Cluster via greedy single-linkage: walk issues in order, for each issue
    # find an existing cluster whose representative exceeds threshold.
    clusters: list[list[int]] = []  # each cluster = list of indices into `issues`
    cluster_token_union: list[set[str]] = []

    for i, tokens in enumerate(token_sets):
        placed = False
        for c_idx, rep_tokens in enumerate(cluster_token_union):
            if _jaccard(tokens, rep_tokens) >= threshold:
                clusters[c_idx].append(i)
                cluster_token_union[c_idx] = rep_tokens | tokens
                placed = True
                break
        if not placed:
            clusters.append([i])
            cluster_token_union.append(set(tokens))

    # Pick winner from each cluster
    survivors: list = []
    for cluster in clusters:
        if len(cluster) == 1:
            survivors.append(issues[cluster[0]])
            continue

        def rank(idx: int) -> tuple[int, int]:
            issue = issues[idx]
            sev = getattr(issue, "severity", "advice")
            desc = getattr(issue, "description", "") or ""
            return (_SEVERITY_RANK.get(sev, 0), len(desc))

        winner_idx = max(cluster, key=rank)
        survivors.append(issues[winner_idx])

    return survivors


__all__ = ["deduplicate_issues"]
