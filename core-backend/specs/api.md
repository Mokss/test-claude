# HTTP API — core-backend

Base path: `/api`  
Auth: `Authorization: Bearer <jwt>` на всех роутах кроме `/auth/*`  
JWT payload: `{ sub: userId, role: 'teacher' | 'student' }`

---

## Auth

### POST `/api/auth/register`
Публичный. Регистрация нового пользователя.

**Body:**
```json
{ "email": "...", "password": "...", "name": "...", "role": "teacher|student", "teacherId": "..." }
```
- `teacherId` обязателен если `role === 'student'`

**Response 201:**
```json
{ "token": "...", "user": { "_id": "...", "email": "...", "role": "...", "name": "..." } }
```

**Ошибки:** `400 EMAIL_TAKEN`, `400 TEACHER_ID_REQUIRED`

---

### POST `/api/auth/login`
Публичный.

**Body:**
```json
{ "email": "...", "password": "..." }
```

**Response 200:**
```json
{ "token": "...", "user": { "_id": "...", "email": "...", "role": "...", "name": "..." } }
```

**Ошибки:** `401 INVALID_CREDENTIALS`

---

## Tasks

### GET `/api/tasks`
- **teacher** → все свои задачи (включая draft)  
- **student** → только published задачи своего учителя (без isHidden тест-кейсов)

**Response 200:** `Task[]`

---

### POST `/api/tasks`
Только **teacher**.

**Body:**
```json
{
  "title": "...", "description": "...", "language": "python|javascript",
  "starterCode": "...", "testCases": [{ "input": "...", "expectedOutput": "...", "isHidden": false }],
  "timeLimitMs": 5000, "memoryLimitMb": 128
}
```

**Response 201:** `Task` (status = `draft`)

---

### GET `/api/tasks/:id`
- **teacher** → видит любой статус и все тест-кейсы  
- **student** → только published, без isHidden тест-кейсов

**Response 200:** `Task`  
**Ошибки:** `404 NOT_FOUND`

---

### PATCH `/api/tasks/:id`
Только **teacher**-автор задачи.

**Body:** любые поля из `{ title, description, starterCode, testCases, timeLimitMs, memoryLimitMb, status }`

**Response 200:** `Task`  
**Ошибки:** `404 NOT_FOUND`, `403 FORBIDDEN`

---

### DELETE `/api/tasks/:id`
Только **teacher**-автор задачи.

**Response 204**  
**Ошибки:** `404 NOT_FOUND`, `403 FORBIDDEN`

---

## Submissions

### POST `/api/tasks/:taskId/submissions`
Только **student**.

**Body:**
```json
{ "code": "...", "language": "python|javascript" }
```

**Response 201:** `Submission` (status = `pending`)  
**Ошибки:** `404 NOT_FOUND`, `403 FORBIDDEN` (задача не published)

---

### GET `/api/tasks/:taskId/submissions`
- **teacher** → все решения по задаче  
- **student** → только свои

**Response 200:** `Submission[]`

---

### GET `/api/submissions/:id`
- **teacher** → любое решение  
- **student** → только своё

**Response 200:** `Submission`  
**Ошибки:** `404 NOT_FOUND`, `403 FORBIDDEN`

---

### GET `/api/students/:studentId/submissions`
Только **teacher**.

**Response 200:** `Submission[]`

---

### PATCH `/api/submissions/:id/grade`
Только **teacher**.

**Body:**
```json
{ "score": 90, "comment": "..." }
```
- `score`: 0–100

**Response 200:** `Submission`  
**Ошибки:** `400 INVALID_SCORE`, `404 NOT_FOUND`, `409 NOT_READY`

---

## Stats

### GET `/api/students/:studentId/stats`
Только **teacher**.

**Response 200:** `StudentStats`
```json
{
  "studentId": "...",
  "totalSubmissions": 10,
  "passedCount": 7,
  "failedCount": 2,
  "averageScore": 85,
  "averageDurationMs": 230,
  "taskStats": [
    {
      "taskId": "...", "taskTitle": "...",
      "attempts": 3, "bestStatus": "passed",
      "grade": { "score": 90, "comment": "...", "gradedAt": "...", "gradedBy": "..." }
    }
  ]
}
```

---

## Внутренний — Sandbox callback

### POST `/api/internal/sandbox-result`
Вызывается sandbox-service после завершения проверки.  
Не требует JWT — защищён сетью Docker (не проксируется через nginx).

**Body:**
```json
{ "submissionId": "...", "result": { ...SandboxResult } }
```

**Response 200**  
**Ошибки:** `404 NOT_FOUND`

---

## Коды ошибок

Все ошибки возвращаются в формате:
```json
{ "error": "ERROR_CODE", "message": "человекочитаемое описание" }
```

| Код | HTTP | Когда |
|-----|------|-------|
| `EMAIL_TAKEN` | 400 | Email уже зарегистрирован |
| `TEACHER_ID_REQUIRED` | 400 | Student без teacherId |
| `INVALID_CREDENTIALS` | 401 | Неверный email/пароль |
| `FORBIDDEN` | 403 | Нет прав на ресурс |
| `NOT_FOUND` | 404 | Ресурс не найден |
| `NOT_READY` | 409 | Submission ещё не проверен sandbox |
| `INVALID_SCORE` | 400 | score вне диапазона 0–100 |
