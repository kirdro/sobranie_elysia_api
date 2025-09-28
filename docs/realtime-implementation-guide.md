# 🚀 Руководство по внедрению Real-time функций в Sobranie

## 📋 Краткая сводка

Для социальной сети Sobranie рекомендуется использовать **гибридный подход**:

1. **WebSockets** - для двусторонней связи (чат, presence)
2. **Server-Sent Events (SSE)** - для односторонних обновлений (уведомления, лента)
3. **REST API** - для обычных операций

## ✅ Что уже реализовано

### 1. WebSocket модуль (`/realtime/ws`)
- ✅ Авторизация через JWT
- ✅ Подписка на каналы
- ✅ Отправка сообщений
- ✅ Индикаторы набора текста
- ✅ Статусы присутствия
- ✅ Автоматический ping/pong

### 2. SSE модуль (`/realtime/events`)
- ✅ Поток уведомлений
- ✅ Счетчики непрочитанных
- ✅ Обновления ленты (заготовка)
- ✅ Heartbeat для поддержания соединения

### 3. Документация
- ✅ Исследование технологий
- ✅ Клиентская библиотека (пример)
- ✅ Стратегия масштабирования

## 🎯 Следующие шаги для внедрения

### Шаг 1: Базовая интеграция (1-2 недели)

```bash
# Если еще не установлено
cd /home/kirill/projects/sobranie_elysia_api
bun add @elysiajs/websocket

# Проверка работы
bun run dev

# Тестирование WebSocket
wscat -c ws://localhost:3000/realtime/ws -H "Authorization: Bearer YOUR_TOKEN"

# Тестирование SSE
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Accept: text/event-stream" \
     http://localhost:3000/realtime/events
```

### Шаг 2: Интеграция с существующими модулями (1 неделя)

1. **Модуль уведомлений**
   ```typescript
   // В src/modules/notifications/index.ts добавить:
   import { sendToUser } from '../realtime/websocket';
   import { SSEBroadcaster } from '../realtime/sse';
   
   // При создании уведомления
   const notification = await prisma.notifications.create({...});
   
   // Отправляем через WebSocket
   sendToUser(userId, {
     type: 'notification',
     data: notification
   });
   
   // И через SSE
   await SSEBroadcaster.sendNotification(userId, notification);
   ```

2. **Модуль постов**
   ```typescript
   // При создании поста
   const post = await prisma.posts.create({...});
   
   // Уведомляем подписчиков
   sendToChannel(`circle:${post.circleId}`, {
     type: 'new_post',
     data: post
   });
   ```

### Шаг 3: Клиентская интеграция (1-2 недели)

**React пример:**
```tsx
// hooks/useRealtime.ts
import { useEffect, useRef } from 'react';
import { SobranieRealtimeClient } from '../lib/realtime-client';

export function useRealtime(token: string) {
  const clientRef = useRef<SobranieRealtimeClient>();
  
  useEffect(() => {
    const client = new SobranieRealtimeClient({
      apiUrl: process.env.NEXT_PUBLIC_API_URL!,
      wsUrl: process.env.NEXT_PUBLIC_WS_URL!,
      token
    });
    
    client
      .on('onConnect', () => {
        console.log('Real-time connected');
      })
      .on('onNotification', (notification) => {
        // Показать уведомление
        showNotification(notification);
      })
      .on('onMessage', (channel, message) => {
        // Обновить чат
        updateChat(channel, message);
      });
    
    client.connect();
    clientRef.current = client;
    
    return () => {
      client.disconnect();
    };
  }, [token]);
  
  return clientRef.current;
}
```

### Шаг 4: Добавление Redis (для масштабирования)

```bash
# Установка
bun add ioredis

# Docker compose для разработки
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### Шаг 5: Мониторинг и аналитика

1. **Добавить метрики в health endpoint**
2. **Логирование событий**
3. **Dashboard для мониторинга**

## 🏗️ Архитектура для production

### Минимальная конфигурация:
- 1 сервер Elysia (2-4 CPU, 4-8 GB RAM)
- PostgreSQL (уже есть)
- Redis (2 GB RAM)
- Nginx как reverse proxy

### Рекомендуемая конфигурация:
- 2-3 сервера Elysia за load balancer
- PostgreSQL с репликой
- Redis cluster
- CDN для статики

## 📊 Ожидаемые показатели

### С текущей реализацией:
- **Соединения**: до 10,000 одновременных
- **Сообщения**: до 1,000/сек
- **Задержка**: < 100ms (в пределах региона)

### С Redis и масштабированием:
- **Соединения**: до 100,000 одновременных
- **Сообщения**: до 10,000/сек
- **Задержка**: < 50ms

## 🔧 Тестирование

### 1. Функциональное тестирование:
```bash
# Установить Artillery для нагрузочного тестирования
npm install -g artillery

# Создать сценарий тестирования
```

```yaml
# artillery-test.yml
config:
  target: "ws://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Ramp up"

scenarios:
  - name: "WebSocket chat"
    engine: "ws"
    flow:
      - connect: "/realtime/ws"
      - send: '{"type":"subscribe","channel":"test"}'
      - think: 5
      - send: '{"type":"message","channel":"test","data":{"text":"Hello"}}'
      - think: 10
```

### 2. Мониторинг в production:
- Grafana dashboards
- Alerts на критические метрики
- Логирование ошибок

## 🚨 Важные моменты

1. **Безопасность**:
   - Валидация всех входящих сообщений
   - Rate limiting (100 сообщений/мин на пользователя)
   - Проверка прав доступа к каналам

2. **Производительность**:
   - Ограничение размера сообщений (64KB)
   - Автоматическое отключение неактивных клиентов
   - Оптимизация подписок

3. **Надежность**:
   - Автоматическое переподключение
   - Очереди сообщений для offline пользователей
   - Graceful shutdown

## 📚 Дополнительные ресурсы

- [Elysia WebSocket документация](https://elysiajs.com/plugins/websocket)
- [Примеры клиентов](/docs/realtime-client-example.ts)
- [Стратегия масштабирования](/docs/realtime-scaling-strategy.md)
- [Исследование технологий](/docs/realtime-research.md)

## 💡 Контакты для вопросов

При возникновении вопросов по внедрению обращайтесь к документации или создавайте issue в репозитории проекта.

---

**Готово к внедрению!** 🚀
