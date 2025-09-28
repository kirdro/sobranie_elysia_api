import { Elysia, t } from "elysia";
import { prismaPlugin } from "../../plugins/prisma";
import { authPlugin } from "../../plugins/auth";

// Типы событий SSE
export enum SSEEventType {
  NOTIFICATION = "notification",
  FEED_UPDATE = "feed_update",
  UNREAD_COUNT = "unread_count",
  SYSTEM_MESSAGE = "system_message"
}

// Схемы для разных типов событий
export const sseEventSchemas = {
  notification: t.Object({
    id: t.String(),
    type: t.Union([
      t.Literal("like"),
      t.Literal("comment"),
      t.Literal("follow"),
      t.Literal("mention"),
      t.Literal("circle_invite"),
      t.Literal("post_published")
    ]),
    title: t.String(),
    message: t.String(),
    relatedId: t.Optional(t.String()),
    relatedType: t.Optional(t.Union([
      t.Literal("post"),
      t.Literal("comment"),
      t.Literal("user"),
      t.Literal("circle")
    ])),
    createdAt: t.String(),
    isRead: t.Boolean()
  }),
  
  feedUpdate: t.Object({
    action: t.Union([
      t.Literal("new_post"),
      t.Literal("post_updated"),
      t.Literal("post_deleted")
    ]),
    postId: t.String(),
    circleId: t.Optional(t.String())
  }),
  
  unreadCount: t.Object({
    notifications: t.Number(),
    messages: t.Number(),
    total: t.Number()
  }),
  
  systemMessage: t.Object({
    level: t.Union([
      t.Literal("info"),
      t.Literal("warning"),
      t.Literal("error")
    ]),
    message: t.String(),
    action: t.Optional(t.String())
  })
};

// Хранилище SSE соединений
const sseConnections = new Map<string, Set<Response>>();

// Вспомогательная функция для отправки SSE события
function sendSSEEvent(controller: ReadableStreamDefaultController, eventType: string, data: any) {
  const event = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(event));
}

