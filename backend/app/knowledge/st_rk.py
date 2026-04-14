"""СТ РК — государственные стандарты Республики Казахстан для технических заданий.

Основные стандарты:
- СТ РК 34.017-2005  — требования к ТЗ на АИС (гармонизирован с ГОСТ 34.602-89)
- СТ РК ИСО/МЭК 29148-2013 — требования к спецификации требований (ИКТ-проекты)
- СТ РК 1843-2008    — требования к документации на государственном языке
- СТ РК 1073-2007    — документирование программного обеспечения
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class StRkSection:
    num: str
    title: str
    synonyms: tuple[str, ...]
    required: bool
    standard_ref: str


# СТ РК 34.017-2005 — обязательные разделы ТЗ для автоматизированных информационных систем РК.
# Структура соответствует ГОСТ 34.602-89, расширенная требованиями законодательства РК.
ST_RK_34_017_SECTIONS: list[StRkSection] = [
    StRkSection(
        num="1", title="Общие сведения",
        synonyms=("общие положения", "введение", "назначение документа"),
        required=True, standard_ref="СТ РК 34.017-2005, п. 3.1",
    ),
    StRkSection(
        num="2", title="Назначение и цели создания системы",
        synonyms=("назначение системы", "цели создания", "цели и задачи"),
        required=True, standard_ref="СТ РК 34.017-2005, п. 3.2",
    ),
    StRkSection(
        num="3", title="Характеристика объектов автоматизации",
        synonyms=("объект автоматизации", "описание объекта", "характеристики объекта"),
        required=True, standard_ref="СТ РК 34.017-2005, п. 3.3",
    ),
    StRkSection(
        num="4", title="Требования к системе",
        synonyms=("требования к системе", "системные требования", "функциональные требования"),
        required=True, standard_ref="СТ РК 34.017-2005, п. 3.4",
    ),
    StRkSection(
        num="5", title="Состав и содержание работ по созданию системы",
        synonyms=("состав работ", "этапы работ", "этапы создания"),
        required=True, standard_ref="СТ РК 34.017-2005, п. 3.5",
    ),
    StRkSection(
        num="6", title="Порядок контроля и приёмки системы",
        synonyms=("порядок приёмки", "приёмочные испытания", "критерии приёмки"),
        required=True, standard_ref="СТ РК 34.017-2005, п. 3.6",
    ),
    StRkSection(
        num="7", title="Требования к подготовке объекта автоматизации",
        synonyms=("подготовка объекта", "мероприятия по подготовке"),
        required=True, standard_ref="СТ РК 34.017-2005, п. 3.7",
    ),
    StRkSection(
        num="8", title="Требования к документированию",
        synonyms=("требования к документации", "состав документации"),
        required=True, standard_ref="СТ РК 34.017-2005, п. 3.8",
    ),
    StRkSection(
        num="9", title="Источники разработки",
        synonyms=("источники разработки", "нормативные документы", "использованные материалы"),
        required=False, standard_ref="СТ РК 34.017-2005, п. 3.9",
    ),
]


# Критерии проверки, специфичные для законодательства и инфраструктуры РК.
# Применяются в агенте полноты (completeness) наряду с ISO/IEC 29148.
ST_RK_CRITERIA: list[dict] = [
    # --- Языковые требования (СТ РК 1843-2008) ---
    {
        "id": "KZ-L01",
        "category": "language",
        "criterion": "Документ содержит версию (или раздел) на государственном языке (казахский)",
        "weight": 3,
        "standard_ref": "СТ РК 1843-2008, п. 4.1",
        "severity_if_missing": "serious",
    },
    {
        "id": "KZ-L02",
        "category": "language",
        "criterion": "Термины на казахском языке соответствуют официальному глоссарию МЦРИАП РК",
        "weight": 2,
        "standard_ref": "СТ РК 1843-2008, п. 4.3",
        "severity_if_missing": "warning",
    },

    # --- Защита данных и персональные данные (Закон РК «О персональных данных», 2013) ---
    {
        "id": "KZ-D01",
        "category": "data_protection",
        "criterion": "Указаны требования к защите персональных данных в соответствии с Законом РК «О персональных данных и их защите»",
        "weight": 3,
        "standard_ref": "Закон РК № 94-V от 21.05.2013, ст. 8",
        "severity_if_missing": "critical",
    },
    {
        "id": "KZ-D02",
        "category": "data_protection",
        "criterion": "Персональные данные граждан РК хранятся на серверах, расположенных на территории Республики Казахстан (требование локализации)",
        "weight": 3,
        "standard_ref": "Закон РК № 94-V от 21.05.2013, ст. 16",
        "severity_if_missing": "critical",
    },
    {
        "id": "KZ-D03",
        "category": "data_protection",
        "criterion": "Описан порядок получения согласия субъекта персональных данных",
        "weight": 2,
        "standard_ref": "Закон РК № 94-V от 21.05.2013, ст. 7",
        "severity_if_missing": "serious",
    },

    # --- Информационная безопасность (Закон РК «Об информатизации», 2015) ---
    {
        "id": "KZ-S01",
        "category": "security",
        "criterion": "Указаны требования к аттестации системы по информационной безопасности (КНБ РК / МЦРИАП РК)",
        "weight": 3,
        "standard_ref": "Закон РК № 418-V от 24.11.2015 «Об информатизации», ст. 17",
        "severity_if_missing": "serious",
    },
    {
        "id": "KZ-S02",
        "category": "security",
        "criterion": "Требования к применению сертифицированных СКЗИ (средств криптографической защиты информации) КазНИИ «Гамма»",
        "weight": 2,
        "standard_ref": "Постановление Правительства РК № 573 от 14.05.2013",
        "severity_if_missing": "serious",
    },
    {
        "id": "KZ-S03",
        "category": "security",
        "criterion": "Описана интеграция с инфраструктурой открытых ключей (ИОК / НУЦ РК) для ЭЦП",
        "weight": 2,
        "standard_ref": "Закон РК № 370-I от 07.01.2003 «Об электронном документе и ЭЦП»",
        "severity_if_missing": "warning",
    },

    # --- Совместимость с государственной инфраструктурой ---
    {
        "id": "KZ-I01",
        "category": "interoperability",
        "criterion": "Указаны требования к интеграции с Шиной межведомственного взаимодействия (ШМВ) eGov РК",
        "weight": 2,
        "standard_ref": "Постановление Правительства РК № 1816 от 31.12.2019",
        "severity_if_missing": "warning",
    },
    {
        "id": "KZ-I02",
        "category": "interoperability",
        "criterion": "Описана совместимость с Единой системой электронного документооборота (ЕСЭДО) для государственных органов",
        "weight": 2,
        "standard_ref": "Постановление Правительства РК № 1370 от 31.10.2018",
        "severity_if_missing": "warning",
    },
    {
        "id": "KZ-I03",
        "category": "interoperability",
        "criterion": "Указаны требования к интеграции с государственными базами данных (ГБД ФЛ, ГБД ЮЛ, ГБД АДМ)",
        "weight": 2,
        "standard_ref": "СТ РК 34.017-2005, п. 3.4.6",
        "severity_if_missing": "warning",
    },

    # --- Государственная техническая экспертиза ---
    {
        "id": "KZ-E01",
        "category": "expertise",
        "criterion": "В документе предусмотрено прохождение государственной технической экспертизы (ГТЭ) для ИКТ-проектов с бюджетным финансированием",
        "weight": 2,
        "standard_ref": "Закон РК № 418-V от 24.11.2015 «Об информатизации», ст. 20",
        "severity_if_missing": "serious",
    },
    {
        "id": "KZ-E02",
        "category": "expertise",
        "criterion": "Стоимость работ и технологические решения обоснованы в соответствии с методикой расчёта МЦРИАП РК",
        "weight": 2,
        "standard_ref": "Приказ МЦРИАП РК № 242 от 21.06.2021",
        "severity_if_missing": "warning",
    },

    # --- Качество документа (СТ РК 1073-2007) ---
    {
        "id": "KZ-Q01",
        "category": "documentation_quality",
        "criterion": "Документ оформлен в соответствии с требованиями СТ РК 1073-2007 (структура, нумерация, реквизиты)",
        "weight": 1,
        "standard_ref": "СТ РК 1073-2007, п. 5",
        "severity_if_missing": "warning",
    },
    {
        "id": "KZ-Q02",
        "category": "documentation_quality",
        "criterion": "Наименование документа соответствует типовой форме ТЗ, утверждённой МЦРИАП РК",
        "weight": 1,
        "standard_ref": "СТ РК 34.017-2005, п. 1.3",
        "severity_if_missing": "advice",
    },

    # --- Облачные сервисы (только для государственных ИС) ---
    {
        "id": "KZ-C01",
        "category": "cloud",
        "criterion": "При использовании облачных сервисов указано размещение в государственном облаке РК («G-Cloud»)",
        "weight": 2,
        "standard_ref": "Постановление Правительства РК № 557 от 12.04.2017",
        "severity_if_missing": "warning",
    },
]


def find_missing_st_rk_sections(document_text: str) -> list[dict]:
    """Return a list of required ST RK 34.017-2005 sections missing from the document."""
    import re
    text_lower = document_text.lower()
    missing = []
    for sec in ST_RK_34_017_SECTIONS:
        if not sec.required:
            continue
        found = False
        candidates = (sec.title.lower(), *[s.lower() for s in sec.synonyms])
        for candidate in candidates:
            pattern = re.sub(r"\s+", r"\\s+", re.escape(candidate))
            if re.search(pattern, text_lower):
                found = True
                break
        if not found:
            missing.append({
                "num": sec.num,
                "title": sec.title,
                "standard_ref": sec.standard_ref,
            })
    return missing


__all__ = [
    "ST_RK_34_017_SECTIONS",
    "ST_RK_CRITERIA",
    "find_missing_st_rk_sections",
]
