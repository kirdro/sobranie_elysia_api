# 🔄 Real-time технологии для социальной сети Sobranie

## 📋 Оглавление
1. [Обзор технологий](#обзор-технологий)
2. [WebSockets](#websockets)
3. [Socket.IO](#socketio)
4. [WebTransport](#webtransport)
5. [Server-Sent Events (SSE)](#server-sent-events-sse)
6. [WebRTC](#webrtc)
7. [Сравнительная таблица](#сравнительная-таблица)
8. [Рекомендации для Sobranie](#рекомендации-для-sobranie)
9. [Примеры реализации](#примеры-реализации)

## 🌐 Обзор технологий

Для социальной сети критически важны следующие real-time функции:
- **Мгновенные сообщения** (чат)
- **Уведомления** (лайки, комментарии, подписки)
- **Статусы присутствия** (online/offline)
- **Live обновления** (новые посты, комментарии)
- **Совместное редактирование** (если планируется)
- **Видео/аудио звонки** (если планируется)

## 🔌 WebSockets

### Преимущества:
- ✅ Полнодуплексная связь
- ✅ Низкая задержка
- ✅ Поддержка во всех современных браузерах
- ✅ Отличная поддержка в Elysia через `@elysiajs/websocket`
- ✅ Простая реализация

### Недостатки:
- ❌ Проблемы с прокси и файрволлами
- ❌ Нет встроенной поддержки переподключения
- ❌ Сложности с масштабированием (нужен sticky sessions или Redis)

### Пример для Elysia:
```typescript
import { Elysia } from 'elysia'
import { websocket } from '@elysiajs/websocket'

const app = new Elysia()
  .use(websocket())
  .ws('/ws', {
    open(ws) {
      ws.subscribe('notifications')
      console.log('WebSocket connected')
    },
    message(ws, message) {
      ws.publish('notifications', message)
    },
    close(ws) {
      console.log('WebSocket disconnected')
    }
  })
```

## 🚀 Socket.IO

### Преимущества:
- ✅ Автоматическое переподключение
- ✅ Fallback на long-polling
- ✅ Комнаты и пространства имен
- ✅ Подтверждения доставки
- ✅ Бинарные данные
- ✅ Большое сообщество

### Недостатки:
- ❌ Больший overhead (дополнительный протокол)
- ❌ Нет нативной поддержки в Elysia (нужен адаптер)
- ❌ Больше потребляет ресурсов

### Интеграция с Elysia:
```typescript
// Потребуется кастомная интеграция через адаптер
// Socket.IO работает поверх собственного протокола
```

## 🆕 WebTransport

### Преимущества:
- ✅ Использует HTTP/3 и QUIC
- ✅ Лучшая производительность
- ✅ Поддержка множественных потоков
- ✅ Работает через UDP (меньше задержка)
- ✅ Будущее real-time веба

### Недостатки:
- ❌ Очень ограниченная поддержка браузерами (только Chrome/Edge)
- ❌ Требует HTTPS с валидным сертификатом
- ❌ Сложная настройка
- ❌ Мало библиотек и примеров

## 📡 Server-Sent Events (SSE)

### Преимущества:
- ✅ Простота реализации
- ✅ Работает через обычный HTTP
- ✅ Автоматическое переподключение
- ✅ Отличная поддержка в Elysia
- ✅ Легко проходит через прокси

### Недостатки:
- ❌ Только односторонняя связь (сервер → клиент)
- ❌ Ограничение на количество соединений (6 на домен)
- ❌ Только текстовые данные

### Пример для Elysia:
```typescript
app.get('/events', ({ set }) => {
  set.headers['content-type'] = 'text/event-stream'
  set.headers['cache-control'] = 'no-cache'
  
  return new Response(
    new ReadableStream({
      start(controller) {
        const interval = setInterval(() => {
          controller.enqueue(`data: ${JSON.stringify({ time: new Date() })}\n\n`)
        }, 1000)
        
        return () => clearInterval(interval)
      }
    })
  )
})
```

## 📹 WebRTC

### Преимущества:
- ✅ P2P соединения (снижает нагрузку на сервер)
- ✅ Отлично для видео/аудио звонков
- ✅ Низкая задержка
- ✅ Шифрование по умолчанию

### Недостатки:
- ❌ Сложная реализация
- ❌ Требует STUN/TURN серверы
- ❌ Не подходит для обычных данных
- ❌ Проблемы с NAT

## 📊 Сравнительная таблица

| Технология | Поддержка браузеров | Сложность | Производительность | Масштабируемость | Elysia поддержка |
|------------|-------------------|-----------|-------------------|------------------|------------------|
| WebSockets | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Socket.IO | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| WebTransport | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |
| SSE | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| WebRTC | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ |

## 🎯 Рекомендации для Sobranie

### Основной стек: WebSockets + SSE

**Почему:**
1. **WebSockets** для двусторонней связи:
   - Чат и мгновенные сообщения
   - Статусы присутствия
   - Совместное редактирование

2. **SSE** для односторонних обновлений:
   - Уведомления
   - Обновления ленты
   - Счетчики лайков/комментариев

### Архитектура:

```
┌─────────────┐     WebSocket      ┌─────────────┐
│   Client    │ ←---------------→   │   Elysia    │
│  (Browser)  │                     │    API      │
│             │ ←---------------    │             │
└─────────────┘     SSE             └─────────────┘
                                           │
                                           ↓
                                    ┌─────────────┐
                                    │    Redis    │
                                    │  (PubSub)   │
                                    └─────────────┘
```

### Масштабирование:
- Использовать Redis для PubSub между инстансами
- Sticky sessions для WebSocket соединений
- Horizontal scaling через load balancer

## 💻 Примеры реализации

### 1. WebSocket модуль для Elysia:

```typescript
// src/modules/websocket/index.ts
import { Elysia, t } from 'elysia'
import { websocket } from '@elysiajs/websocket'
import { prismaPlugin } from '../../plugins/prisma'
import { authPlugin } from '../../plugins/auth'

interface WSClient {
  userId: string
  subscriptions: Set<string>
}

const clients = new Map<any, WSClient>()

export const websocketModule = new Elysia({ 
  name: 'websocket',
  prefix: '/ws'
})
  .use(websocket())
  .use(prismaPlugin)
  .use(authPlugin)
  .ws('/connect', {
    body: t.Object({
      type: t.Union([
        t.Literal('subscribe'),
        t.Literal('unsubscribe'),
        t.Literal('message'),
        t.Literal('presence')
      ]),
      channel: t.Optional(t.String()),
      data: t.Optional(t.Any())
    }),
    
    open(ws) {
      const { auth } = ws.data
      
      if (!auth.userId) {
        ws.close(1008, 'Unauthorized')
        return
      }
      
      clients.set(ws, {
        userId: auth.userId,
        subscriptions: new Set(['user:' + auth.userId])
      })
      
      // Отправляем статус онлайн
      ws.publish('presence', {
        userId: auth.userId,
        status: 'online'
      })
    },
    
    message(ws, message) {
      const client = clients.get(ws)
      if (!client) return
      
      switch (message.type) {
        case 'subscribe':
          if (message.channel) {
            client.subscriptions.add(message.channel)
            ws.subscribe(message.channel)
          }
          break
          
        case 'unsubscribe':
          if (message.channel) {
            client.subscriptions.delete(message.channel)
            ws.unsubscribe(message.channel)
          }
          break
          
        case 'message':
          // Обработка сообщений чата
          if (message.channel && message.data) {
            ws.publish(message.channel, {
              type: 'message',
              userId: client.userId,
              data: message.data,
              timestamp: new Date()
            })
          }
          break
      }
    },
    
    close(ws) {
      const client = clients.get(ws)
      if (client) {
        // Отправляем статус оффлайн
        ws.publish('presence', {
          userId: client.userId,
          status: 'offline'
        })
        clients.delete(ws)
      }
    }
  })
```

### 2. SSE модуль для уведомлений:

```typescript
// src/modules/sse/index.ts
import { Elysia } from 'elysia'
import { prismaPlugin } from '../../plugins/prisma'
import { authPlugin } from '../../plugins/auth'

export const sseModule = new Elysia({
  name: 'sse',
  prefix: '/sse'
})
  .use(prismaPlugin)
  .use(authPlugin)
  .get('/notifications', ({ auth, set }) => {
    if (!auth.userId) {
      set.status = 401
      return 'Unauthorized'
    }
    
    set.headers['content-type'] = 'text/event-stream'
    set.headers['cache-control'] = 'no-cache'
    set.headers['connection'] = 'keep-alive'
    
    return new Response(
      new ReadableStream({
        async start(controller) {
          // Отправляем начальные непрочитанные уведомления
          const unread = await prisma.notifications.count({
            where: { 
              userId: auth.userId,
              isRead: false 
            }
          })
          
          controller.enqueue(`data: ${JSON.stringify({
            type: 'unread_count',
            count: unread
          })}\n\n`)
          
          // Подписываемся на обновления (через Redis в продакшене)
          const interval = setInterval(async () => {
            // Здесь будет логика получения новых уведомлений
            const newNotifications = await prisma.notifications.findMany({
              where: {
                userId: auth.userId,
                createdAt: { gt: new Date(Date.now() - 5000) }
              },
              take: 10
            })
            
            if (newNotifications.length > 0) {
              controller.enqueue(`data: ${JSON.stringify({
                type: 'new_notifications',
                notifications: newNotifications
              })}\n\n`)
            }
          }, 5000)
          
          return () => clearInterval(interval)
        }
      })
    )
  })
```

### 3. Клиентская интеграция:

```typescript
// client/services/realtime.ts
class RealtimeService {
  private ws: WebSocket | null = null
  private sse: EventSource | null = null
  private reconnectTimeout: number = 1000
  
  connectWebSocket(token: string) {
    const wsUrl = `${process.env.WS_URL}/ws/connect`
    
    this.ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectTimeout = 1000
      
      // Подписываемся на каналы
      this.subscribe('notifications')
      this.subscribe('chat:global')
    }
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      this.handleMessage(data)
    }
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...')
      setTimeout(() => this.connectWebSocket(token), this.reconnectTimeout)
      this.reconnectTimeout = Math.min(this.reconnectTimeout * 2, 30000)
    }
  }
  
  connectSSE(token: string) {
    this.sse = new EventSource(`${process.env.API_URL}/sse/notifications`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    this.sse.onmessage = (event) => {
      const data = JSON.parse(event.data)
      this.handleSSEMessage(data)
    }
  }
  
  subscribe(channel: string) {
    this.ws?.send(JSON.stringify({
      type: 'subscribe',
      channel
    }))
  }
  
  sendMessage(channel: string, data: any) {
    this.ws?.send(JSON.stringify({
      type: 'message',
      channel,
      data
    }))
  }
  
  private handleMessage(data: any) {
    // Обработка WebSocket сообщений
    switch (data.type) {
      case 'message':
        // Обновляем UI чата
        break
      case 'presence':
        // Обновляем статусы пользователей
        break
    }
  }
  
  private handleSSEMessage(data: any) {
    // Обработка SSE сообщений
    switch (data.type) {
      case 'unread_count':
        // Обновляем счетчик уведомлений
        break
      case 'new_notifications':
        // Показываем новые уведомления
        break
    }
  }
}
```

## 🚀 Следующие шаги

1. **Установить WebSocket плагин**:
   ```bash
   bun add @elysiajs/websocket
   ```

2. **Добавить Redis для масштабирования**:
   ```bash
   bun add redis ioredis
   ```

3. **Реализовать базовые модули**:
   - WebSocket для чата
   - SSE для уведомлений
   - Presence система

4. **Тестирование**:
   - Load testing с Artillery
   - Проверка переподключений
   - Тестирование масштабирования

## 📚 Полезные ресурсы

- [Elysia WebSocket документация](https://elysiajs.com/plugins/websocket)
- [WebSocket MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Server-Sent Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [WebTransport explainer](https://github.com/w3c/webtransport/blob/main/explainer.md)
