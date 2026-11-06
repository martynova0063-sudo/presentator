# Презентатор (Presentation Generator)

Система автоматического создания корпоративных презентаций (PPTX и PDF) по текстовому описанию или структурированным данным, с корпоративными шаблонами, AI Visual Advisor и MCP-сервером.

## Состав

- `backend/` — FastAPI, SQLAlchemy, Alembic, python-pptx, RQ (очередь на Redis), LibreOffice для PDF.
- `src/` — React (файлы .jsx), Vite, интерфейс на русском языке; `frontend/` — Dockerfile и конфиг nginx для сборки контейнера.
- `docker-compose.yml` — PostgreSQL, Redis, API, воркер и веб-интерфейс.

## Быстрый старт (Docker)

1. Запустите `docker compose up --build`.
2. Создайте пользователя и API-ключ: `docker compose exec api python -m scripts.create_api_key "Иван Петров"`. Сохраните ключ.
3. Откройте http://localhost:8080, введите ключ и создайте первую презентацию.
4. Документация API (Swagger): http://localhost:8000/docs

## Локальный запуск без Docker

Нужны PostgreSQL (строка `postgresql://postgres:postgres@localhost:5432/presentator`), Redis и LibreOffice.

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
alembic upgrade head
python -m scripts.create_api_key "Тестовый пользователь"
uvicorn app.main:app --reload
rq worker presentations --url redis://localhost:6379/0   # отдельный терминал
```

Фронтенд: `npm install && npm run dev` (откроется http://localhost:5173, запросы идут на порт 8000).

## Конфигурация

| Переменная | Значение по умолчанию | Назначение |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/presentator` | База данных |
| `REDIS_URL` | `redis://localhost:6379/0` | Очередь задач |
| `STORAGE_DIR` | `storage` | Каталог шаблонов и результатов |
| `LIBREOFFICE_BIN` | `soffice` | Команда LibreOffice для PDF |
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | не заданы | OpenAI-совместимый провайдер; без них структура строится из текста по правилам |

## Примеры

Создать презентацию (асинхронно):

```bash
curl -X POST http://localhost:8000/tasks \
  -H "X-API-Key: ВАШ_КЛЮЧ" -H "Content-Type: application/json" \
  -d '{"title": "Итоги квартала", "text": "# Продажи\n- Выручка выросла на 12%\n- Открыто два офиса", "slides_count": 5}'
```

Статус: `GET /tasks/{id}`. Скачать: `GET /tasks/{id}/result?format=pptx` (или `pdf`, если задано `want_pdf`).

Явно заданный тип слайда имеет приоритет над рекомендацией AI Visual Advisor. Рекомендацию с обоснованием можно получить через `POST /advisor/recommend`.

## MCP-сервер

Endpoint `POST /mcp` (JSON-RPC 2.0, протокол Streamable HTTP, заголовок `X-API-Key`). Инструменты:

- `generate_presentation` — создать презентацию, возвращает `task_id`.
- `get_task_status` — статус и прогресс.
- `list_templates` — шаблоны с номером активной версии.
- `get_result` — готовый файл в base64 (`pptx` или `pdf`).

## Тесты

```bash
cd backend && pytest
```

Тесты используют SQLite и не требуют Redis и LibreOffice.

## Ограничения текущей версии

- Файлы хранятся в локальном каталоге `STORAGE_DIR`, а не в MinIO/S3. Интерфейс хранилища вынесен в `app/storage.py`, поэтому замена простая.
- Метрики (счётчики, время генерации) не собираются, логи пишутся стандартным модулем logging.
- Нет CI-конфигурации, файлов LICENSE и NOTICE. Лицензии Apache 2.0 и MIT нужно добавить перед публикацией.
- Изображения передаются в base64 внутри запроса (до 4 000 000 символов в строке base64).
