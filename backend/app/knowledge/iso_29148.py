"""ISO/IEC 29148:2018 — checklist criteria for requirements specifications."""

ISO_29148_CRITERIA = [
    # Functional requirements
    {"id": "F01", "category": "functional", "criterion": "Все функциональные требования определены и пронумерованы", "weight": 2},
    {"id": "F02", "category": "functional", "criterion": "Входные данные для каждой функции описаны", "weight": 1},
    {"id": "F03", "category": "functional", "criterion": "Выходные данные для каждой функции описаны", "weight": 1},
    {"id": "F04", "category": "functional", "criterion": "Алгоритмы обработки данных описаны", "weight": 1},
    {"id": "F05", "category": "functional", "criterion": "Бизнес-правила и ограничения определены", "weight": 2},
    {"id": "F06", "category": "functional", "criterion": "Сценарии использования описаны", "weight": 1},
    {"id": "F07", "category": "functional", "criterion": "Обработка ошибок определена", "weight": 1},
    {"id": "F08", "category": "functional", "criterion": "Интерфейсы между подсистемами описаны", "weight": 2},
    {"id": "F09", "category": "functional", "criterion": "Требования к отчётам и выводу данных", "weight": 1},
    {"id": "F10", "category": "functional", "criterion": "Требования к административным функциям", "weight": 1},

    # Performance
    {"id": "P01", "category": "performance", "criterion": "Требования ко времени отклика указаны", "weight": 2},
    {"id": "P02", "category": "performance", "criterion": "Требования к пропускной способности указаны", "weight": 1},
    {"id": "P03", "category": "performance", "criterion": "Объёмы данных определены", "weight": 1},
    {"id": "P04", "category": "performance", "criterion": "Количество одновременных пользователей указано", "weight": 1},
    {"id": "P05", "category": "performance", "criterion": "Ограничения по использованию ресурсов (CPU, RAM, диск)", "weight": 1},

    # Security
    {"id": "S01", "category": "security", "criterion": "Требования к аутентификации определены", "weight": 2},
    {"id": "S02", "category": "security", "criterion": "Требования к авторизации определены", "weight": 2},
    {"id": "S03", "category": "security", "criterion": "Требования к шифрованию данных", "weight": 1},
    {"id": "S04", "category": "security", "criterion": "Требования к журналированию и аудиту", "weight": 1},
    {"id": "S05", "category": "security", "criterion": "Требования к защите персональных данных", "weight": 2},

    # Reliability
    {"id": "R01", "category": "reliability", "criterion": "Требования к доступности (SLA) определены", "weight": 2},
    {"id": "R02", "category": "reliability", "criterion": "Требования к отказоустойчивости", "weight": 1},
    {"id": "R03", "category": "reliability", "criterion": "Требования к резервному копированию", "weight": 1},
    {"id": "R04", "category": "reliability", "criterion": "Время восстановления (RTO) определено", "weight": 1},
    {"id": "R05", "category": "reliability", "criterion": "Допустимая потеря данных (RPO) определена", "weight": 1},

    # Usability
    {"id": "U01", "category": "usability", "criterion": "Требования к пользовательскому интерфейсу", "weight": 1},
    {"id": "U02", "category": "usability", "criterion": "Требования к доступности (accessibility)", "weight": 1},
    {"id": "U03", "category": "usability", "criterion": "Поддерживаемые языки интерфейса", "weight": 1},
    {"id": "U04", "category": "usability", "criterion": "Требования к обучению пользователей", "weight": 1},
    {"id": "U05", "category": "usability", "criterion": "Требования к документации для пользователей", "weight": 1},

    # Interfaces
    {"id": "I01", "category": "interfaces", "criterion": "Внешние программные интерфейсы (API) описаны", "weight": 2},
    {"id": "I02", "category": "interfaces", "criterion": "Аппаратные интерфейсы описаны", "weight": 1},
    {"id": "I03", "category": "interfaces", "criterion": "Коммуникационные интерфейсы описаны", "weight": 1},
    {"id": "I04", "category": "interfaces", "criterion": "Интерфейсы с внешними системами описаны", "weight": 2},
    {"id": "I05", "category": "interfaces", "criterion": "Форматы данных обмена определены", "weight": 1},

    # Data
    {"id": "D01", "category": "data", "criterion": "Модель данных описана", "weight": 2},
    {"id": "D02", "category": "data", "criterion": "Требования к целостности данных", "weight": 1},
    {"id": "D03", "category": "data", "criterion": "Требования к хранению и архивации", "weight": 1},
    {"id": "D04", "category": "data", "criterion": "Требования к миграции данных", "weight": 1},
    {"id": "D05", "category": "data", "criterion": "Словарь данных определён", "weight": 1},

    # Quality
    {"id": "Q01", "category": "quality", "criterion": "Каждое требование однозначно и не допускает двойного толкования", "weight": 2},
    {"id": "Q02", "category": "quality", "criterion": "Каждое требование проверяемо (тестируемо)", "weight": 2},
    {"id": "Q03", "category": "quality", "criterion": "Требования не противоречат друг другу", "weight": 2},
    {"id": "Q04", "category": "quality", "criterion": "Требования прослеживаемы (traceability)", "weight": 1},
    {"id": "Q05", "category": "quality", "criterion": "Приоритеты требований определены", "weight": 1},

    # Constraints
    {"id": "C01", "category": "constraints", "criterion": "Технологические ограничения описаны", "weight": 1},
    {"id": "C02", "category": "constraints", "criterion": "Организационные ограничения описаны", "weight": 1},
    {"id": "C03", "category": "constraints", "criterion": "Правовые и нормативные ограничения", "weight": 1},
    {"id": "C04", "category": "constraints", "criterion": "Допущения и зависимости описаны", "weight": 1},
    {"id": "C05", "category": "constraints", "criterion": "Бюджетные ограничения указаны", "weight": 1},

    # Maintenance
    {"id": "M01", "category": "maintenance", "criterion": "Требования к сопровождению и поддержке", "weight": 1},
    {"id": "M02", "category": "maintenance", "criterion": "Требования к масштабируемости", "weight": 1},
    {"id": "M03", "category": "maintenance", "criterion": "Требования к переносимости (портируемости)", "weight": 1},
    {"id": "M04", "category": "maintenance", "criterion": "Требования к конфигурируемости", "weight": 1},
    {"id": "M05", "category": "maintenance", "criterion": "Требования к мониторингу и диагностике", "weight": 1},

    # Deployment
    {"id": "E01", "category": "deployment", "criterion": "Требования к среде развёртывания", "weight": 1},
    {"id": "E02", "category": "deployment", "criterion": "Требования к инсталляции", "weight": 1},
    {"id": "E03", "category": "deployment", "criterion": "Совместимость с существующими системами", "weight": 1},
    {"id": "E04", "category": "deployment", "criterion": "Требования к обновлению", "weight": 1},
    {"id": "E05", "category": "deployment", "criterion": "Требования к откату изменений", "weight": 1},

    # Verification
    {"id": "V01", "category": "verification", "criterion": "Критерии приёмки определены", "weight": 2},
    {"id": "V02", "category": "verification", "criterion": "План тестирования описан", "weight": 1},
    {"id": "V03", "category": "verification", "criterion": "Метрики качества определены", "weight": 1},
    {"id": "V04", "category": "verification", "criterion": "Процедура приёмочных испытаний описана", "weight": 1},
    {"id": "V05", "category": "verification", "criterion": "Условия проведения испытаний определены", "weight": 1},

    # Project scope
    {"id": "SC01", "category": "scope", "criterion": "Границы системы определены (что входит / не входит)", "weight": 2},
    {"id": "SC02", "category": "scope", "criterion": "Заинтересованные стороны (stakeholders) определены", "weight": 1},
    {"id": "SC03", "category": "scope", "criterion": "Контекст системы описан", "weight": 1},
    {"id": "SC04", "category": "scope", "criterion": "Глоссарий терминов присутствует", "weight": 1},
    {"id": "SC05", "category": "scope", "criterion": "Ссылки на нормативные документы присутствуют", "weight": 1},
]
