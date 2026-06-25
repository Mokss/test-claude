# frontend — архитектура

## Назначение

React SPA, которое раздаётся через nginx как статика. Общается с `core-backend` через REST API (`/api/*`). Два ролевых интерфейса: **teacher** и **student**.

---

## Структура файлов

```
src/
  main.tsx              # точка входа: StrictMode + QueryClientProvider + BrowserRouter
  App.tsx               # роутинг: Routes, ProtectedRoute по роли
  index.css             # @import "tailwindcss"
  types.ts              # реэкспорт всех типов из @ismart/specs

  api/
    client.ts           # fetch-обёртка: Bearer-токен из store, ApiError
    auth.ts             # register(), login()
    tasks.ts            # list(), get(), create(), update(), delete()
    submissions.ts      # submit(), listByTask(), listByStudent(), get(), grade()
    students.ts         # list(), stats()

  store/
    auth.ts             # Zustand: { token, user, setAuth, logout } + localStorage persist

  components/
    Layout.tsx          # header (имя + роль + выход) + <Outlet />
    ProtectedRoute.tsx  # редирект на /login если нет токена; редирект по роли
    CodeEditor.tsx      # Monaco Editor (readOnly режим для просмотра)
    StatusBadge.tsx     # цветной badge по SubmissionStatus

  pages/
    auth/
      LoginPage.tsx     # форма входа → setAuth → редирект по роли
      RegisterPage.tsx  # форма регистрации (role select, teacherId если student)

    student/
      TaskListPage.tsx          # GET /api/tasks → список published задач учителя
      TaskDetailPage.tsx        # задача + Monaco + submit + список своих попыток (polling)
      SubmissionDetailPage.tsx  # детали попытки: тест-кейсы, оценка учителя (polling)

    teacher/
      TaskListPage.tsx          # GET /api/tasks → все свои задачи (draft + published) + удаление
      TaskFormPage.tsx          # создание и редактирование задачи (Monaco для starterCode)
      StudentListPage.tsx       # GET /api/students → список учеников; показывает teacherId учителя
      StudentDetailPage.tsx     # статистика ученика + все его решения
      SubmissionGradePage.tsx   # просмотр кода + результаты sandbox + форма оценки
```

---

## Роутинг

```
/login                           → LoginPage (public)
/register                        → RegisterPage (public)

/student                         → StudentTaskListPage      (role: student)
/student/tasks/:id               → StudentTaskDetailPage    (role: student)
/student/submissions/:id         → StudentSubmissionDetailPage (role: student)

/teacher                         → TeacherTaskListPage      (role: teacher)
/teacher/tasks/:id               → TeacherTaskFormPage      (role: teacher)  (:id = "new" для создания)
/teacher/students                → TeacherStudentListPage   (role: teacher)
/teacher/students/:studentId     → TeacherStudentDetailPage (role: teacher)
/teacher/submissions/:id         → TeacherSubmissionGradePage (role: teacher)

*                                → redirect /login
```

`ProtectedRoute` проверяет токен в Zustand-сторе. Если роль не совпадает — редиректит на `/teacher` или `/student`.

---

## Стейт-менеджмент

**Zustand** (`store/auth.ts`) — client state:
- `token` — JWT, передаётся в каждый запрос через `Authorization: Bearer`
- `user` — `UserPublic` (id, email, role, name)
- Персистится в `localStorage` через `zustand/middleware/persist`

**TanStack Query** — server state:
- Все данные с API кешируются, `staleTime: 30s`
- Polling через `refetchInterval`: активируется когда `submission.status === 'pending' | 'running'` (каждые 3 сек)
- Мутации (`useMutation`) инвалидируют связанные query-ключи

---

## API клиент

`src/api/client.ts` — тонкая обёртка над `fetch`:
- Автоматически добавляет `Authorization: Bearer <token>` из Zustand-стора
- При `!res.ok` бросает `ApiError(status, code, message)` — `code` из тела ответа (`{ error: "CODE" }`)
- `204 No Content` возвращает `undefined`

```
get<T>(path)
post<T>(path, body)
patch<T>(path, body)
del(path)
```

---

## Типы

Все типы берутся из воркспейс-пакета `@ismart/specs` (алиас в `vite.config.ts` → `../specs`). Дублирования нет — единый источник правды для всего монорепо.

---

## Сборка и деплой

```
Docker Compose:
  frontend (builder stage) → собирает dist/ → volume frontend-dist
  nginx → раздаёт frontend-dist как статику, проксирует /api/* → core-backend:3000
```

В dev-режиме Vite сам проксирует `/api` на `localhost:3000` (см. `vite.config.ts → server.proxy`).
