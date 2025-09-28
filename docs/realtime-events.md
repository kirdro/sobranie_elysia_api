# Realtime события Sobranie API

## Каналы
- `presence:{userId}` — обновления статуса пользователя.
- `post:stats` — обновления счетчиков поста `{ postId, stats }`.
- `post:comment` — новые комментарии `{ postId, commentId }`.
- `activity:stream` — статусы активностей `type: activity:new|activity:update`.
- `alerts` — новые алерты `type: alert:new`.

## Соглашения
- Все payload'ы JSON и содержат `type`.
- WebSocket URL: `wss://api.sobranie.app/realtime/broadcast/{channel}`.
- SSE fallback: `GET /realtime/events`, фильтрация каналов на клиенте.
- Поддержка аутентифицированных каналов: JWT в `Authorization` при открытии WS (custom header `x-access-token`).

## TODO для фронтенда
- Подтвердить mapping событий на Redux/SignalR слой.
- Проверить требуемую частоту обновления heatmap (< 5 c).
- Согласовать структуру сообщений ассистента (rich text vs markdown).
