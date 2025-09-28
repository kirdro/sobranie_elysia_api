# 📊 Анализ проекта Sobranie API

## 🏗️ Архитектура проекта

### Технологический стек:
- **Runtime**: Bun 1.2.20
- **Framework**: Elysia.js 1.4.8
- **ORM**: Prisma 5.17.0
- **База данных**: PostgreSQL (внешняя)
- **Язык**: TypeScript
- **Авторизация**: JWT (jose)
- **Real-time**: WebSocket (встроенный) + SSE

### Структура проекта:
```
sobranie_elysia_api/
├── src/
│   ├── index.ts          # Точка входа
│   ├── app.ts            # Создание приложения
│   ├── config/
│   │   └── env.ts        # Конфигурация окружения
│   ├── plugins/
│   │   ├── auth.ts       # JWT авторизация
│   │   ├── prisma.ts     # База данных
│   │   ├── logger.ts     # Логирование (pino)
│   │   └── rate-limit.ts # Ограничение запросов
│   └── modules/
│       ├── auth/         # Регистрация/вход
│       ├── users/        # Управление пользователями
│       ├── posts/        # Посты
│       ├── circles/      # Группы/круги
│       ├── notifications/# Уведомления
│       ├── realtime/     # WebSocket + SSE
│       ├── assistant/    # AI ассистент
│       └── navigation/   # Навигация
├── prisma/
│   └── schema.prisma     # 40 моделей БД
├── docs/                 # Документация
└── scripts/              # Вспомогательные скрипты
```

## 📦 Основные зависимости:
- `elysia` - веб-фреймворк
- `@elysiajs/cors` - CORS поддержка
- `@elysiajs/openapi` - OpenAPI документация
- `@prisma/client` - ORM
- `jose` - JWT токены
- `pino` - логирование
- `dotenv` - переменные окружения
- `zod` - валидация

## 🔌 API модули:

### 1. **Auth** (`/auth`)
- POST `/auth/register` - регистрация
- POST `/auth/login` - вход
- GET `/auth/me` - профиль
- POST `/auth/change-password` - смена пароля
- POST `/auth/logout` - выход

### 2. **Users** (`/users`)
- GET `/users` - список пользователей
- GET `/users/:id` - детали пользователя

### 3. **Posts** (`/posts`)
- GET `/posts` - список постов
- POST `/posts` - создание поста

### 4. **Circles** (`/circles`)
- GET `/circles` - список кругов
- GET `/circles/:id` - детали круга

### 5. **Notifications** (`/notifications`)
- GET `/notifications` - список уведомлений
- PUT `/notifications/:id/read` - отметить прочитанным

### 6. **Real-time** (`/realtime`)
- WS `/realtime/ws` - WebSocket соединение
- SSE `/realtime/events` - Server-Sent Events
- GET `/realtime/health` - статус real-time сервисов

### 7. **Assistant** (`/assistant`)
- GET `/assistant/modes` - режимы AI
- POST `/assistant/sessions` - создание сессии

### 8. **Navigation** (`/navigation`)
- GET `/navigation/links` - навигационные ссылки

## 🔐 Безопасность:
- JWT авторизация (HS256)
- Хеширование паролей (bcrypt)
- CORS настроен
- Rate limiting готов к использованию

## 📊 База данных:
- **Внешняя PostgreSQL**: 109.196.100.98:5432
- **40 таблиц** включая:
  - users (пользователи)
  - teams (команды)
  - posts (посты)
  - circles (круги/группы)
  - notifications (уведомления)
  - И многие другие...

## 🌐 Real-time функции:
- **WebSocket**: чат, присутствие, подписки
- **SSE**: уведомления, обновления ленты
- Готова к масштабированию через Redis

## 📚 Документация:
- OpenAPI/Swagger UI: `/openapi`
- JSON спецификация: `/openapi/json`
- Подробная документация в `/docs`

## 🚀 Особенности для деплоя:
1. Требуется Bun runtime
2. PostgreSQL база данных (внешняя)
3. Переменные окружения:
   - DATABASE_URL
   - JWT_SECRET
   - PORT (по умолчанию 3000)
   - HOST (по умолчанию 0.0.0.0)
4. Поддержка hot reload в dev режиме
5. Production ready с логированием
