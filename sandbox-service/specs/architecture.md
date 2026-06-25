# sandbox-service — архитектура

## Назначение

Принимает `SandboxRunEvent` из RabbitMQ, запускает код студента в изолированном Docker-контейнере, публикует `SandboxResultEvent` с результатами тест-кейсов.

---

## Структура файлов

```
src/
  types.ts          # все типы: SandboxRunEvent, SandboxResultEvent, SandboxResult, TestResult
  harness.ts        # generatePythonHarness(), generateJsHarness() → string
  runner.ts         # runCode(event) → Promise<SandboxResult>
  amqp/
    setup.ts        # createChannel(url) — подключение, exchanges/queues/bindings
    consumer.ts     # startConsumer(channel, handler) — слушает sandbox.run
    publisher.ts    # AmqpPublisher.publishResult() — публикует sandbox.result
  server.ts         # точка входа: compose amqp + consumer + runner + publisher
```

---

## Флоу выполнения

```
RabbitMQ (sandbox.run)
    ↓ consumer.ts
runCode(event)              # runner.ts
    ↓
generateHarness()           # harness.ts — Python или JS скрипт со встроенным кодом студента
    ↓
docker run --rm -i \
  --network none \
  -m ${memoryLimitMb}m \
  --cpus 0.5 \
  ${image} ${interpreter} -
    ↓ (stdin = харнес)
stdout → JSON.parse()
    ↓
AmqpPublisher.publishResult()
    ↓
RabbitMQ (sandbox.result)   → core-backend
```

---

## Харнес (harness.ts)

**Проблема:** sandbox-service запущен в Docker. Когда он делает `docker run`, пути к файлам — это пути на хосте, а не внутри контейнера. Монтировать temp-файлы невозможно.

**Решение:** передавать харнес-скрипт целиком через `stdin` → `docker run -i ... python3 -` / `node -`.

Харнес генерируется динамически — код студента кодируется в base64 и встраивается в скрипт, чтобы избежать проблем с экранированием.

### Python harness
- Декодирует base64 → пишет `/tmp/solution.py`
- Для каждого test case: `subprocess.run(['python3', '/tmp/solution.py'], input=tc['input'], timeout=...)`
- Сравнивает `stdout.strip()` vs `expectedOutput.strip()`
- Выводит JSON в stdout

### JS harness
- Декодирует base64 → пишет `/tmp/solution.js`
- Для каждого test case: `spawnSync('node', ['/tmp/solution.js'], { input, timeout, encoding: 'utf8' })`
- Харнес сам использует CJS (`require`), студенческий код — тоже CJS (нет package.json в контейнере → node по умолчанию CJS)
- Выводит JSON в stdout

---

## Изоляция и ограничения

| Параметр | Значение |
|----------|----------|
| Сеть | `--network none` — нет исходящих запросов |
| Память | `-m ${memoryLimitMb}m` (из события, обычно 128m) |
| CPU | `--cpus 0.5` |
| Таймаут внутренний | `timeLimitMs` (python subprocess.timeout / spawnSync timeout) |
| Таймаут внешний | `timeLimitMs + 5000ms` → `SIGKILL` на docker-процессе |
| Docker образы | `python:3.12-alpine`, `node:24-alpine` |

---

## RabbitMQ

**Входящее** — `sandbox.run`:
```json
{
  "submissionId": "string",
  "code": "string",
  "language": "python | javascript",
  "timeLimitMs": 5000,
  "memoryLimitMb": 128,
  "testCases": [{ "input": "string", "expectedOutput": "string" }]
}
```

**Исходящее** — `sandbox.result`:
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

Exchange `sandbox` (direct). Consumer: ack после успеха, nack(requeue=false) при ошибке.

---

## Типы статусов SandboxResult

| Статус | Когда |
|--------|-------|
| `passed` | все тест-кейсы прошли |
| `failed` | хотя бы один тест-кейс не прошёл |
| `timeout` | внутренний таймаут в харнесе ИЛИ внешний kill docker |
| `error` | docker не запустился / харнес упал / невалидный JSON вывод |

---

## Переменные окружения

```
RABBITMQ_URL=amqp://rabbitmq:5672   # уже в docker-compose.yml
```

---

## Docker-in-Docker

sandbox-service монтирует `/var/run/docker.sock` (см. docker-compose.yml) и устанавливает `docker-cli` через `apk` в своём Dockerfile. Это позволяет вызывать `docker run` из Node.js через `child_process.spawn`.
