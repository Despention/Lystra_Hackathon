import asyncio
import json
import random
from collections.abc import AsyncGenerator

MOCK_RESPONSES = {
    "structural": {
        "score": 75,
        "issues": [
            {
                "severity": "serious",
                "title": "Отсутствует раздел 'Характеристика объектов автоматизации'",
                "description": "Документ не содержит обязательного раздела по ГОСТ 34.602-89, описывающего объект автоматизации.",
                "document_quote": None,
                "standard_reference": "ГОСТ 34.602-89, раздел 3",
                "recommendation": "Добавьте раздел 'Характеристика объектов автоматизации' с описанием структуры, процессов и условий функционирования объекта.",
                "penalty": 5.0,
            },
            {
                "severity": "warning",
                "title": "Нарушен порядок разделов",
                "description": "Раздел 'Требования к системе' расположен перед разделом 'Назначение и цели создания'.",
                "document_quote": None,
                "standard_reference": "ГОСТ 34.602-89, структура документа",
                "recommendation": "Переместите раздел 'Назначение и цели создания' перед разделом 'Требования к системе'.",
                "penalty": 2.0,
            },
            {
                "severity": "advice",
                "title": "Рекомендуется добавить раздел 'Источники разработки'",
                "description": "Хотя раздел не является обязательным, его наличие повышает качество ТЗ.",
                "document_quote": None,
                "standard_reference": "ГОСТ 34.602-89, раздел 9",
                "recommendation": "Добавьте перечень документов и информационных материалов, использованных при разработке ТЗ.",
                "penalty": 0.0,
            },
        ],
    },
    "terminological": {
        "score": 82,
        "issues": [
            {
                "severity": "serious",
                "title": "Неопределённая аббревиатура 'НИР'",
                "description": "Аббревиатура 'НИР' используется без расшифровки при первом упоминании.",
                "document_quote": "...в рамках НИР по разработке...",
                "standard_reference": "ГОСТ 7.32-2017, п. 5.4",
                "recommendation": "При первом упоминании укажите полную расшифровку: 'научно-исследовательская работа (НИР)'.",
                "penalty": 4.0,
            },
            {
                "severity": "warning",
                "title": "Непоследовательное использование термина",
                "description": "Термины 'система' и 'приложение' используются как взаимозаменяемые без уточнения.",
                "document_quote": "система должна обеспечивать... приложение предоставляет...",
                "standard_reference": "IEEE 830, п. 3.1",
                "recommendation": "Выберите один термин ('система' или 'приложение') и используйте его единообразно, или определите оба в разделе терминов.",
                "penalty": 1.5,
            },
        ],
    },
    "logical": {
        "score": 68,
        "issues": [
            {
                "severity": "critical",
                "title": "Противоречие в требованиях к производительности",
                "description": "В разделе 3 указано время отклика < 1 сек, а в разделе 7 для тех же операций — < 5 сек.",
                "document_quote": "Время обработки запроса — не более 1 секунды... допустимое время обработки — до 5 секунд",
                "standard_reference": "ISO/IEC 29148, п. 5.2.5",
                "recommendation": "Согласуйте требования к производительности, указав единое значение для каждого типа операций.",
                "penalty": 12.0,
            },
            {
                "severity": "serious",
                "title": "Неоднозначное требование",
                "description": "Формулировка 'система должна быть достаточно быстрой' не содержит измеримых критериев.",
                "document_quote": "система должна быть достаточно быстрой для комфортной работы",
                "standard_reference": "IEEE 830, п. 3.3",
                "recommendation": "Замените на конкретные метрики: 'время отклика API < 200 мс для 95-го перцентиля'.",
                "penalty": 5.0,
            },
            {
                "severity": "warning",
                "title": "Использование неопределённого модального глагола",
                "description": "Слово 'может' создаёт неоднозначность — неясно, является ли это требованием или опцией.",
                "document_quote": "система может поддерживать экспорт в PDF",
                "standard_reference": "IEEE 830, п. 3.2",
                "recommendation": "Используйте 'должна' (обязательное) или 'рекомендуется' (опциональное) вместо 'может'.",
                "penalty": 1.5,
            },
        ],
    },
    "completeness": {
        "score": 70,
        "issues": [
            {
                "severity": "critical",
                "title": "Отсутствуют требования к безопасности",
                "description": "Документ не содержит раздела по информационной безопасности, аутентификации и авторизации.",
                "document_quote": None,
                "standard_reference": "ISO/IEC 29148, п. 5.2.6",
                "recommendation": "Добавьте раздел 'Требования к безопасности', включающий: аутентификацию, авторизацию, шифрование данных, журналирование.",
                "penalty": 10.0,
            },
            {
                "severity": "serious",
                "title": "Не определены требования к надёжности",
                "description": "Отсутствуют метрики доступности (SLA), восстановления (RTO/RPO), отказоустойчивости.",
                "document_quote": None,
                "standard_reference": "ISO/IEC 25010, п. 4.2.5",
                "recommendation": "Укажите целевые значения: доступность ≥ 99.5%, RTO ≤ 4 часа, RPO ≤ 1 час.",
                "penalty": 6.0,
            },
            {
                "severity": "warning",
                "title": "Не описаны ограничения и допущения",
                "description": "Отсутствует раздел с ограничениями проекта, бюджетными рамками и допущениями.",
                "document_quote": None,
                "standard_reference": "ISO/IEC 29148, п. 5.1",
                "recommendation": "Добавьте раздел с описанием известных ограничений: технологических, организационных, финансовых.",
                "penalty": 2.0,
            },
        ],
    },
    "scientific": {
        "score": 78,
        "issues": [
            {
                "severity": "serious",
                "title": "Отсутствуют измеримые критерии верификации",
                "description": "Критерии успешности проекта описаны качественно, без количественных метрик.",
                "document_quote": "система должна удовлетворять требованиям заказчика",
                "standard_reference": "ГОСТ 34.602-89, п. 2.6",
                "recommendation": "Определите конкретные метрики: 'точность классификации ≥ 90%', 'время обучения ≤ 24 часа', и т.д.",
                "penalty": 5.0,
            },
            {
                "severity": "warning",
                "title": "Не описана методология тестирования",
                "description": "Отсутствует описание подходов к верификации и валидации системы.",
                "document_quote": None,
                "standard_reference": "ГОСТ Р 51904-2002, п. 5.3",
                "recommendation": "Добавьте раздел с описанием типов тестирования: модульное, интеграционное, приёмочное, с указанием критериев прохождения.",
                "penalty": 2.0,
            },
        ],
    },
}


