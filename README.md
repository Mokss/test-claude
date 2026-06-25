# iSmart

Платформа для проверки заданий по программированию. Учитель создаёт задачи с тест-кейсами, студенты сдают решения — код запускается в изолированном Docker-контейнере и проверяется автоматически. Учитель видит результаты и может выставить оценку.

## Архитектура

```
┌─────────┐     /api/*      ┌───────────────┐   RabbitMQ   ┌─────────────────┐
│  nginx  │ ─────────────► │  core-backend  │ ────────────► │ sandbox-service │
│  :80    │                 │     :3000      │ ◄──────────── │   (Docker-in-   │
│         │ ◄── SPA assets  │  MongoDB       │               │    Docker)      │
└─────────┘                 └───────────────┘               └─────────────────┘
                                    │ RabbitMQ
                                    ▼
                          ┌──────────────────────┐
                          │ notification-service  │
                          │    (SMTP email)       │
                          └──────────────────────┘
```

| Пакет | Описание |
|-------|----------|
| `frontend` | React 19 + Vite SPA — интерфейс студента и учителя |
| `core-backend` | Fastify API, гексагональная архитектура, MongoDB, JWT |
| `sandbox-service` | Изолированный запуск кода через Docker-in-Docker |
| `notification-service` | Email-уведомления учителям через SMTP |
| `specs` | Общие TypeScript-типы (единственный источник правды) |

## Установка

Требования: **Node.js 24+**, **Docker + Docker Compose**.

```bash
git clone <repo-url> ismart && cd ismart
npm install          # устанавливает все workspace-пакеты разом
cp .env.example .env # заполните секреты — см. таблицу ниже
```

## Локальная разработка (с hot-reload)

Frontend запускается отдельно через Vite dev server — иначе изменения в коде не будут подхватываться без пересборки Docker-образа.

**Терминал 1 — инфраструктура и backend:**

```bash
docker compose up mongo rabbitmq core-backend sandbox-service notification-service
```

**Терминал 2 — frontend (Vite HMR на :5173):**

```bash
cd frontend && npm run dev
```

Откройте [http://localhost:5173](http://localhost:5173). API-запросы (`/api/*`) Vite проксирует на `localhost:3000`.

RabbitMQ Management UI: [http://localhost:15672](http://localhost:15672) (guest / guest).

## Production-сборка (всё через Docker)

```bash
docker compose --profile build up --build
```

Nginx собирает статику frontend и отдаёт её на [http://localhost](http://localhost), проксируя `/api/*` на core-backend. Без `--profile build` frontend-builder не запускается.

## Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# Обязательно — секрет для подписи JWT токенов
# Генерация: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=

# SMTP — для email-уведомлений учителям
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=
```

| Переменная | Обязательна | Описание |
|------------|:-----------:|----------|
| `JWT_SECRET` | ✅ | Секрет для подписи JWT. Должен быть случайным и длинным. |
| `SMTP_HOST` | — | SMTP-сервер для отправки писем учителям |
| `SMTP_PORT` | — | Порт SMTP (обычно `587` для TLS, `465` для SSL) |
| `SMTP_USER` | — | Логин SMTP |
| `SMTP_PASS` | — | Пароль SMTP |

> MongoDB и RabbitMQ в Docker Compose поднимаются автоматически без дополнительной конфигурации.

## Структура монорепо

```
ismart/
├── frontend/           # React SPA
├── core-backend/       # Основной API-сервис
├── sandbox-service/    # Сервис запуска кода
├── notification-service/ # Email-уведомления
├── specs/              # Общие типы (@ismart/specs)
├── docker-compose.yml
├── nginx.conf
└── package.json        # npm workspaces
```

## Документация

- [frontend/specs/](frontend/specs/index.md)
- [core-backend/specs/](core-backend/specs/index.md)
- [sandbox-service/specs/](sandbox-service/specs/index.md)
- [notification-service/specs/](notification-service/specs/index.md)
