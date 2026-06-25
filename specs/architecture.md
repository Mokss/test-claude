# Архитектура iSmart

## Схема

```
Client (Browser)
    ↓ HTTPS
  nginx
    ├── /                → static (React SPA)
    └── /api/*           → core-backend (Node.js)

core-backend
    ├── MongoDB          (пользователи, задачи, решения, оценки)
    └── RabbitMQ
          ├── exchange: sandbox   → sandbox-service
          └── exchange: notify    → notification-email-service
                                  → notification-push-service
                                  → ... (любые новые сервисы уведомлений)
```

## RabbitMQ: exchanges и routing keys

| Exchange   | Type   | Routing Key           | Получатель                  |
|------------|--------|-----------------------|-----------------------------|
| `sandbox`  | direct | `sandbox.run`         | sandbox-service             |
| `sandbox`  | direct | `sandbox.result`      | core-backend                |
| `notify`   | topic  | `notify.email`        | notification-email-service  |
| `notify`   | topic  | `notify.push`         | notification-push-service   |
| `notify`   | topic  | `notify.*`            | любой новый notify-сервис   |

core-backend публикует событие → RabbitMQ маршрутизирует по routing key.
Чтобы добавить новый канал уведомлений — просто поднимаешь новый сервис и подписываешь его на `notify.*`. core-backend не трогаешь.

## Сервисы

### core-backend (Node.js)
- REST API для фронтенда (см. типы в `specs/types/`)
- Ролевая модель: teacher / student
- Бизнес-логика: задачи, решения, оценки, статистика
- Публикует `SandboxRunEvent`, принимает `SandboxResultEvent`
- Публикует `NotifyTeacherEvent`

### sandbox-service
- Принимает `SandboxRunEvent` из RabbitMQ (`sandbox.run`)
- Запускает код в изолированном Docker-контейнере
- Ограничения: timeLimitMs, memoryLimitMb, без сети, без доступа к FS хоста
- Поддерживаемые языки: Python, JavaScript (Node.js)
- Публикует `SandboxResultEvent` (`sandbox.result`) с результатами тест-кейсов

### notification-email-service
- Подписан на `notify.email`
- Отправляет email учителю когда ученик сдал задание

### notification-push-service (будущее)
- Подписан на `notify.push`
- Push-уведомления в браузер / мобильное приложение

## Модели данных (MongoDB)

| Коллекция     | Описание                         |
|---------------|----------------------------------|
| `users`       | Учителя и ученики                |
| `tasks`       | Задачи (с тест-кейсами внутри)  |
| `submissions` | Решения учеников + результаты    |

## API эндпоинты

| Метод  | Путь                                  | Роль    | Описание                        |
|--------|---------------------------------------|---------|---------------------------------|
| POST   | /api/v1/auth/register                 | any     | Регистрация                     |
| POST   | /api/v1/auth/login                    | any     | Вход                            |
| GET    | /api/v1/auth/me                       | any     | Текущий пользователь            |
| GET    | /api/v1/tasks                         | any     | Список задач                    |
| POST   | /api/v1/tasks                         | teacher | Создать задачу                  |
| GET    | /api/v1/tasks/:id                     | any     | Детали задачи                   |
| PATCH  | /api/v1/tasks/:id                     | teacher | Обновить задачу                 |
| DELETE | /api/v1/tasks/:id                     | teacher | Удалить задачу                  |
| POST   | /api/v1/tasks/:id/submissions         | student | Сдать решение                   |
| GET    | /api/v1/tasks/:id/submissions         | any     | Решения по задаче               |
| GET    | /api/v1/submissions/:id               | any     | Детали решения                  |
| PATCH  | /api/v1/submissions/:id/grade         | teacher | Оценить решение                 |
| GET    | /api/v1/students                      | teacher | Список своих учеников           |
| GET    | /api/v1/students/:id/submissions      | teacher | Все решения ученика             |
| GET    | /api/v1/students/:id/stats            | teacher | Статистика ученика              |

## Флоу: ученик сдаёт задание

```
Student → POST /tasks/:id/submissions
    ↓
core-backend создаёт Submission { status: 'pending' }
    ↓
RabbitMQ (sandbox.run) → sandbox-service
    ↓
sandbox-service запускает Docker-контейнер с кодом
    ↓
RabbitMQ (sandbox.result) → core-backend
    ↓
core-backend обновляет Submission { status, sandboxResult }
    ↓
RabbitMQ (notify.email) → notification-email-service → email учителю
```
