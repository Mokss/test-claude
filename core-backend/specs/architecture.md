# core-backend — архитектура

## Гексагональная (Ports & Adapters)

```
src/
  core/                      # нет зависимостей на Fastify / MongoDB / RabbitMQ
    domain/                  # чистые типы данных
    ports/
      input/                 # интерфейсы use-case-ов (входные порты)
      output/                # интерфейсы репозиториев и шины (выходные порты)
    services/                # реализации use-case-ов + тесты
  adapters/                  # (ещё не написаны)
    primary/http/            # Fastify роуты → вызывают input ports
    secondary/mongo/         # реализации output ports (MongoDB)
    secondary/amqp/          # реализация IEventBus (RabbitMQ)
  app.ts                     # DI: собираем всё вместе (composition root)
  server.ts                  # точка входа: listen
```

**Правило:** `core/` не знает о фреймворках. Тесты запускаются без Docker.

---

## Domain (`core/domain/`)

### `user.ts`
```ts
UserRole = 'teacher' | 'student'
User { _id, email, passwordHash, role, name, teacherId?, createdAt }
UserPublic = Pick<User, '_id' | 'email' | 'role' | 'name'>
toPublic(user): UserPublic   // убирает passwordHash
```
- `teacherId` обязателен для `role === 'student'`

### `task.ts`
```ts
Language = 'python' | 'javascript'
TaskStatus = 'draft' | 'published'
TestCase { input, expectedOutput, isHidden }
Task { _id, title, description, language, authorId, starterCode,
       testCases, timeLimitMs, memoryLimitMb, status, createdAt, updatedAt }
```

### `submission.ts`
```ts
SubmissionStatus = 'pending' | 'passed' | 'failed' | 'timeout' | 'error'
TestResult { passed, input, expectedOutput, actualOutput, durationMs }
SandboxResult { status, stdout, stderr, durationMs, testResults, passedCount, totalCount }
Grade { score(0-100), comment?, gradedAt, gradedBy }
Submission { _id, taskId, studentId, code, language, status,
             sandboxResult?, grade?, submittedAt }
```

---

## Input Ports (`core/ports/input/`)

### `auth-use-case.ts` → `IAuthUseCase`
```
register(RegisterInput) → AuthResult    // { token, user: UserPublic }
login(LoginInput)       → AuthResult
```
- `register`: бросает `EMAIL_TAKEN`, `TEACHER_ID_REQUIRED`
- `login`: бросает `INVALID_CREDENTIALS`

### `task-use-case.ts` → `ITaskUseCase`
```
listForTeacher(authorId)                       → Task[]   // все, включая draft
listForStudent(teacherId, studentId)           → Task[]   // только published, без isHidden тест-кейсов
getById(id, requesterId, requesterRole)        → Task     // student не видит draft → NOT_FOUND
create(CreateTaskInput)                        → Task     // status='draft' по умолчанию
update(id, authorId, UpdateTaskInput)          → Task     // FORBIDDEN если не автор
delete(id, authorId)                           → void     // FORBIDDEN если не автор
```

### `submission-use-case.ts` → `ISubmissionUseCase`
```
submit(SubmitInput)                                      → Submission  // создаёт pending, шлёт SandboxRunEvent
getById(id, requesterId, requesterRole)                  → Submission  // student видит только своё
listByTask(taskId, requesterId, requesterRole)           → Submission[]
listByStudent(studentId, teacherId)                      → Submission[]
grade(GradeInput)                                        → Submission  // score 0-100, статус д.б. terminal
handleSandboxResult(submissionId, SandboxResult)         → void        // обновляет статус, шлёт NotifyTeacherEvent
```
- `submit`: бросает `NOT_FOUND` (нет задачи), `FORBIDDEN` (задача не published)
- `grade`: бросает `INVALID_SCORE`, `NOT_FOUND`, `NOT_READY` (статус pending)
- `handleSandboxResult`: шлёт `NotifyTeacherEvent` только если у студента есть `teacherId`

---

## Output Ports (`core/ports/output/`)

