from dataclasses import dataclass, field

WEIGHTS = {
    "structural": 0.20,
    "terminological": 0.15,
    "logical": 0.25,
    "completeness": 0.25,
    "scientific": 0.15,
}

SEVERITY_PENALTIES = {
    "critical": (8, 15),
    "serious": (3, 7),
    "warning": (1, 2),
    "advice": (0, 0),
}


@dataclass
class AnalysisScore:
    total: float
    categories: dict[str, float] = field(default_factory=dict)
    not_ready_for_approval: bool = False
    blocked_categories: list[str] = field(default_factory=list)


def calculate_score(agent_scores: dict[str, float]) -> AnalysisScore:
    """Calculate weighted total score from per-agent scores."""
    total = 0.0
    blocked = []

    for name, weight in WEIGHTS.items():
        score = agent_scores.get(name, 0.0)
        score = max(0.0, min(100.0, score))
        total += score * weight
        if score < 40:
            blocked.append(name)

    return AnalysisScore(
        total=round(total, 1),
        categories=agent_scores,
        not_ready_for_approval=len(blocked) > 0,
        blocked_categories=blocked,
    )
