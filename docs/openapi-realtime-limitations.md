# 📚 OpenAPI и Real-time протоколы: ограничения документации

## 🤔 Почему WebSocket и SSE показываются как REST API?

### Ограничения OpenAPI 3.0

OpenAPI Specification (ранее известная как Swagger) была разработана для документирования REST API и имеет следующие ограничения:

1. **Нет нативной поддержки WebSocket**
   - OpenAPI 3.0 не имеет специальных полей для описания WebSocket соединений
   - WebSocket использует другой протокол (ws://) вместо HTTP
   - Двунаправленная связь не укладывается в модель запрос-ответ

2. **Ограниченная поддержка SSE**
   - Server-Sent Events технически используют HTTP, но это streaming протокол
   - OpenAPI не может описать поток событий
   - Нет способа документировать различные типы событий

### Что происходит в нашем проекте

Когда мы определяем WebSocket эндпоинт в Elysia:

```typescript
.ws("/ws", {
  body: wsMessageSchema,
  // ...
})
```

OpenAPI плагин видит путь `/ws` и регистрирует его как обычный HTTP эндпоинт, потому что:
- Это единственный способ показать эндпоинт в документации
- Позволяет хотя бы задокументировать путь и схемы данных
- Дает возможность добавить описание

## 🛠️ Наши решения

### 1. Добавлены предупреждения в описания

```typescript
description: "⚠️ This is a WebSocket endpoint, not a REST API..."
```

### 2. GET эндпоинт с HTML документацией

При обращении к WebSocket эндпоинту через браузер показывается страница с инструкциями:
- http://localhost:3000/realtime/ws → HTML страница с документацией

### 3. Подробные описания в OpenAPI

Добавлены примеры кода и инструкции прямо в описания эндпоинтов.

## 🔮 Будущее: AsyncAPI

Для полноценной документации real-time API существует отдельная спецификация - **AsyncAPI**:

```yaml
asyncapi: 2.6.0
channels:
  /realtime/ws:
    subscribe:
      message:
        $ref: '#/components/messages/WebSocketMessage'
    publish:
      message:
        $ref: '#/components/messages/WebSocketResponse'
```

AsyncAPI специально разработана для:
- WebSocket
- Server-Sent Events
- Message Queues (Kafka, RabbitMQ)
- Другие асинхронные протоколы

## 📋 Рекомендации

### Для разработчиков API:
1. Всегда добавляйте предупреждения в описания real-time эндпоинтов
2. Создавайте отдельные страницы документации для WebSocket/SSE
3. Используйте примеры кода в описаниях
4. Рассмотрите использование AsyncAPI для полной документации

### Для пользователей API:
1. Обращайте внимание на протокол в примерах (ws:// vs http://)
2. Не пытайтесь тестировать WebSocket через Swagger UI
3. Используйте специальные инструменты:
   - `wscat` для WebSocket
   - `curl` с правильными заголовками для SSE
   - Браузерные DevTools

## 🔗 Полезные ссылки

- [OpenAPI Specification](https://swagger.io/specification/)
- [AsyncAPI Specification](https://www.asyncapi.com/)
- [WebSocket Protocol RFC](https://datatracker.ietf.org/doc/html/rfc6455)
- [Server-Sent Events W3C](https://www.w3.org/TR/eventsource/)
