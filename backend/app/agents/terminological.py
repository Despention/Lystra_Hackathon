from app.agents.base import BaseAgent
from app.knowledge.gost_rules import find_undefined_abbreviations
from app.knowledge.prompts import TERMINOLOGICAL_SYSTEM_PROMPT
from app.services.document_parser import ParsedDocument


class TerminologicalAgent(BaseAgent):
    name = "terminological"
    weight = 0.15
    model_size = "small"

    def get_system_prompt(self) -> str:
        return TERMINOLOGICAL_SYSTEM_PROMPT

    def build_user_prompt(self, document: ParsedDocument) -> str:
        base = super().build_user_prompt(document)
        undefined = find_undefined_abbreviations(document.full_text)
        if not undefined:
            return base
        hints = "\n".join(
            f"  - «{u['abbreviation']}» встречается {u['occurrences']} раз(а) без расшифровки (ожидается: «{u['expected_expansion']}»)"
            for u in undefined
        )
        return (
            f"{base}\n\n"
            f"Предварительный анализ выявил аббревиатуры без явной расшифровки:\n{hints}\n\n"
            f"Проверь эти наблюдения в тексте (возможно, расшифровка есть в нестандартном "
            f"месте) и добавь собственные находки по терминологии."
        )
