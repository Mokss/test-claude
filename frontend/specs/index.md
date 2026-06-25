# frontend specs

Читай в таком порядке:

1. **[architecture.md](architecture.md)** — структура файлов, роутинг, стейт-менеджмент, взаимодействие с API

## Быстрый старт

```bash
# dev-сервер (proxy /api → localhost:3000)
cd frontend
npm install
npm run dev

# проверить типы
npm run typeCheck

# production-сборка
npm run build

# запустить через Docker Compose (собирает SPA в volume, nginx раздаёт статику)
docker compose up --build frontend nginx
```

## Текущий статус

| Слой | Статус |
|------|--------|
| Конфигурация (Vite, TS, Tailwind) | ✅ готово |
| API клиент (`src/api/`) | ✅ готово |
| Auth store (Zustand + persist) | ✅ готово |
| Layout, ProtectedRoute, CodeEditor, StatusBadge | ✅ готово |
| Auth страницы (Login, Register) | ✅ готово |
| Student страницы (TaskList, TaskDetail, SubmissionDetail) | ✅ готово |
| Teacher страницы (TaskList, TaskForm, StudentList, StudentDetail, GradeSubmission) | ✅ готово |
| Dockerfile | ✅ готово |
