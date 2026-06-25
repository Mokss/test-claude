# frontend

React SPA платформы iSmart. Ролевой интерфейс для учителей и учеников.

## Быстрый старт

```bash
npm install
npm run dev
```

Vite поднимает dev-сервер на `http://localhost:5173` с proxy `/api` → `http://localhost:3000`.
Требует запущенного `core-backend`. Проще через Docker Compose из корня монорепо:

```bash
docker compose up mongo rabbitmq core-backend
```

## Сборка

```bash
npm run build   # tsc --noEmit + vite build → dist/
```

В Docker Compose сборка запускается автоматически при `docker compose up --build`.

## Проверка типов

```bash
npm run typeCheck
```

## Стек

| Библиотека | Версия | Роль |
|------------|--------|------|
| React | 19 | UI |
| Vite | 6 | Bundler + dev server |
| React Router | 7 | Роутинг |
| TanStack Query | 5 | Server state (fetch, cache, polling) |
| Zustand | 5 | Client state (auth token, user) |
| Monaco Editor | 4 | Редактор кода |
| Tailwind CSS | 4 | Стили |

## Роутинг

| Путь | Роль | Описание |
|------|------|----------|
| `/login` | any | Вход |
| `/register` | any | Регистрация |
| `/student` | student | Список задач |
| `/student/tasks/:id` | student | Задача + отправка решения |
| `/student/submissions/:id` | student | Детали решения |
| `/teacher` | teacher | Список задач (CRUD) |
| `/teacher/tasks/:id` | teacher | Создание / редактирование задачи |
| `/teacher/students` | teacher | Список учеников |
| `/teacher/students/:studentId` | teacher | Статистика ученика + его решения |
| `/teacher/submissions/:id` | teacher | Просмотр и оценка решения |
