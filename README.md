# Lystra TZ Analyzer

AI-приложение для анализа технических заданий на соответствие ГОСТ 34.602-89, ISO/IEC/IEEE 29148 и другим стандартам. Работает локально на собственном LLM (llama.cpp + Gemma 4), без отправки документов в облако.

## Архитектура

- **Backend**: FastAPI + SQLAlchemy async (SQLite) + Alembic миграции
- **Agent pipeline**: 5 параллельных анализирующих агентов + correction agent
- **LLM layer**: OpenAI-compatible API клиент (llama.cpp / Ollama / OpenAI / Anthropic) с retry, семафором, SQLite-кешем и fallback'ом на посекционный анализ при context overflow
- **Desktop**: Electron + React + TypeScript + Vite + Zustand
- **Mobile**: React Native + Expo (iOS/Android)

## Быстрый старт

### Backend

```bash
cd backend
pip install -r requirements.txt
USE_MOCK_LLM=true python -m uvicorn app.main:app --port 8000 --reload
```

API документация: http://localhost:8000/docs

Запуск тестов:
```bash
cd backend && python -m pytest tests/ -v
```

### Desktop (Electron)

```bash
cd desktop
npm install
npm run dev
```

### Mobile (Expo)

```bash
cd mobile
npm install
npx expo start
```

Сканируйте QR-код через Expo Go на телефоне.

> Для подключения к backend с устройства измените `BASE_URL` в `mobile/src/services/api.ts` на IP компьютера в локальной сети.

## 5 AI-агентов

| Агент | Вес | Проверяет |
|-------|-----|-----------|
| Структурный | 20% | Разделы по ГОСТ 34.602-89 (с pre-scan по regex) |
| Терминологический | 15% | Единство терминов, нерасшифрованные аббревиатуры |
| Логический | 25% | Противоречия, неоднозначности, ambiguous phrases |
| Полнота | 25% | Чеклист ISO/IEC 29148 (~80 критериев) |
| Научный | 15% | Методология и критерии верификации |

Плюс **Correction Agent** (вне скоринга) — предлагает точечные правки с цитатами из документа. Защищён anti-hallucination фильтром: `original` должен быть точной подстрокой документа.

## API Endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/analyze` | Запуск анализа (файл или текст) |
| WS | `/ws/{analysis_id}` | WebSocket стриминг статуса + токенов агентов |
| GET | `/api/analysis/{id}` | Полный результат, включая `failed_agents` |
| GET | `/api/history` | История анализов с фильтрами и пагинацией |
| GET | `/api/export/{id}/pdf` | PDF отчёт (через xhtml2pdf) |
| GET | `/api/export/{id}/html` | HTML отчёт (для preview в браузере) |
| GET | `/api/export/{id}/xlsx` | Excel-отчёт по одному анализу |
| GET | `/api/export/history/xlsx` | Excel-отчёт по всей истории |
| GET | `/api/export/expert-evaluation/xlsx` | Шаблон экспертной оценки с предзаполненными AI-оценками |
| `*` | `/api/folders/...` | Папки и управление анализами |
| GET | `/api/health` | Статус сервиса + наличие LLM |
| GET | `/api/metrics` | Prometheus text-format метрики (cache hits, durations, errors) |

Все ошибки возвращаются в единой форме `ErrorResponse`:
```json
{"code": "not_found", "message": "Analysis not found", "detail": null}
```

## Reliability & Observability

- **Retry layer**: экспоненциальный backoff (1s → 2s → 4s) на `APIConnectionError`, `APITimeoutError`, `RateLimitError`. `ContextOverflowError` — не ретраится.
- **Section fallback**: при context overflow агент автоматически переключается на посекционный анализ. Финальный score — взвешенное среднее по длине секций.
- **LLM cache**: SQLite-таблица `llm_cache` с SHA-256 ключами `(model, system, user)`. TTL настраивается (`llm_cache_ttl_days`).
- **LLM semaphore**: `llm_max_concurrent` (default 1 для локальных моделей) ограничивает параллельные запросы к одному base_url.
- **Issue deduplication**: Jaccard similarity на стемминговых токенах (snowballstemmer RU) сливает одинаковые issues между агентами.
- **Request IDs**: каждый HTTP-запрос получает `X-Request-ID` (или использует входящий от клиента), пробрасывается в логи через `contextvars`.
- **Metrics**: `/api/metrics` отдаёт Prometheus-style counters (analyses, cache, retries, agent errors, agent duration).
- **Startup cleanup**: при рестарте сервера все `processing/pending` анализы помечаются как `failed` — не остаётся "висящих" записей.

## Миграции

Схема БД управляется Alembic. На свежей установке `init_db()` сам делает `alembic upgrade head`. На существующих БД без `alembic_version` — делается `alembic stamp head` чтобы не пересоздавать таблицы.

Команды для разработки:
```bash
cd backend
alembic revision --autogenerate -m "add column X"
alembic upgrade head
alembic downgrade -1
```

## Подключение реальных моделей

1. Скачайте модели: `bash scripts/download_models.sh`
2. Запустите llama.cpp server:
   ```bash
   llama-server -m models/gemma-4-26B-A4B-it-Q4_K_M.gguf --port 8080 -ngl 99 -c 8192
   ```
3. Запустите backend с `USE_MOCK_LLM=false`:
   ```bash
   USE_MOCK_LLM=false python -m uvicorn app.main:app --port 8000
   ```

## Конфигурация (env)

Основные переменные в `backend/.env`:

```
USE_MOCK_LLM=false
LLAMA_CPP_BASE_URL=http://localhost:8080/v1
LLAMA_CPP_MODEL_LARGE=gemma-4-26B-A4B-it-UD-Q4_K_M
LLAMA_CPP_MODEL_SMALL=gemma-4-E4B-it-Q4_K_M

# Reliability
LLM_MAX_RETRIES=3
LLM_RETRY_BACKOFF=1.0
LLM_TIMEOUT_SECONDS=120
LLM_MAX_CONTEXT_CHARS=12000
LLM_MAX_CONCURRENT=1

# Cache
LLM_CACHE_ENABLED=true
LLM_CACHE_TTL_DAYS=30

# DB / storage
DATABASE_URL=sqlite+aiosqlite:///./tz_analyzer.db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=20
```

## Структура проекта

```
backend/
├── app/
│   ├── agents/         # 5 анализаторов + correction + base
│   ├── api/            # analyze, results, export, metrics, health, ...
│   ├── knowledge/      # промпты + GOST rules (раздел/аббрев/phrase matchers)
│   ├── services/       # llm_client, llm_cache, json_parser, deduplication, ...
│   ├── database.py     # SQLAlchemy модели + alembic-aware init_db()
│   ├── main.py         # FastAPI app, middleware, exception handlers
│   └── config.py       # Settings (Pydantic)
├── alembic/            # миграции (baseline + последующие)
└── tests/
    ├── services/       # unit-тесты для services/
    ├── agents/         # unit-тесты для agents/
    ├── test_api.py     # интеграционные API-тесты
    └── ...
```