### `user-repository.ts` → `IUserRepository`
```
findById(id)                   → User | null
findByEmail(email)             → User | null
findStudentsByTeacher(id)      → User[]
create(data)                   → User       // data = Omit<User, '_id' | 'createdAt'>
```

### `task-repository.ts` → `ITaskRepository`
```
findById(id)                          → Task | null
findByAuthor(authorId)                → Task[]
findPublishedByTeacher(teacherId)     → Task[]
create(data)                          → Task
update(id, TaskUpdateData)            → Task | null
delete(id)                            → boolean
```
`TaskUpdateData = Partial<Pick<Task, 'title' | 'description' | 'starterCode' | 'testCases' | 'timeLimitMs' | 'memoryLimitMb' | 'status'>>`

### `submission-repository.ts` → `ISubmissionRepository`
```
findById(id)                           → Submission | null
findByTask(taskId)                     → Submission[]
findByStudent(studentId)               → Submission[]
findByTaskAndStudent(taskId, studentId)→ Submission[]
create(data)                           → Submission
updateStatus(id, status, sandboxResult)→ Submission | null
updateGrade(id, grade)                 → Submission | null
```

### `event-bus.ts` → `IEventBus`
```
publishSandboxRun(SandboxRunEvent)         → void
publishNotifyTeacher(NotifyTeacherEvent)   → void
```
**События:**
- `SandboxRunEvent` → RabbitMQ exchange `sandbox` (direct) → sandbox-service
- `NotifyTeacherEvent` → RabbitMQ exchange `notify` (topic, key `notify.teacher`) → notification-service
- `SandboxResultEvent` — входящее от sandbox-service, обрабатывается через `handleSandboxResult`

---

## Domain (`core/domain/stats.ts`)
```ts
TaskStat { taskId, taskTitle, attempts, bestStatus: SandboxStatus, grade? }
StudentStats { studentId, totalSubmissions, passedCount, failedCount,
               averageScore?, averageDurationMs?, taskStats: TaskStat[] }
```

### `stats-use-case.ts` → `IStatsUseCase`
```
getStudentStats(studentId, teacherId) → StudentStats
```
- `passedCount` / `failedCount` — только terminal статусы (`passed | failed | timeout | error`)
- `averageScore` — среднее только по решениям с выставленной оценкой
- `averageDurationMs` — среднее `sandboxResult.durationMs` по решениям с результатом
- `taskStats.bestStatus` — лучший из всех попыток (passed > failed > timeout > error)
- `taskStats.grade` — grade из последнего оценённого решения по задаче

---

## Services (`core/services/`)

| Файл | Зависимости | Тестов |
|------|------------|--------|
| `auth.service.ts` | `IUserRepository`, `SignFn` | 7 |
| `task.service.ts` | `ITaskRepository`, `IUserRepository` | 13 |
| `submission.service.ts` | `ISubmissionRepository`, `ITaskRepository`, `IUserRepository`, `IEventBus` | 15 |
| `stats.service.ts` | `ISubmissionRepository`, `ITaskRepository` | 7 |

`SignFn = (payload: object) => Promise<string>` — JWT sign инжектируется снаружи (в тестах — стаб).

Все 42 теста запускаются без инфраструктуры:
```bash
cd core-backend
node --experimental-strip-types --test 'src/core/services/*.test.ts'
```

---

## Secondary Adapters — MongoDB (`adapters/secondary/mongo/`)

Каждый адаптер принимает `Db` в конструктор и реализует соответствующий output port.

| Файл | Реализует | Коллекция |
|------|-----------|-----------|
| `user.repository.ts` | `IUserRepository` | `users` |
| `task.repository.ts` | `ITaskRepository` | `tasks` |
| `submission.repository.ts` | `ISubmissionRepository` | `submissions` |
| `indexes.ts` | — | создаёт все индексы при старте |

**Паттерн:** MongoDB хранит `_id: ObjectId`, domain оперирует `_id: string`.
Каждый адаптер конвертирует через `toUser` / `toTask` / `toSubmission` (doc → domain).
`ObjectId.isValid(id)` проверяется перед запросом — некорректный id возвращает `null / false` без исключения.

