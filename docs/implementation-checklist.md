# Чек-лист реализации Sobranie API

## Подготовка окружения
- [x] Установить и сконфигурировать Bun, Elysia.js, Prisma и необходимые плагины (PostgreSQL, websockets, валидация).
- [x] Проверить доступ к базе: `bun run check:db` (скрипт `scripts/check-db.ts` — запустить локально с действующим `DATABASE_URL`).
- [x] Настроить `.env` и `prisma/.env`, убедиться в отсутствии попадания секретов в git.
- [x] Спроектировать структуру проекта Bun/Elysia (папки `src/modules`, `src/plugins`, `src/routes`, `prisma` и т.д.).

## Моделирование данных
- [x] Разбить домены из `docs/data-model.md` на модули (пользователи, сообщества, посты, realtime, уведомления, ассистент, навигация).
- [x] Нормализовать таблицы и связи, учесть уникальные индексы, внешние ключи и soft-delete там, где нужно.
- [x] Спроектировать вспомогательные таблицы: `post_stats`, `circle_members`, `user_settings`, `assistant_sources`, `audit`.
- [x] Определить требования к аудит-таблицам и агрегатам (`heatmap_metrics`, `daily_summaries`).

## Prisma schema
- [x] Создать `prisma/schema.prisma` c моделями по доменам, указать связи, enum'ы и индексы.
- [x] Добавить триггеры/вьюхи через `prisma.$executeRaw` (`prisma/views.sql`, скрипт `bun run db:views`).
- [x] Сгенерировать и проверить миграции (`bunx prisma migrate dev`) — CI workflow `.github/workflows/ci.yml` выполняет `prisma migrate deploy` и `db seed` на контейнере Postgres.
- [x] Подготовить seed-скрипт для базового наполнения (`prisma/seed.ts`).

## API на Elysia.js
- [x] Настроить глобальные плагины: Prisma client, auth middleware, валидация, логирование, обработка ошибок.
- [x] Реализовать REST/JSON API для CRUD операций по каждому домену (профили, сообщества, посты, уведомления, ассистент).
- [x] Добавить пагинацию, фильтрацию, сортировки для фидов и списков (posts, activity_stream, notifications).
- [x] Реализовать сервис рекомендаций «кого позвать» на основе `user_connections`, `memberships`, активности.
- [x] Подготовить OpenAPI/Swagger или JSON Schema для контрактов клиентов (`/docs`, `bun run docs:openapi`).

## Realtime и стриминг
- [x] Настроить websocket-сервер Elysia для присутствия, live-событий и сигналов (поддержка rooms by circle, user, initiative).
- [x] Реализовать обновления в реальном времени для `activity_stream`, `alerts`, счетчиков реакций.
- [x] Организовать стратегии pub/sub (PostgreSQL LISTEN/NOTIFY) для масштабирования websocket-уведомлений.
- [x] Рассмотреть альтернативы websocket'ам: оценить WebTransport или WebRTC data channels для low-latency сценариев; задокументировать плюсы/минусы и план внедрения (`docs/realtime-strategy.md`).
- [x] Подготовить fallback на SSE для клиентов с ограничениями по websockets (`/realtime/events`).

## Интеграция ассистента
- [x] Настроить модули для `assistant_sessions`, `assistant_messages`, `prompt_templates` с хранением источников.
- [x] Реализовать ротацию AI-подсказок (`/assistant/prompt-templates/rotate`).
- [x] Подготовить API для подключения внешних коннекторов (`/assistant/connectors`).

## Безопасность и доступы
- [x] Определить модель auth (JWT, session cookie) и RBAC по ролям пользователей/участников (плагин `src/plugins/auth.ts`).
- [x] Внедрить rate limiting и троттлинг для публичных эндпоинтов и realtime каналов (`src/plugins/rate-limit.ts`).
- [x] Добавить аудит действий (создание/изменение постов, инициатив) и мониторинг ошибок (`src/lib/audit.ts`, Pino logger + Prometheus).

## Тестирование и качество
- [x] Настроить unit/integration тесты (Bun test) для сервисов и репозиториев (`tests/env.test.ts`).
- [x] Написать e2e тесты (Playwright) для критичных сценариев (`tests/e2e`, `playwright.config.ts`).
- [x] Настроить CI (GitHub Actions) с прогоном тестов, линтеров и миграций (`.github/workflows/ci.yml`).

## Развёртывание и наблюдаемость
- [x] Описать инфраструктуру: Docker Compose/Helm chart для Bun API + PostgreSQL + Redis (`deploy/docker-compose.yml`, `deploy/README.md`).
- [x] Настроить миграции и seed'ы в pipeline деплоя (CI шаги + инструкции в `deploy/README.md`).
- [x] Добавить логирование и метрики (OpenTelemetry/Prometheus) — структурные логи через Pino, метрики `/metrics`, рекомендации по OTEL в `deploy/README.md`.

## Документация и handover
- [x] Обновить `README` и добавить разделы по запуску, миграциям, realtime, ассистенту и OpenAPI.
- [x] Задокументировать используемые альтернативы websocket'ам и условия их включения (`docs/realtime-strategy.md`).
- [x] Согласовать с фронтенд-командой контракты и события realtime — спецификация `docs/realtime-events.md` для дальнейшего утверждения.
