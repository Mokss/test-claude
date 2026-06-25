# notification-service — архитектура

## Схема потока

```
RabbitMQ
  exchange: notify (topic)
  routing key: notify.teacher
       ↓
  [consumer.ts]  — parse JSON → NotifyTeacherEvent
       ↓
  [mailer.ts]    — sendTeacherNotification()
       ↓
  SMTP → email учителю
```

## Контракт события (входящее)

Exchange `notify`, routing key `notify.teacher`:

```ts
interface NotifyTeacherEvent {
  teacherId: string;
  teacherEmail: string;
  studentName: string;
  taskTitle: string;
  submissionId: string;
  status: 'passed' | 'failed';
}
```

## Надёжность

- `channel.prefetch(1)` — обрабатываем по одному сообщению
- Manual ack после успешной отправки email
- При ошибке — `nack` без requeue (не зацикливаем)

## Email шаблон

**Subject:** `[iSmart] {studentName} — «{taskTitle}»`

**Body:**
```
Студент {studentName} сдал(а) / не прошёл(а) тесты задание «{taskTitle}».

Посмотреть решение: /submissions/{submissionId}
```

## Расширяемость

Архитектура позволяет добавить `notification-push-service` без изменения core-backend:
достаточно нового сервиса, подписанного на `notify.push` (или `notify.*`).