**Индексы:**
- `users`: `email` (unique), `teacherId`
- `tasks`: `{ authorId, status }`, `createdAt desc`
- `submissions`: `taskId`, `studentId`, `{ taskId, studentId }`, `submittedAt desc`

**Запуск в проде:** `node --experimental-strip-types src/server.ts` (без компиляции, Node 24).
**Проверка типов:** `npm run typeCheck` → `tsc --noEmit`.

---

## Secondary Adapters — RabbitMQ (`adapters/secondary/amqp/`)

| Файл | Назначение |
|------|-----------|
| `setup.ts` | `createChannel(url)` — подключение, объявление exchanges/queues/bindings |
| `event-bus.ts` | `AmqpEventBus implements IEventBus` — публикует `SandboxRunEvent`, `NotifyTeacherEvent` |
| `consumer.ts` | `startSandboxResultConsumer(channel, submissions)` — слушает `sandbox.result` |

**Константы в `setup.ts`:** `EXCHANGE_SANDBOX='sandbox'`, `EXCHANGE_NOTIFY='notify'`,
`ROUTING_SANDBOX_RUN`, `ROUTING_SANDBOX_RESULT`, `ROUTING_NOTIFY_TEACHER`

**Надёжность:**
- Публикация: `persistent: true` (delivery mode 2)
- Consumer: ручной `ack` после успеха, `nack(requeue=false)` при ошибке или невалидном JSON

Подробнее про форматы сообщений → [events.md](events.md)

---

## Primary Adapter — HTTP (`adapters/primary/http/`)

| Файл | Назначение |
|------|-----------|
| `errors.ts` | `registerErrorHandler` — маппинг строк ошибок сервисов в HTTP статусы |
| `auth-hook.ts` | `requireAuth`, `requireTeacher`, `requireStudent` — preHandler хуки; аугментация `FastifyJWT` |
| `routes/auth.routes.ts` | POST `/api/auth/register`, POST `/api/auth/login` |
| `routes/task.routes.ts` | CRUD `/api/tasks`, GET `/api/tasks/:id` |
| `routes/submission.routes.ts` | POST/GET `/api/tasks/:taskId/submissions`, GET/PATCH `/api/submissions/:id`, GET `/api/students/:studentId/submissions` |
| `routes/stats.routes.ts` | GET `/api/students/:studentId/stats` |
| `routes/internal.routes.ts` | POST `/api/internal/sandbox-result` (без JWT, только Docker-сеть) |

**JWT payload:** `{ sub: userId, role, teacherId? }` — `teacherId` нужен чтобы student мог получить задачи своего учителя без лишнего запроса в БД.

**Маппинг ошибок:**
```
EMAIL_TAKEN / TEACHER_ID_REQUIRED / INVALID_SCORE → 400
INVALID_CREDENTIALS → 401
FORBIDDEN → 403
NOT_FOUND → 404
NOT_READY → 409
```

Подробнее про эндпоинты → [api.md](api.md)

---

## Composition Root

### `app.ts` — `buildApp(services, jwtSecret)`
Принимает готовые экземпляры use-case-ов, регистрирует JWT-плагин, error handler, все роуты. Возвращает Fastify-инстанс.

### `server.ts` — точка входа
1. Подключение к MongoDB + `ensureIndexes`
2. Подключение к RabbitMQ + `createChannel`
3. Создание репозиториев и `AmqpEventBus`
4. Lazy `SignFn` через Promise (разрешается после `app.ready()`)
5. Создание сервисов → `buildApp` → `app.ready()` → резолв sign → `startSandboxResultConsumer` → `listen`

---

## Что ещё не написано

~~Всё написано для core-backend.~~ Переходим к смежным сервисам:
- `sandbox-service/` — выполнение кода в изоляции
- `notification-service/` — отправка email учителю
- `frontend/` — React SPA

---

## Переменные окружения

```
MONGO_URL=mongodb://mongo:27017/ismart
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
JWT_SECRET=...
PORT=3000
```
