from app.agents.base import BaseAgent
from app.knowledge.prompts import COMPLETENESS_SYSTEM_PROMPT


class CompletenessAgent(BaseAgent):
    name = "completeness"
    weight = 0.25
    model_size = "large"

    def get_system_prompt(self) -> str:
        return COMPLETENESS_SYSTEM_PROMPT
