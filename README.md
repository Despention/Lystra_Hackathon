# TZ Analyzer MVP

AI-приложение для анализа технических заданий на соответствие ГОСТ 34.602-89, ISO/IEC 29148 и другим стандартам.

## Архитектура

- **Backend**: FastAPI (Python) + 5 AI-агентов + WebSocket стриминг
- **Mobile**: React Native + Expo (TypeScript)
- **AI**: llama.cpp + Gemma 4 (с mock-режимом для разработки)

## Быстрый старт

### Backend

```bash
cd backend
pip install -r requirements.txt
USE_MOCK_LLM=true python -m uvicorn app.main:app --port 8000 --reload
```

API документация: http://localhost:8000/docs

### Mobile

```bash
cd mobile
npm install
npx expo start
```

Сканируйте QR-код через Expo Go на телефоне.

> Для подключения к backend с реального устройства измените `BASE_URL` в `mobile/src/services/api.ts` на IP вашего компьютера в локальной сети.

## API Endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/analyze` | Запуск анализа (файл или текст) |
| WS | `/ws/{analysis_id}` | WebSocket стриминг статуса агентов |
| GET | `/api/analysis/{id}` | Полный результат анализа |
| GET | `/api/history` | История анализов |
| GET | `/api/export/{id}/pdf` | Экспорт отчёта (HTML) |
| GET | `/api/health` | Статус сервиса |

## 5 AI-агентов

| Агент | Вес | Проверяет |
|-------|-----|-----------|
| Структурный | 20% | Разделы по ГОСТ 34.602-89 |
| Терминологический | 15% | Единство терминов и аббревиатур |
| Логический | 25% | Противоречия и неоднозначности |
| Полнота | 25% | Чеклист ISO/IEC 29148 (~80 критериев) |
| Научный | 15% | Методология и критерии верификации |

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
