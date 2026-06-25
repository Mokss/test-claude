# notification-service — обзор

Микросервис для email-уведомлений учителей.

## Статус

**ПОЛНОСТЬЮ ГОТОВ**

## Стек

- Node 24 (`--experimental-strip-types`)
- amqplib — потребление сообщений из RabbitMQ
- nodemailer — отправка email через SMTP

## Что делает

1. Подключается к RabbitMQ
2. Слушает очередь `notify.teacher` (exchange `notify`, тип `topic`)
3. Для каждого события — отправляет email учителю через SMTP

## Файлы

```
src/
  types.ts         # NotifyTeacherEvent
  mailer.ts        # Mailer класс (nodemailer)
  amqp/
    setup.ts       # createChannel (declare exchange + queue)
    consumer.ts    # startConsumer
  server.ts        # точка входа
specs/
  index.md
  architecture.md
Dockerfile
package.json
tsconfig.json
```

## Переменные окружения

| Переменная   | Описание                        |
|--------------|---------------------------------|
| RABBITMQ_URL | amqp://rabbitmq:5672            |
| SMTP_HOST    | SMTP сервер                     |
| SMTP_PORT    | Порт (587 по умолчанию)         |
| SMTP_USER    | Логин SMTP                      |
| SMTP_PASS    | Пароль SMTP                     |

## Связанные спеки

- [events.md](../../core-backend/specs/events.md) — контракт `NotifyTeacherEvent`
- [architecture.md](architecture.md)
