from app.agents.base import BaseAgent
from app.config import settings
from app.knowledge.gost_rules import find_missing_sections
from app.knowledge.prompts import STRUCTURAL_SYSTEM_PROMPT
from app.services.document_parser import ParsedDocument


class StructuralAgent(BaseAgent):
    name = "structural"
    weight = 0.20
    model_size = "large"

    def get_system_prompt(self) -> str:
        return STRUCTURAL_SYSTEM_PROMPT

    def build_user_prompt(self, document: ParsedDocument) -> str:
        base = super().build_user_prompt(document)
        missing = find_missing_sections(document.full_text)
        if not missing:
            return base
        hints = "\n".join(
            f"  - Раздел {m['num']} «{m['title']}» не обнаружен ({m['standard_ref']})"
            for m in missing
        )
        return (
            f"{base}\n\n"
            f"Предварительный автоматический анализ выявил следующие "
            f"потенциально отсутствующие разделы:\n{hints}\n\n"
            f"Подтверди или опровергни эти наблюдения, обратись к тексту документа, "
            f"добавь свои находки."
        )