// Создание SSE модуля
export const createSSEModule = () => {
  return new Elysia({ name: "sse-handler" })
    .use(prismaPlugin)
    .use(authPlugin)
    .get("/events", async ({ auth, prisma, set, request }) => {
      // Проверка авторизации
      if (!auth.userId) {
        set.status = 401;
        return "Unauthorized";
      }
      
      // Настройка заголовков для SSE
      set.headers["content-type"] = "text/event-stream";
      set.headers["cache-control"] = "no-cache";
      set.headers["connection"] = "keep-alive";
      set.headers["x-accel-buffering"] = "no"; // Для nginx
      
      const userId = auth.userId;
      let isConnected = true;
      
      // Создаем поток
      const stream = new ReadableStream({
        async start(controller) {
          // Отправляем приветственное сообщение
          sendSSEEvent(controller, "connected", {
            userId,
            timestamp: new Date().toISOString()
          });
          
          try {
            // Отправляем начальные данные
            
            // 1. Количество непрочитанных уведомлений
            const [unreadNotifications, unreadMessages] = await Promise.all([
              prisma.notifications.count({
                where: {
                  userId,
                  isRead: false
                }
              }),
              // TODO: Подсчет непрочитанных сообщений
              Promise.resolve(0)
            ]);
            
            sendSSEEvent(controller, SSEEventType.UNREAD_COUNT, {
              notifications: unreadNotifications,
              messages: unreadMessages,
              total: unreadNotifications + unreadMessages
            });
            
            // 2. Последние непрочитанные уведомления
            const recentNotifications = await prisma.notifications.findMany({
              where: {
                userId,
                isRead: false
              },
              orderBy: { createdAt: "desc" },
              take: 5,
              select: {
                id: true,
                type: true,
                title: true,
                message: true,
                relatedId: true,
                createdAt: true,
                isRead: true
              }
            });
            
            for (const notification of recentNotifications) {
              sendSSEEvent(controller, SSEEventType.NOTIFICATION, {
                ...notification,
                createdAt: notification.createdAt.toISOString(),
                relatedType: getRelatedType(notification.type)
              });
            }
            
            // Устанавливаем интервал для проверки новых событий
            const checkInterval = setInterval(async () => {
              if (!isConnected) {
                clearInterval(checkInterval);
                return;
              }
              
              try {
                // Проверяем новые уведомления
                const newNotifications = await prisma.notifications.findMany({
                  where: {
                    userId,
                    createdAt: {
                      gt: new Date(Date.now() - 5000) // За последние 5 секунд
                    }
                  },
                  orderBy: { createdAt: "desc" },
                  select: {
                    id: true,
                    type: true,
                    title: true,
                    message: true,
                    relatedId: true,
                    createdAt: true,
                    isRead: true
                  }
                });
                
                // Отправляем новые уведомления
                for (const notification of newNotifications) {
                  sendSSEEvent(controller, SSEEventType.NOTIFICATION, {
                    ...notification,
                    createdAt: notification.createdAt.toISOString(),
                    relatedType: getRelatedType(notification.type)
                  });
                }
                
                // Обновляем счетчики если есть новые
                if (newNotifications.length > 0) {
                  const [totalUnread, unreadMessages] = await Promise.all([
                    prisma.notifications.count({
                      where: {
                        userId,
                        isRead: false
                      }
                    }),
                    Promise.resolve(0)
                  ]);
                  
                  sendSSEEvent(controller, SSEEventType.UNREAD_COUNT, {
                    notifications: totalUnread,
                    messages: unreadMessages,
                    total: totalUnread + unreadMessages
                  });
                }
                
                // TODO: Проверка обновлений ленты
                // TODO: Проверка системных сообщений
                
              } catch (error) {
                console.error("Error in SSE check interval:", error);
              }
            }, 5000); // Каждые 5 секунд
            
            // Отправляем heartbeat каждые 30 секунд
            const heartbeatInterval = setInterval(() => {
              if (!isConnected) {
                clearInterval(heartbeatInterval);
                return;
              }
              
              controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
            }, 30000);
            
            // Очистка при закрытии соединения
            request.signal.addEventListener("abort", () => {
              isConnected = false;
              clearInterval(checkInterval);
              clearInterval(heartbeatInterval);
              controller.close();
            });
            
          } catch (error) {
            console.error("Error in SSE stream:", error);
            sendSSEEvent(controller, "error", {
              message: "Internal server error",
              timestamp: new Date().toISOString()
            });
          }
        },
        
        cancel() {
          isConnected = false;
          console.log(`SSE connection closed for user ${userId}`);
        }
      });
      
      return new Response(stream);
    }, {
      detail: {
        summary: "Server-Sent Events stream",
        description: "⚠️ This is a Server-Sent Events (SSE) endpoint, not a regular REST API.\n\nSSE provides a one-way data stream from server to client. Use EventSource API or set 'Accept: text/event-stream' header.\n\nEvent types:\n- `notification` - New notifications\n- `feed_update` - Feed updates\n- `unread_count` - Unread counts update\n- `system_message` - System messages\n\nExample:\n```javascript\nconst sse = new EventSource('/realtime/events', {\n  headers: { 'Authorization': 'Bearer TOKEN' }\n});\n\nsse.addEventListener('notification', (event) => {\n  console.log(JSON.parse(event.data));\n});\n```",
        tags: ["realtime"]
      }
    })
    .get("/events/test", ({ set }) => {
      // Тестовый эндпоинт для проверки SSE
      set.headers["content-type"] = "text/event-stream";
      set.headers["cache-control"] = "no-cache";
      
      const stream = new ReadableStream({
        start(controller) {
          let counter = 0;
          
          const interval = setInterval(() => {
            counter++;
            const event = `data: ${JSON.stringify({ 
              message: "Test event", 
              counter,
              timestamp: new Date().toISOString() 
            })}\n\n`;
            
            controller.enqueue(new TextEncoder().encode(event));
            
            if (counter >= 10) {
              clearInterval(interval);
              controller.close();
            }
          }, 1000);
        }
      });
      
      return new Response(stream);
    }, {
      detail: {
        summary: "Test SSE endpoint",
        description: "Test Server-Sent Events functionality",
        tags: ["realtime"]
      }
    });
};

// Вспомогательная функция для определения типа связанного объекта
function getRelatedType(notificationType: string): string | undefined {
  const typeMap: Record<string, string> = {
    like: "post",
    comment: "post",
    follow: "user",
    mention: "post",
    circle_invite: "circle",
    post_published: "post"
  };
  
  return typeMap[notificationType];
}

// API для отправки событий из других модулей
export class SSEBroadcaster {
  static async sendNotification(userId: string, notification: any) {
    // В реальном приложении здесь будет интеграция с Redis/PubSub
    // Пока просто логируем
    console.log(`SSE: Sending notification to user ${userId}:`, notification);
  }
  
  static async sendFeedUpdate(circleId: string | null, update: any) {
    console.log(`SSE: Sending feed update to circle ${circleId || "global"}:`, update);
  }
  
  static async sendSystemMessage(message: any, userIds?: string[]) {
    console.log(`SSE: Sending system message to ${userIds ? userIds.join(", ") : "all"}:`, message);
  }
}
