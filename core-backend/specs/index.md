# core-backend specs

Читай в таком порядке:

1. **[architecture.md](architecture.md)** — структура папок, domain модели, все порты и сервисы, что написано / что нет
2. **[api.md](api.md)** — HTTP эндпоинты, request/response тела, коды ошибок
3. **[events.md](events.md)** — RabbitMQ exchanges, форматы сообщений, как слушать/публиковать

## Быстрый старт

```bash
# запустить тесты (без Docker)
cd core-backend
node --experimental-strip-types --test 'src/**/*.test.ts'

# проверить типы
npm run typeCheck
```

## Текущий статус

| Слой | Статус |
|------|--------|
| Domain + Ports | ✅ готово |
| Services (core) | ✅ 42/42 тестов |
| HTTP routes (app.inject) | ✅ 20/20 тестов |
| MongoDB адаптеры | ✅ готово |
| RabbitMQ адаптер | ✅ готово |
| Fastify HTTP роуты | ✅ готово |
| app.ts / server.ts | ✅ готово |
