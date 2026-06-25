# notification-service

Сервис email-уведомлений. Слушает события из RabbitMQ и отправляет письма учителям когда ученик сдаёт задание.

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
# тесты consumer'а (без RabbitMQ, без SMTP)
npm test
```

4 теста: ack при успехе, nack при невалидном JSON, nack при ошибке handler, игнорирование cancel.

## Проверка типов

```bash
npm run typeCheck
```

## Переменные окружения

| Переменная   | По умолчанию          | Описание                        |
|--------------|-----------------------|---------------------------------|
| `RABBITMQ_URL` | `amqp://localhost:5672` | Подключение к RabbitMQ        |
| `SMTP_HOST`  | `localhost`           | SMTP сервер                     |
| `SMTP_PORT`  | `587`                 | Порт SMTP                       |
| `SMTP_USER`  | —                     | Логин SMTP                      |
| `SMTP_PASS`  | —                     | Пароль SMTP                     |
