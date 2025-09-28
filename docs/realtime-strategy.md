# Стратегия realtime-общения Sobranie

## WebSocket (текущая реализация)
- Встроенная поддержка через `@elysiajs/websocket`.
- Каналы присутствия `realtime/presence/:userId`, широковещательный канал `/broadcast`.
- Pub/Sub поверх PostgreSQL LISTEN/NOTIFY (`plugin.pubsub.ts`) для масштабирования нескольких инстансов API.
- SSE-fallback `/realtime/events` для клиентов, которым недоступен WebSocket.

## Альтернативы и развитие
1. **WebTransport (HTTP/3, UDP)**
   - Плюсы: низкая задержка, встроенные датаграммы, автоматический контроль потока.
   - Минусы: требуется инфраструктура с поддержкой HTTP/3 + TLS 1.3 (например, Fly.io / Cloudflare), поддержки браузерами пока набирает обороты.
   - План: инкапсулировать транспорт в слое `src/modules/realtime`, добавить адаптер WebTransport и переключатель на уровне конфигурации. Создать эндпоинт `/realtime/transport/webtransport` и протокол handshake через `POST` + `sessionId`.

2. **WebRTC DataChannels**
   - Плюсы: p2p, очень низкая задержка, возможность mesh или SFU.
   - Минусы: необходим сигнальный сервер, сложнее авторизация/скейлинг, ограничение корпоративных сетей.
   - План: использовать WebRTC для high-frequency сигналов (например, лайв-реакции). Поднять сигнальный endpoint в Elysia (`/realtime/webrtc/offer`), авторизовать через JWT.

3. **Server-Sent Events (внедрено как fallback)**
   - Используется для критичных уведомлений и «живой» навигации.
   - Поток `/realtime/events` фанат кроссплатформенной совместимости.

## Рекомендации
- В production включить Redis pub/sub (или PgBouncer + сторонний канал), расширив `plugin.pubsub.ts` стратегией `REDIS_URL`.
- Для WebTransport протестировать через Cloudflare Tunnel / `bun` experimental server.
- Хранить сессии realtime в `presenceRooms` и синхронизировать их через pub/sub для sticky-less балансировщиков.
