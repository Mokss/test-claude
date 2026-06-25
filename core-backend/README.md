# core-backend

Основной сервис платформы iSmart. Гексагональная архитектура — бизнес-логика не зависит от фреймворков.

Подробная документация: [specs/index.md](specs/index.md)

## Быстрый старт

```bash
npm install
npm run dev
```

Требует запущенных MongoDB и RabbitMQ. Проще через Docker Compose из корня монорепо:

```bash
docker compose up mongo rabbitmq
```

## Тесты

```bash
# все тесты (без Docker, без инфраструктуры)
node --experimental-strip-types --test 'src/**/*.test.ts'
```

75 тестов: 42 на бизнес-логику (services), 33 на HTTP роуты (app.inject).

## Проверка типов

```bash
npm run typeCheck
```

## Переменные окружения

| Переменная | По умолчанию | Описание |
|------------|-------------|----------|
| `MONGO_URL` | `mongodb://mongo:27017/ismart` | Подключение к MongoDB |
| `RABBITMQ_URL` | `amqp://guest:guest@rabbitmq:5672` | Подключение к RabbitMQ |
| `JWT_SECRET` | `change-me-in-production` | Секрет для подписи JWT |
| `PORT` | `3000` | Порт HTTP сервера |