MOCK_SUMMARY = (
    "Техническое задание описывает разработку цифрового полигона для моделирования "
    "технологий высоких мощностей и искусственного интеллекта в энергетике. "
    "Основная цель — создание платформы на базе концепции «Strong Smart Grid» для "
    "тестирования и внедрения инновационных решений без физических промышленных мощностей. "
    "Проект включает интеграцию ИИ, сенсорных технологий и телекоммуникационных сетей, "
    "а также формирование центра компетенций по новой энергетике."
)

MOCK_CORRECTIONS = {
    "corrections": [
        {
            "section": "2. Назначение и цели создания системы",
            "original": "система должна быть достаточно быстрой для комфортной работы",
            "suggested": "время отклика системы не должно превышать 2 секунд для 95-го перцентиля пользовательских запросов",
            "reason": "Нарушение IEEE 830, п. 3.3 — требования должны быть измеримыми и верифицируемыми",
            "severity": "serious",
        },
        {
            "section": "4. Требования к системе",
            "original": "Время обработки запроса — не более 1 секунды",
            "suggested": "Время обработки запроса — не более 3 секунд для операций чтения и не более 5 секунд для операций записи",
            "reason": "Противоречие с разделом 7, где указано допустимое время до 5 секунд. Необходимо согласовать значения.",
            "severity": "critical",
        },
        {
            "section": "1. Общие сведения",
            "original": "...в рамках НИР по разработке...",
            "suggested": "...в рамках научно-исследовательской работы (НИР) по разработке...",
            "reason": "ГОСТ 7.32-2017, п. 5.4 — аббревиатура должна быть расшифрована при первом упоминании",
            "severity": "serious",
        },
        {
            "section": "3. Характеристика объектов автоматизации",
            "original": "система может поддерживать экспорт в PDF",
            "suggested": "система должна поддерживать экспорт отчётов в формате PDF",
            "reason": "IEEE 830, п. 3.2 — модальный глагол «может» создаёт неоднозначность, заменён на «должна»",
            "severity": "warning",
        },
        {
            "section": "5. Состав и содержание работ",
            "original": "система должна удовлетворять требованиям заказчика",
            "suggested": "система должна соответствовать критериям приёмки, определённым в разделе 6: точность классификации >= 90%, время обучения модели <= 24 часов",
            "reason": "ГОСТ 34.602-89, п. 2.6 — критерии успешности должны быть конкретными и измеримыми",
            "severity": "serious",
        },
    ]
}


class MockLLMClient:
    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        agent_name = self._detect_agent(system_prompt)
        await asyncio.sleep(random.uniform(0.5, 1.5))

        if agent_name == "summary":
            return MOCK_SUMMARY
        if agent_name == "correction":
            return json.dumps(MOCK_CORRECTIONS, ensure_ascii=False)

        return json.dumps(MOCK_RESPONSES.get(agent_name, MOCK_RESPONSES["structural"]), ensure_ascii=False)

    async def stream(self, system_prompt: str, user_prompt: str) -> AsyncGenerator[str, None]:
        agent_name = self._detect_agent(system_prompt)
        response = json.dumps(MOCK_RESPONSES.get(agent_name, MOCK_RESPONSES["structural"]), ensure_ascii=False, indent=2)
        for char in response:
            yield char
            await asyncio.sleep(random.uniform(0.005, 0.02))

    def _detect_agent(self, system_prompt: str) -> str:
        prompt_lower = system_prompt.lower()
        if "summary" in prompt_lower or "резюме" in prompt_lower:
            return "summary"
        elif "корректор" in prompt_lower or "correction" in prompt_lower:
            return "correction"
        elif "структур" in prompt_lower or "structural" in prompt_lower:
            return "structural"
        elif "терминолог" in prompt_lower or "terminolog" in prompt_lower:
            return "terminological"
        elif "логическ" in prompt_lower or "logical" in prompt_lower or "противореч" in prompt_lower:
            return "logical"
        elif "полнот" in prompt_lower or "completeness" in prompt_lower or "чеклист" in prompt_lower:
            return "completeness"
        elif "научн" in prompt_lower or "scientific" in prompt_lower or "верификац" in prompt_lower:
            return "scientific"
        return "structural"
