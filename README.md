# 🚀 Sobranie API (Bun + Elysia)

API-проект для социальной платформы «Собрание», построенный на Bun, Elysia.js и Prisma.

## 🌟 Основные возможности

- 🔐 **JWT авторизация** - регистрация, вход, управление сессиями
- 🔌 **WebSocket** - real-time чат, уведомления, статусы присутствия
- 📡 **Server-Sent Events** - потоковые обновления
- 📚 **OpenAPI/Swagger** - интерактивная документация API
- 🗄️ **PostgreSQL + Prisma** - типобезопасная работа с БД
- ⚡ **Bun Runtime** - быстрый JavaScript runtime
- 🐳 **Docker поддержка** - готов к контейнеризации
- 🔒 **Безопасность** - CORS, rate limiting, хеширование паролей

## Требования
- Bun v1.2+
- PostgreSQL 14+
- Node.js не требуется (используется Bun)

## Быстрый старт
1. Скопируйте `.env.example` в `.env` и задайте переменные окружения.
2. Установите зависимости:
   ```bash
   bun install
   ```
3. Запустите локальный сервер:
   ```bash
   bun run dev
   ```

## Полезные скрипты
- `bun run dev` — запуск API с hot-reload.
- `bun run start` — запуск без перезагрузки.
- `bun run build` — сборка в папку `dist`.
- `bun run check:db` — проверка подключения к базе данных.
- `bun run db:views` — применение SQL-скриптов из `prisma/sql/views.sql`.
- `bun run docs:openapi` — генерация OpenAPI-спеки в `docs/openapi.json`.
- `bun run migrate:dev` / `bun run migrate:deploy` — миграции Prisma.
- `bun run seed` — заполнение тестовыми данными (скрипт будет добавлен на этапе моделирования).
- `bun run lint` — запуск ESLint.
- `bun run test` — unit/integration тесты (настраиваются отдельно).
- `bun run test:e2e` — e2e тесты через Playwright.

### Docker
- `docker build -t sobranie-api .` — локальная сборка образа.
- `docker run --rm -p 3000:3000 --env-file .env sobranie-api` — запуск в контейнере.

## Структура проекта
```
src/
  app.ts             # Сборка приложения Elysia
  config/            # Конфигурация и парсинг env
  plugins/           # Плагины (Prisma, логгер, auth, rate limit)
  modules/           # Доменные модули (users, posts, circles и т.д.)
  index.ts           # Точка входа (listen)
prisma/
  schema.prisma      # Prisma-схема (в процессе моделирования)
  sql/views.sql      # SQL для вьюх и триггеров
scripts/             # Утилиты для миграций, документов и проверки БД
```

## 🚀 Деплой

Проект настроен для автоматического деплоя через GitHub Actions.

### Быстрый деплой:
1. Настройте GitHub Secrets (см. `deploy/README.md`)
2. Запустите на сервере: `bash <(curl -fsSL https://raw.githubusercontent.com/your-repo/main/deploy/setup-server.sh)`
3. Push в `main` ветку запускает автоматический деплой

### Production URLs:
- **API**: https://api.sobranie.yaropolk.tech
- **Docs**: https://api.sobranie.yaropolk.tech/openapi

Подробнее в [deploy/README.md](deploy/README.md)

## 📚 Документация

### API документация
- **OpenAPI UI**: http://localhost:3000/openapi (dev) / https://api.sobranie.yaropolk.tech/openapi (prod)
- **OpenAPI JSON**: http://localhost:3000/openapi/json

### Проектная документация
- Чеклист реализации: `docs/implementation-checklist.md`
- Модель данных: `docs/data-model.md`
- Реалтайм-стратегия: `docs/realtime-strategy.md`
- Спецификация событий: `docs/realtime-events.md`
- Авторизация: `docs/auth-implementation.md`
- Деплой: `deploy/README.md`

- GitHub Actions workflow: `.github/workflows/deploy.yml`

## Дальнейшие шаги
Следуйте чек-листу из `docs/implementation-checklist.md`: завершите моделирование данных, опишите схемы в Prisma, реализуйте доменные модули и realtime-каналы, добавьте тесты и CI/CD.
