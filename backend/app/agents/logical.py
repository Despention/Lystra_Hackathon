from app.agents.base import BaseAgent
from app.knowledge.gost_rules import find_ambiguous_phrases
from app.knowledge.prompts import LOGICAL_SYSTEM_PROMPT
from app.services.document_parser import ParsedDocument


class LogicalAgent(BaseAgent):
    name = "logical"
    weight = 0.25
    model_size = "large"

    def get_system_prompt(self) -> str:
        return LOGICAL_SYSTEM_PROMPT

    def build_user_prompt(self, document: ParsedDocument) -> str:
        base = super().build_user_prompt(document)
        ambiguous = find_ambiguous_phrases(document.full_text)
        if not ambiguous:
            return base
        hints = "\n".join(
            f"  - Фраза «{a['phrase']}» — {a['reason']} (встречается {a['occurrences']} раз(а))"
            for a in ambiguous
        )
        return (
            f"{base}\n\n"
            f"Предварительный анализ выявил потенциально неоднозначные формулировки:\n{hints}\n\n"
            f"Оцени, насколько они критичны в контексте, и найди собственные "
            f"логические дефекты (противоречия, неопределённости, циклические зависимости)."
        )
