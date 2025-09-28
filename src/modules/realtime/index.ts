import { Elysia, t } from "elysia";
import { createWebSocketModule } from "./websocket";
import { createSSEModule } from "./sse";

// Счетчики для мониторинга
let wsConnections = 0;
let sseConnections = 0;

export const realtimeModule = new Elysia({
  name: "realtime",
  prefix: "/realtime",
  tags: ["realtime"],
  detail: {
    description: "Real-time communication endpoints including WebSocket and Server-Sent Events (SSE)",
    tags: [{
      name: "realtime",
      description: "⚡ Real-time features for live updates, chat, and notifications.\n\n**Note:** This module includes both REST endpoints and real-time protocols:\n- `/realtime/ws` - WebSocket endpoint (use ws:// protocol)\n- `/realtime/events` - Server-Sent Events stream\n- Other endpoints are standard REST APIs"
    }]
  }
})
  .model({
    "realtime.health": t.Object({
      status: t.Union([
        t.Literal("ok"),
        t.Literal("degraded"),
        t.Literal("down")
      ]),
      connections: t.Object({
        websocket: t.Number(),
        sse: t.Number(),
        total: t.Number()
      }),
      uptime: t.Number(),
      features: t.Object({
        websocket: t.Boolean(),
        sse: t.Boolean(),
        webrtc: t.Boolean()
      })
    })
  })
  .get("/health", () => ({ 
    status: "ok" as const,
    connections: {
      websocket: wsConnections,
      sse: sseConnections,
      total: wsConnections + sseConnections
    },
    uptime: process.uptime(),
    features: {
      websocket: true,
      sse: true,
      webrtc: false // Пока не реализовано
    }
  }), {
    detail: {
      summary: "Realtime service health",
      description: "Check the health status of realtime services including WebSocket and SSE connections",
      tags: ["realtime"]
    },
    response: {
      200: "realtime.health"
    }
  })
  // GET эндпоинт для WebSocket документации
  .get("/ws", ({ set }) => {
    set.headers["content-type"] = "text/html";
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>WebSocket Endpoint</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
          pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
          .warning { background: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>🔌 WebSocket Endpoint</h1>
        <div class="warning">
          <strong>⚠️ This is a WebSocket endpoint!</strong><br>
          HTTP GET requests are not supported. Use WebSocket protocol instead.
        </div>
        
        <h2>Connection URL</h2>
        <pre>ws://localhost:3000/realtime/ws</pre>
        
        <h2>Authentication</h2>
        <p>Include JWT token in connection headers:</p>
        <pre>Authorization: Bearer YOUR_JWT_TOKEN</pre>
        
        <h2>Message Format</h2>
        <pre>{
  "type": "subscribe" | "unsubscribe" | "message" | "typing" | "presence" | "ping",
  "channel": "string", // Required for subscribe/unsubscribe/message/typing
  "data": {} // Message-specific data
}</pre>
        
        <h2>Example Usage</h2>
        <pre>const ws = new WebSocket('ws://localhost:3000/realtime/ws');

ws.onopen = () => {
  // Subscribe to a channel
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'chat:general'
  }));
  
  // Send a message
  ws.send(JSON.stringify({
    type: 'message',
    channel: 'chat:general',
    data: { text: 'Hello, world!' }
  }));
};</pre>
        
        <p>See <a href="/openapi">OpenAPI documentation</a> for more details.</p>
      </body>
      </html>
    `;
  }, {
    detail: {
      summary: "WebSocket endpoint information",
      description: "This endpoint returns HTML documentation about the WebSocket connection. For actual WebSocket connection, use ws:// protocol.",
      tags: ["realtime"]
    }
  })
  // Подключаем WebSocket модуль
  .use(createWebSocketModule())
  // Подключаем SSE модуль
  .use(createSSEModule())
  // Дополнительные эндпоинты для управления real-time
  .post("/broadcast", async ({ body, prisma }) => {
    // Эндпоинт для отправки широковещательных сообщений
    // TODO: Добавить авторизацию и проверку прав
    const { type, channel, data } = body;
    
    // Здесь будет логика отправки через WebSocket/SSE
    console.log(`Broadcasting to ${channel}:`, { type, data });
    
    return { success: true, message: "Broadcast sent" };
  }, {
    detail: {
      summary: "Broadcast message",
      description: "Send a broadcast message to all connected clients in a channel",
      tags: ["realtime"]
    },
    body: t.Object({
      type: t.String(),
      channel: t.String(),
      data: t.Any()
    })
  });
