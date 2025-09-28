import { Elysia, t } from "elysia";
import { prismaPlugin } from "../../plugins/prisma";
import { authPlugin } from "../../plugins/auth";

// Типы для WebSocket сообщений
export const wsMessageSchema = t.Union([
  // Подписка на канал
  t.Object({
    type: t.Literal("subscribe"),
    channel: t.String(),
    data: t.Optional(t.Object({
      lastMessageId: t.Optional(t.String())
    }))
  }),
  // Отписка от канала
  t.Object({
    type: t.Literal("unsubscribe"),
    channel: t.String()
  }),
  // Сообщение в чат
  t.Object({
    type: t.Literal("message"),
    channel: t.String(),
    data: t.Object({
      text: t.String({ minLength: 1, maxLength: 1000 }),
      replyTo: t.Optional(t.String())
    })
  }),
  // Индикатор набора текста
  t.Object({
    type: t.Literal("typing"),
    channel: t.String(),
    data: t.Object({
      isTyping: t.Boolean()
    })
  }),
  // Статус присутствия
  t.Object({
    type: t.Literal("presence"),
    data: t.Object({
      status: t.Union([
        t.Literal("online"),
        t.Literal("away"),
        t.Literal("busy"),
        t.Literal("offline")
      ])
    })
  }),
  // Ping для поддержания соединения
  t.Object({
    type: t.Literal("ping")
  })
]);

// Типы исходящих сообщений
export const wsOutgoingSchema = t.Union([
  // Подтверждение подписки
  t.Object({
    type: t.Literal("subscribed"),
    channel: t.String(),
    data: t.Optional(t.Any())
  }),
  // Подтверждение отписки
  t.Object({
    type: t.Literal("unsubscribed"),
    channel: t.String()
  }),
  // Новое сообщение
  t.Object({
    type: t.Literal("message"),
    channel: t.String(),
    data: t.Object({
      id: t.String(),
      userId: t.String(),
      text: t.String(),
      createdAt: t.String(),
      user: t.Optional(t.Object({
        id: t.String(),
        firstName: t.Union([t.String(), t.Null()]),
        lastName: t.Union([t.String(), t.Null()]),
        avatarId: t.Union([t.String(), t.Null()])
      }))
    })
  }),
  // Статус набора текста
  t.Object({
    type: t.Literal("typing"),
    channel: t.String(),
    data: t.Object({
      userId: t.String(),
      isTyping: t.Boolean(),
      user: t.Optional(t.Object({
        id: t.String(),
        firstName: t.Union([t.String(), t.Null()]),
        lastName: t.Union([t.String(), t.Null()])
      }))
    })
  }),
  // Обновление присутствия
  t.Object({
    type: t.Literal("presence"),
    data: t.Object({
      userId: t.String(),
      status: t.String(),
      lastSeen: t.Optional(t.String())
    })
  }),
  // Pong ответ
  t.Object({
    type: t.Literal("pong"),
    data: t.Object({
      timestamp: t.Number()
    })
  }),
  // Ошибка
  t.Object({
    type: t.Literal("error"),
    data: t.Object({
      code: t.String(),
      message: t.String()
    })
  })
]);

// Интерфейс для подключенного клиента
interface WSClient {
  id: string;
  userId: string;
  subscriptions: Set<string>;
  lastActivity: Date;
}

// Хранилище подключенных клиентов
const clients = new Map<any, WSClient>();
const userConnections = new Map<string, Set<any>>();

// Вспомогательные функции
function addUserConnection(userId: string, ws: any) {
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  userConnections.get(userId)!.add(ws);
}

function removeUserConnection(userId: string, ws: any) {
  const connections = userConnections.get(userId);
  if (connections) {
    connections.delete(ws);
    if (connections.size === 0) {
      userConnections.delete(userId);
    }
  }
}

function broadcastToUser(userId: string, message: any, excludeWs?: any) {
  const connections = userConnections.get(userId);
  if (connections) {
    connections.forEach(ws => {
      if (ws !== excludeWs && ws.readyState === 1) {
        ws.send(JSON.stringify(message));
      }
    });
  }
}

function broadcastToChannel(channel: string, message: any, excludeWs?: any) {
  clients.forEach((client, ws) => {
    if (client.subscriptions.has(channel) && ws !== excludeWs && ws.readyState === 1) {
      ws.send(JSON.stringify(message));
    }
  });
}

