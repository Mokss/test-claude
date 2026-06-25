# sandbox-service specs

Читай в таком порядке:

1. **[architecture.md](architecture.md)** — структура файлов, флоу выполнения, харнес, изоляция Docker

## Быстрый старт

```bash
# запустить тесты (без Docker, нужны python3 и node локально)
cd sandbox-service
npm test

# проверить типы
npm run typeCheck

# запустить локально (нужен RabbitMQ)
RABBITMQ_URL=amqp://localhost:5672 npm start

# запустить через Docker Compose
docker compose up --build sandbox-service
```

## Текущий статус

| Слой | Статус |
|------|--------|
| types.ts | ✅ готово |
| harness.ts (Python + JS) | ✅ готово — **10/10 тестов** |
| runner.ts (Docker spawn) | ✅ готово |
| amqp/setup.ts | ✅ готово |
| amqp/consumer.ts | ✅ готово |
| amqp/publisher.ts | ✅ готово |
| server.ts | ✅ готово |
| Dockerfile | ✅ готово |
