from app.agents.base import BaseAgent
from app.knowledge.prompts import SCIENTIFIC_SYSTEM_PROMPT


class ScientificAgent(BaseAgent):
    name = "scientific"
    weight = 0.15
    model_size = "small"

    def get_system_prompt(self) -> str:
        return SCIENTIFIC_SYSTEM_PROMPT
