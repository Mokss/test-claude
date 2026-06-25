# iSmart

Платформа для проверки заданий по программированию. Учитель создаёт задачи с тест-кейсами, студенты сдают решения — код запускается в изолированном Docker-контейнере и проверяется автоматически. Учитель видит результаты и может выставить оценку.

До продакшена далеко, куча багов, не секьюрно
Приложение больше вайбкодилось и разрабатывалось только верхнеуровнево

По поводу кубера и подов, если так случится, что будет найм, то это же приложение конкретный модуль с sandbox перепишу на работу с kubernetes, а пока докерами довольствуемся

За час я бы текущее навайбкоженную прилу точно бы не написал с ии, ибо потратил на это все около 7 часов

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
docker compose up --build -d
```

Образ nginx собирается multi-stage: внутри билдится статика frontend и копируется в nginx вместе с конфигом. Nginx отдаёт SPA на [http://localhost](http://localhost) и проксирует `/api/*` на core-backend. Остановка — обычная `docker compose down`.

## Пример: задача и решение

**Модель ввода-вывода:** решение ученика запускается как самостоятельный скрипт. Входные данные тест-кейса подаются в **stdin**, а вывод программы из **stdout** сравнивается с ожидаемым (лишние пробелы по краям обрезаются).

> При старте `sandbox-service` заранее скачивает рантайм-образы (`python:3.12-alpine`, `node:24-alpine`) — поэтому первый запуск сервиса может занять чуть дольше. Зато решения не падают по таймауту из-за того, что время скачивания образа засчиталось бы в лимит выполнения задачи. Образы для запуска задач берутся только локально (`--pull never`).

### Задача (создаёт учитель)

| Поле | Значение |
|------|----------|
| Название | Сумма двух чисел |
| Описание | В одной строке через пробел даны два целых числа. Выведите их сумму. |
| Язык | `python` |
| Лимит времени | `5000` мс |
| Лимит памяти | `128` МБ |

Тест-кейсы:

| Ввод (stdin) | Ожидаемый вывод (stdout) | Скрытый |
|--------------|--------------------------|:-------:|
| `2 3` | `5` | — |
| `10 20` | `30` | — |
| `-5 5` | `0` | ✅ |

> Скрытые тест-кейсы не показываются ученику — он видит только открытые, но проверка идёт по всем.

### Решение (присылает ученик)

**Python:**

```python
a, b = map(int, input().split())
print(a + b)
```

Если бы у задачи был выбран язык `javascript`, решение читало бы stdin так:

```javascript
const [a, b] = require('fs').readFileSync(0, 'utf8').trim().split(' ').map(Number);
console.log(a + b);
```

Оба решения проходят все 3 тест-кейса — статус сдачи становится `passed`, после чего учитель может выставить оценку.

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