// Создание WebSocket модуля
export const createWebSocketModule = () => {
  return new Elysia({ name: "websocket-handler" })
    .use(prismaPlugin)
    .use(authPlugin)
    .ws("/ws", {
      body: wsMessageSchema,
      detail: {
        summary: "WebSocket connection endpoint",
        description: "⚠️ This is a WebSocket endpoint, not a REST API. Connect using ws://localhost:3000/realtime/ws\n\nWebSocket protocol for real-time bidirectional communication. Supports chat messages, presence status, and channel subscriptions.\n\nAuthentication required via JWT token in connection headers.",
        tags: ["realtime"],
        deprecated: false
      },
      
      async open(ws) {
        const { auth } = ws.data;
        
        // Проверка авторизации
        if (!auth.userId) {
          ws.send(JSON.stringify({
            type: "error",
            data: {
              code: "UNAUTHORIZED",
              message: "Authentication required"
            }
          }));
          ws.close(1008, "Unauthorized");
          return;
        }
        
        // Создаем клиента
        const clientId = crypto.randomUUID();
        const client: WSClient = {
          id: clientId,
          userId: auth.userId,
          subscriptions: new Set([`user:${auth.userId}`]), // Автоподписка на личный канал
          lastActivity: new Date()
        };
        
        clients.set(ws, client);
        addUserConnection(auth.userId, ws);
        
        // Отправляем статус присутствия
        broadcastToChannel("presence", {
          type: "presence",
          data: {
            userId: auth.userId,
            status: "online",
            lastSeen: new Date().toISOString()
          }
        }, ws);
        
        console.log(`WebSocket connected: user ${auth.userId}, client ${clientId}`);
      },
      
      async message(ws, message) {
        const client = clients.get(ws);
        if (!client) return;
        
        client.lastActivity = new Date();
        const { prisma } = ws.data;
        
        switch (message.type) {
          case "subscribe": {
            const { channel } = message;
            
            // Проверка прав доступа к каналу
            if (channel.startsWith("circle:")) {
              // TODO: Проверить членство в круге
            }
            
            client.subscriptions.add(channel);
            ws.send(JSON.stringify({
              type: "subscribed",
              channel,
              data: { subscribedAt: new Date().toISOString() }
            }));
            
            console.log(`Client ${client.id} subscribed to ${channel}`);
            break;
          }
          
          case "unsubscribe": {
            const { channel } = message;
            client.subscriptions.delete(channel);
            ws.send(JSON.stringify({
              type: "unsubscribed",
              channel
            }));
            
            console.log(`Client ${client.id} unsubscribed from ${channel}`);
            break;
          }
          
          case "message": {
            const { channel, data } = message;
            
            // Проверка подписки на канал
            if (!client.subscriptions.has(channel)) {
              ws.send(JSON.stringify({
                type: "error",
                data: {
                  code: "NOT_SUBSCRIBED",
                  message: "You must subscribe to the channel first"
                }
              }));
              return;
            }
            
            // Сохраняем сообщение в БД (если это чат)
            // TODO: Implement chat message storage
            
            // Получаем информацию о пользователе
            const user = await prisma.users.findUnique({
              where: { id: client.userId },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarId: true
              }
            });
            
            // Отправляем всем подписчикам канала
            broadcastToChannel(channel, {
              type: "message",
              channel,
              data: {
                id: crypto.randomUUID(),
                userId: client.userId,
                text: data.text,
                createdAt: new Date().toISOString(),
                user
              }
            });
            
            break;
          }
          
          case "typing": {
            const { channel, data } = message;
            
            if (!client.subscriptions.has(channel)) {
              return;
            }
            
            // Получаем информацию о пользователе
            const user = await prisma.users.findUnique({
              where: { id: client.userId },
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            });
            
            // Отправляем всем кроме отправителя
            broadcastToChannel(channel, {
              type: "typing",
              channel,
              data: {
                userId: client.userId,
                isTyping: data.isTyping,
                user
              }
            }, ws);
            
            break;
          }
          
          case "presence": {
            const { data } = message;
            
            // Обновляем статус присутствия
            broadcastToChannel("presence", {
              type: "presence",
              data: {
                userId: client.userId,
                status: data.status,
                lastSeen: new Date().toISOString()
              }
            });
            
            break;
          }
          
          case "ping": {
            ws.send(JSON.stringify({
              type: "pong",
              data: {
                timestamp: Date.now()
              }
            }));
            break;
          }
        }
      },
      
      close(ws) {
        const client = clients.get(ws);
        if (!client) return;
        
        // Удаляем клиента
        clients.delete(ws);
        removeUserConnection(client.userId, ws);
        
        // Если это был последний коннект пользователя, отправляем offline статус
        if (!userConnections.has(client.userId)) {
          broadcastToChannel("presence", {
            type: "presence",
            data: {
              userId: client.userId,
              status: "offline",
              lastSeen: new Date().toISOString()
            }
          });
        }
        
        console.log(`WebSocket disconnected: user ${client.userId}, client ${client.id}`);
      }
    });
};

// Функция для отправки серверных событий
export function sendToUser(userId: string, message: any) {
  broadcastToUser(userId, message);
}

export function sendToChannel(channel: string, message: any) {
  broadcastToChannel(channel, message);
}

// Периодическая очистка неактивных соединений
setInterval(() => {
  const now = new Date();
  const timeout = 60000; // 1 минута
  
  clients.forEach((client, ws) => {
    if (now.getTime() - client.lastActivity.getTime() > timeout) {
      ws.send(JSON.stringify({
        type: "ping"
      }));
      
      // Если клиент не ответит, соединение закроется автоматически
    }
  });
}, 30000); // Каждые 30 секунд
