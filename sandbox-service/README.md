# sandbox-service

Сервис запуска кода в изоляции. Принимает задания из RabbitMQ, выполняет код студента в Docker-контейнере, возвращает результаты тест-кейсов.

Подробная документация: [specs/index.md](specs/index.md)

## Быстрый старт

```bash
npm install
npm start
```

Требует запущенного RabbitMQ. Проще через Docker Compose из корня монорепо:

```bash
docker compose up rabbitmq
```

## Тесты

```bash
# тесты харнеса (без Docker, без инфраструктуры)
npm test
```

10 тестов: Python + JS харнес (passed / failed / timeout / escaping / partial).

## Проверка типов

```bash
npm run typeCheck
```

## Переменные окружения

| Переменная | По умолчанию | Описание |
|------------|-------------|----------|
| `RABBITMQ_URL` | `amqp://localhost:5672` | Подключение к RabbitMQ |
