/**
 * Пример клиентской библиотеки для работы с Sobranie Real-time API
 * Этот код предназначен для использования в браузере или Node.js
 */

// Типы сообщений
type WSMessage = 
  | { type: 'subscribe'; channel: string; data?: { lastMessageId?: string } }
  | { type: 'unsubscribe'; channel: string }
  | { type: 'message'; channel: string; data: { text: string; replyTo?: string } }
  | { type: 'typing'; channel: string; data: { isTyping: boolean } }
  | { type: 'presence'; data: { status: 'online' | 'away' | 'busy' | 'offline' } }
  | { type: 'ping' };

type WSIncomingMessage =
  | { type: 'subscribed'; channel: string; data?: any }
  | { type: 'unsubscribed'; channel: string }
  | { type: 'message'; channel: string; data: any }
  | { type: 'typing'; channel: string; data: any }
  | { type: 'presence'; data: any }
  | { type: 'pong'; data: { timestamp: number } }
  | { type: 'error'; data: { code: string; message: string } };

// Интерфейс для обработчиков событий
interface EventHandlers {
  onConnect?: () => void;
  onDisconnect?: (reason?: string) => void;
  onMessage?: (channel: string, data: any) => void;
  onTyping?: (channel: string, data: any) => void;
  onPresence?: (data: any) => void;
  onError?: (error: any) => void;
  onNotification?: (notification: any) => void;
  onFeedUpdate?: (update: any) => void;
  onUnreadCount?: (counts: any) => void;
}

// Основной класс для работы с real-time
export class SobranieRealtimeClient {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  private token: string;
  private apiUrl: string;
  private wsUrl: string;
  private handlers: EventHandlers = {};
  private reconnectTimeout = 1000;
  private maxReconnectTimeout = 30000;
  private reconnectAttempts = 0;
  private pingInterval: NodeJS.Timer | null = null;
  private subscriptions = new Set<string>();
  
  constructor(config: {
    apiUrl: string;
    wsUrl: string;
    token: string;
  }) {
    this.apiUrl = config.apiUrl;
    this.wsUrl = config.wsUrl;
    this.token = config.token;
  }
  
  // Установка обработчиков событий
  on<K extends keyof EventHandlers>(event: K, handler: EventHandlers[K]) {
    this.handlers[event] = handler;
    return this;
  }
  
  // Подключение к WebSocket
  async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = `${this.wsUrl}/realtime/ws`;
        this.ws = new WebSocket(url, {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        } as any); // В браузере headers не поддерживаются напрямую
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectTimeout = 1000;
          this.reconnectAttempts = 0;
          
          // Восстанавливаем подписки
          this.subscriptions.forEach(channel => {
            this.subscribe(channel);
          });
          
          // Запускаем ping
          this.startPing();
          
          this.handlers.onConnect?.();
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message: WSIncomingMessage = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.handlers.onError?.(error);
        };
        
        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.stopPing();
          this.handlers.onDisconnect?.(event.reason);
          
          // Переподключение
          if (event.code !== 1000) { // Не нормальное закрытие
            this.reconnect();
          }
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // Подключение к SSE
  connectSSE(): void {
    const url = `${this.apiUrl}/realtime/events`;
    
    this.sse = new EventSource(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    } as any);
    
    // Обработчик уведомлений
    this.sse.addEventListener('notification', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handlers.onNotification?.(data);
      } catch (error) {
        console.error('Failed to parse SSE notification:', error);
      }
    });
    
    // Обработчик обновлений ленты
    this.sse.addEventListener('feed_update', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handlers.onFeedUpdate?.(data);
      } catch (error) {
        console.error('Failed to parse SSE feed update:', error);
      }
    });
    
    // Обработчик счетчиков
    this.sse.addEventListener('unread_count', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handlers.onUnreadCount?.(data);
      } catch (error) {
        console.error('Failed to parse SSE unread count:', error);
      }
    });
    
    this.sse.onerror = (error) => {
      console.error('SSE error:', error);
      // SSE автоматически переподключается
    };
  }
  
  // Подключение к обоим сервисам
  async connect(): Promise<void> {
    await this.connectWebSocket();
    this.connectSSE();
  }
  
  // Отключение
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    if (this.sse) {
      this.sse.close();
      this.sse = null;
    }
    
    this.stopPing();
  }
  
  // Подписка на канал
  subscribe(channel: string, options?: { lastMessageId?: string }): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Сохраняем для восстановления после подключения
      this.subscriptions.add(channel);
      return;
    }
    
    this.subscriptions.add(channel);
    this.send({
      type: 'subscribe',
      channel,
      data: options
    });
  }
  
  // Отписка от канала
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    
    this.send({
      type: 'unsubscribe',
      channel
    });
  }
  
  // Отправка сообщения
  sendMessage(channel: string, text: string, replyTo?: string): void {
    this.send({
      type: 'message',
      channel,
      data: { text, replyTo }
    });
  }
  
  // Индикатор набора текста
  sendTyping(channel: string, isTyping: boolean): void {
    this.send({
      type: 'typing',
      channel,
      data: { isTyping }
    });
  }
  
  // Обновление статуса присутствия
  updatePresence(status: 'online' | 'away' | 'busy' | 'offline'): void {
    this.send({
      type: 'presence',
      data: { status }
    });
  }
  
  // Внутренние методы
  private send(message: WSMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected');
      return;
    }
    
    this.ws.send(JSON.stringify(message));
  }
  
  private handleWebSocketMessage(message: WSIncomingMessage): void {
    switch (message.type) {
      case 'message':
        this.handlers.onMessage?.(message.channel, message.data);
        break;
        
      case 'typing':
        this.handlers.onTyping?.(message.channel, message.data);
        break;
        
      case 'presence':
        this.handlers.onPresence?.(message.data);
        break;
        
      case 'error':
        this.handlers.onError?.(message.data);
        break;
        
      case 'pong':
        // Обработка pong для проверки соединения
        break;
    }
  }
  
  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Каждые 30 секунд
  }
  
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
  private reconnect(): void {
    this.reconnectAttempts++;
    const timeout = Math.min(
      this.reconnectTimeout * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectTimeout
    );
    
    console.log(`Reconnecting in ${timeout}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connectWebSocket().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, timeout);
  }
}

// Пример использования
/*
const client = new SobranieRealtimeClient({
  apiUrl: 'https://api.sobranie.app',
  wsUrl: 'wss://api.sobranie.app',
  token: 'your-jwt-token'
});

// Настройка обработчиков
client
  .on('onConnect', () => {
    console.log('Connected to realtime services');
    
    // Подписываемся на каналы
    client.subscribe('notifications');
    client.subscribe('chat:global');
    client.subscribe('circle:123');
  })
  .on('onMessage', (channel, data) => {
    console.log(`New message in ${channel}:`, data);
  })
  .on('onTyping', (channel, data) => {
    console.log(`Typing in ${channel}:`, data);
  })
  .on('onNotification', (notification) => {
    console.log('New notification:', notification);
  })
  .on('onUnreadCount', (counts) => {
    console.log('Unread counts updated:', counts);
  });

// Подключение
await client.connect();

// Отправка сообщения
client.sendMessage('chat:global', 'Hello everyone!');

// Индикатор набора
client.sendTyping('chat:global', true);

// Обновление статуса
client.updatePresence('online');
*/
