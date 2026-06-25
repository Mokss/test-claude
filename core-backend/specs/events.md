# Events — RabbitMQ контракты

## Exchanges

| Exchange | Тип | Назначение |
|----------|-----|------------|
| `sandbox` | direct | core-backend → sandbox-service |
| `notify` | topic | core-backend → notification-service |

---

## Исходящие события (core-backend публикует)

### `SandboxRunEvent`
**Exchange:** `sandbox` (direct)  
**Routing key:** `sandbox.run`  
**Очередь:** `sandbox.run` (sandbox-service слушает)

```json
{
  "submissionId": "string",
  "code": "string",
  "language": "python | javascript",
  "timeLimitMs": 5000,
  "memoryLimitMb": 128,
  "testCases": [
    { "input": "string", "expectedOutput": "string" }
  ]
}
```

Публикуется в `SubmissionService.submit()` сразу после создания submission.

---

### `NotifyTeacherEvent`
**Exchange:** `notify` (topic)  
**Routing key:** `notify.teacher`  
**Очередь:** `notify.teacher` (notification-service слушает)

```json
{
  "teacherId": "string",
  "studentName": "string",
  "taskTitle": "string",
  "submissionId": "string",
  "status": "passed | failed"
}
```

Публикуется в `SubmissionService.handleSandboxResult()` если у студента есть `teacherId`.

---

## Входящие события (core-backend потребляет)

### `SandboxResultEvent`
**Exchange:** `sandbox` (direct)  
**Routing key:** `sandbox.result`  
**Очередь:** `sandbox.result` (core-backend слушает)

```json
{
  "submissionId": "string",
  "result": {
    "status": "passed | failed | timeout | error",
    "stdout": "string",
    "stderr": "string",
    "durationMs": 123,
    "testResults": [
      {
        "passed": true,
        "input": "string",
        "expectedOutput": "string",
        "actualOutput": "string",
        "durationMs": 45
      }
    ],
    "passedCount": 1,
    "totalCount": 1
  }
}
```

Обрабатывается consumer'ом в `adapters/secondary/amqp/`.  
Вызывает `SubmissionService.handleSandboxResult(submissionId, result)`.

---

## Реализация в core-backend

### Файлы адаптера
```
adapters/secondary/amqp/
  event-bus.ts      # реализует IEventBus (publisher)
  consumer.ts       # слушает sandbox.result, вызывает handleSandboxResult
```

### Надёжность
- Сообщения публикуются с `persistent: true` (delivery mode 2)
- Consumer использует `ack` вручную после успешной обработки
- При ошибке обработки — `nack` с `requeue: false` (не зацикливаем)

### Подключение
```ts
const conn = await amqplib.connect(RABBITMQ_URL);
const channel = await conn.createChannel();

// Publisher
await channel.assertExchange('sandbox', 'direct', { durable: true });
await channel.assertExchange('notify', 'topic', { durable: true });

// Consumer
await channel.assertQueue('sandbox.result', { durable: true });
await channel.bindQueue('sandbox.result', 'sandbox', 'sandbox.result');
channel.consume('sandbox.result', handler);
```
