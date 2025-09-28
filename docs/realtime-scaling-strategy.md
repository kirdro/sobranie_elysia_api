# 🚀 Стратегия масштабирования Real-time функций Sobranie

## 📋 Содержание
1. [Текущая архитектура](#текущая-архитектура)
2. [Проблемы масштабирования](#проблемы-масштабирования)
3. [Решения для масштабирования](#решения-для-масштабирования)
4. [Redis PubSub интеграция](#redis-pubsub-интеграция)
5. [PostgreSQL LISTEN/NOTIFY](#postgresql-listennotify)
6. [Архитектура микросервисов](#архитектура-микросервисов)
7. [Мониторинг и метрики](#мониторинг-и-метрики)

## 🏗️ Текущая архитектура

```
┌─────────────┐     WebSocket      ┌─────────────┐
│   Client    │ ←---------------→   │   Elysia    │
│  (Browser)  │                     │  Instance   │
│             │ ←---------------    │   (Single)  │
└─────────────┘     SSE             └─────────────┘
                                           │
                                           ↓
                                    ┌─────────────┐
                                    │ PostgreSQL  │
                                    └─────────────┘
```

### Ограничения:
- ✅ Работает для небольших нагрузок (< 10k пользователей)
- ❌ WebSocket соединения привязаны к конкретному инстансу
- ❌ При падении инстанса теряются все соединения
- ❌ Нет синхронизации между инстансами

## 🔴 Проблемы масштабирования

1. **Sticky Sessions**
   - WebSocket требует постоянного соединения с одним сервером
   - Load balancer должен направлять клиента на тот же сервер

2. **Синхронизация состояния**
   - Сообщения должны доставляться клиентам на разных серверах
   - Статусы присутствия должны быть видны всем

3. **Отказоустойчивость**
   - При падении сервера клиенты должны переподключиться
   - Состояние должно восстанавливаться

## ✅ Решения для масштабирования

### 1. Архитектура с Redis PubSub

```
┌─────────────┐                     ┌─────────────┐
│  Client 1   │ ←───WebSocket────→  │  Elysia 1   │
└─────────────┘                     └──────┬──────┘
                                           │
┌─────────────┐                     ┌──────┴──────┐
│  Client 2   │ ←───WebSocket────→  │  Elysia 2   │
└─────────────┘                     └──────┬──────┘
                                           │
                                    ┌──────┴──────┐
                                    │    Redis    │
                                    │   PubSub    │
                                    └──────┬──────┘
                                           │
                                    ┌──────┴──────┐
                                    │ PostgreSQL  │
                                    └─────────────┘
```

### 2. Load Balancer конфигурация

**Nginx пример:**
```nginx
upstream sobranie_api {
    ip_hash;  # Sticky sessions для WebSocket
    server api1.sobranie.app:3000;
    server api2.sobranie.app:3000;
    server api3.sobranie.app:3000;
}

server {
    location /realtime/ws {
        proxy_pass http://sobranie_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Важно для WebSocket
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
    
    location /realtime/events {
        proxy_pass http://sobranie_api;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_cache off;
        
        # SSE настройки
        proxy_set_header X-Accel-Buffering no;
        proxy_read_timeout 86400;
    }
}
```

## 🔄 Redis PubSub интеграция

### Установка зависимостей:
```bash
bun add redis ioredis
```

### Адаптер для синхронизации:

```typescript
// src/lib/realtime/redis-adapter.ts
import { Redis } from 'ioredis';

export class RedisRealtimeAdapter {
  private pub: Redis;
  private sub: Redis;
  private channels = new Map<string, Set<(message: any) => void>>();
  
  constructor(redisUrl: string) {
    this.pub = new Redis(redisUrl);
    this.sub = new Redis(redisUrl);
    
    this.sub.on('message', (channel, message) => {
      const handlers = this.channels.get(channel);
      if (handlers) {
        const data = JSON.parse(message);
        handlers.forEach(handler => handler(data));
      }
    });
  }
  
  // Публикация сообщения
  async publish(channel: string, message: any): Promise<void> {
    await this.pub.publish(channel, JSON.stringify(message));
  }
  
  // Подписка на канал
  subscribe(channel: string, handler: (message: any) => void): void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
      this.sub.subscribe(channel);
    }
    this.channels.get(channel)!.add(handler);
  }
  
  // Отписка от канала
  unsubscribe(channel: string, handler: (message: any) => void): void {
    const handlers = this.channels.get(channel);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.channels.delete(channel);
        this.sub.unsubscribe(channel);
      }
    }
  }
  
  // Закрытие соединений
  async close(): Promise<void> {
    await this.pub.quit();
    await this.sub.quit();
  }
}
```

### Обновленный WebSocket модуль с Redis:

```typescript
// src/modules/realtime/websocket-redis.ts
import { RedisRealtimeAdapter } from '../../lib/realtime/redis-adapter';

const redisAdapter = new RedisRealtimeAdapter(process.env.REDIS_URL!);

// При отправке сообщения
function broadcastToChannel(channel: string, message: any) {
  // Локальная отправка
  clients.forEach((client, ws) => {
    if (client.subscriptions.has(channel) && ws.readyState === 1) {
      ws.send(JSON.stringify(message));
    }
  });
  
  // Публикация в Redis для других серверов
  redisAdapter.publish(`ws:${channel}`, message);
}

// Подписка на Redis каналы
redisAdapter.subscribe('ws:*', (message) => {
  const channel = message.channel.replace('ws:', '');
  
  // Отправляем локальным клиентам
  clients.forEach((client, ws) => {
    if (client.subscriptions.has(channel) && ws.readyState === 1) {
      ws.send(JSON.stringify(message.data));
    }
  });
});
```

## 🐘 PostgreSQL LISTEN/NOTIFY

Альтернатива Redis для небольших проектов:

```sql
-- Создание функции для уведомлений
CREATE OR REPLACE FUNCTION notify_realtime_event()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'realtime_events',
    json_build_object(
      'action', TG_OP,
      'table', TG_TABLE_NAME,
      'data', row_to_json(NEW)
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры на таблицы
CREATE TRIGGER notifications_realtime
AFTER INSERT OR UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION notify_realtime_event();

CREATE TRIGGER posts_realtime
AFTER INSERT OR UPDATE OR DELETE ON posts
FOR EACH ROW EXECUTE FUNCTION notify_realtime_event();
```

### Слушатель PostgreSQL:

```typescript
// src/lib/realtime/pg-listener.ts
import { Client } from 'pg';

export class PostgreSQLRealtimeListener {
  private client: Client;
  private handlers = new Map<string, Set<(payload: any) => void>>();
  
  constructor(connectionString: string) {
    this.client = new Client({ connectionString });
  }
  
  async connect(): Promise<void> {
    await this.client.connect();
    
    this.client.on('notification', (msg) => {
      const handlers = this.handlers.get(msg.channel);
      if (handlers && msg.payload) {
        const payload = JSON.parse(msg.payload);
        handlers.forEach(handler => handler(payload));
      }
    });
  }
  
  async listen(channel: string, handler: (payload: any) => void): Promise<void> {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      await this.client.query(`LISTEN ${channel}`);
    }
    this.handlers.get(channel)!.add(handler);
  }
  
  async unlisten(channel: string): Promise<void> {
    if (this.handlers.has(channel)) {
      this.handlers.delete(channel);
      await this.client.query(`UNLISTEN ${channel}`);
    }
  }
}
```

## 🎯 Архитектура микросервисов

Для больших масштабов рекомендуется разделение:

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   API Gateway    │     │  WebSocket       │     │   SSE Service    │
│   (Kong/Envoy)   │────▶│   Service        │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
         │                        │                         │
         │                        ▼                         │
         │               ┌──────────────────┐              │
         └──────────────▶│  Message Broker  │◀─────────────┘
                         │  (RabbitMQ/Kafka)│
                         └──────────────────┘
                                  │
                         ┌────────┴────────┐
                         ▼                 ▼
                  ┌──────────────┐  ┌──────────────┐
                  │ Notification │  │    Chat      │
                  │   Service     │  │   Service    │
                  └──────────────┘  └──────────────┘
```

## 📊 Мониторинг и метрики

### Ключевые метрики:
1. **Соединения**
   - Активные WebSocket соединения
   - Активные SSE соединения
   - Соединения по серверам

2. **Производительность**
   - Задержка доставки сообщений
   - Пропускная способность
   - CPU/Memory использование

3. **Ошибки**
   - Неудачные подключения
   - Потерянные сообщения
   - Таймауты

### Prometheus метрики:

```typescript
import { Counter, Gauge, Histogram } from 'prom-client';

// Метрики соединений
export const wsConnections = new Gauge({
  name: 'sobranie_ws_connections_active',
  help: 'Active WebSocket connections',
  labelNames: ['server_id']
});

export const sseConnections = new Gauge({
  name: 'sobranie_sse_connections_active',
  help: 'Active SSE connections',
  labelNames: ['server_id']
});

// Метрики сообщений
export const messagesSent = new Counter({
  name: 'sobranie_messages_sent_total',
  help: 'Total messages sent',
  labelNames: ['type', 'channel']
});

export const messageDeliveryTime = new Histogram({
  name: 'sobranie_message_delivery_duration_seconds',
  help: 'Message delivery time',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});
```

## 🔐 Безопасность

### Rate Limiting:
```typescript
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, limit = 100): boolean {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);
  
  if (!userLimit || userLimit.resetAt < now) {
    rateLimits.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }
  
  if (userLimit.count >= limit) {
    return false;
  }
  
  userLimit.count++;
  return true;
}
```

### Валидация сообщений:
- Размер сообщений (max 64KB)
- Частота отправки
- Проверка прав доступа к каналам

## 📈 Roadmap масштабирования

### Phase 1 (< 10k пользователей):
- ✅ Single server с in-memory state
- ✅ PostgreSQL для персистентности
- ✅ Basic monitoring

### Phase 2 (10k - 100k пользователей):
- 🔄 Redis PubSub для синхронизации
- 🔄 2-3 сервера с load balancer
- 🔄 Prometheus + Grafana мониторинг

### Phase 3 (100k - 1M пользователей):
- 📋 Микросервисная архитектура
- 📋 Message broker (Kafka/RabbitMQ)
- 📋 Dedicated WebSocket servers
- 📋 CDN для статики

### Phase 4 (> 1M пользователей):
- 📋 Geo-distributed infrastructure
- 📋 WebRTC для P2P коммуникаций
- 📋 Edge computing для низкой задержки
