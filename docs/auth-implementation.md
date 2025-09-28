# 🔐 Авторизация и аутентификация в Sobranie API

## 📋 Обзор

В проекте реализована полноценная система авторизации с использованием JWT токенов. Система включает:

- ✅ Регистрация новых пользователей
- ✅ Вход по email и паролю
- ✅ JWT токены для авторизации
- ✅ Защита эндпоинтов
- ✅ Хеширование паролей (bcrypt)
- ✅ Смена пароля

## 🔑 API эндпоинты

### 1. Регистрация

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Ответ:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "USER"
  }
}
```

### 2. Вход

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Ответ:** такой же как при регистрации

### 3. Получение профиля

```http
GET /auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

**Ответ:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "USER",
  "isActive": true,
  "createdAt": "2025-09-23T12:42:56.784Z",
  "teamId": null,
  "avatarId": null
}
```

### 4. Смена пароля

```http
POST /auth/change-password
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

### 5. Выход

```http
POST /auth/logout
Authorization: Bearer YOUR_JWT_TOKEN
```

## 🏗️ Архитектура

### Auth модуль (`/src/modules/auth/index.ts`)

Основной модуль, содержащий все эндпоинты авторизации:
- Использует Prisma для работы с базой данных
- Хеширует пароли через Bun.password (bcrypt)
- Генерирует JWT токены через jose

### Auth плагин (`/src/plugins/auth.ts`)

Глобальный плагин, который:
- Извлекает токен из заголовков
- Проверяет валидность токена
- Добавляет данные пользователя в контекст

### Интерфейс AuthContext

```typescript
interface AuthContext {
  userId: string | null;
  email: string | null;
  role: string | null;
  isAuthenticated: boolean;
  token: string | null;
  payload: JWTPayload | null;
}
```

## 🔒 Безопасность

### Хеширование паролей

Используется bcrypt с cost factor 10:
```typescript
await Bun.password.hash(password, {
  algorithm: "bcrypt",
  cost: 10
});
```

### JWT токены

- Алгоритм: HS256
- Срок действия: 24 часа
- Payload содержит: userId, email, role

### Защита эндпоинтов

Для защиты эндпоинтов используйте auth контекст:

```typescript
.get("/protected", ({ auth, set }) => {
  if (!auth.isAuthenticated) {
    set.status = 401;
    return { error: "Unauthorized" };
  }
  
  // Доступ только для авторизованных
  return { userId: auth.userId };
})
```

## 🔧 Конфигурация

### Переменные окружения

Добавьте в `.env`:
```env
JWT_SECRET=your-super-secret-key-minimum-32-characters
```

**Важно:** Используйте надежный секретный ключ в production!

Генерация безопасного ключа:
```bash
openssl rand -base64 32
```

## 💡 Примеры использования

### JavaScript/TypeScript клиент

```typescript
// Регистрация
const register = async (email: string, password: string) => {
  const response = await fetch('http://localhost:3000/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) throw new Error('Registration failed');
  
  const data = await response.json();
  localStorage.setItem('token', data.accessToken);
  return data;
};

// Авторизованный запрос
const getProfile = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:3000/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  return response.json();
};
```

### React Hook

```typescript
import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    
    fetch('/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);
  
  const login = async (email: string, password: string) => {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    localStorage.setItem('token', data.accessToken);
    setUser(data.user);
    return data;
  };
  
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };
  
  return { user, loading, login, logout };
}
```

## 🚀 Интеграция с другими модулями

### WebSocket

WebSocket модуль уже интегрирован с auth:
```typescript
async open(ws) {
  const { auth } = ws.data;
  
  if (!auth.userId) {
    ws.close(1008, "Unauthorized");
    return;
  }
  
  // Пользователь авторизован
}
```

### SSE

SSE модуль также проверяет авторизацию:
```typescript
.get("/events", async ({ auth, prisma, set }) => {
  if (!auth.userId) {
    set.status = 401;
    return "Unauthorized";
  }
  
  // Отправка событий авторизованному пользователю
})
```

## ⚠️ Важные замечания

1. **Не храните JWT в localStorage для sensitive приложений** - используйте httpOnly cookies
2. **Добавьте refresh tokens** для долгоживущих сессий
3. **Реализуйте rate limiting** для защиты от brute force
4. **Добавьте двухфакторную аутентификацию** для критичных операций
5. **Логируйте попытки входа** для безопасности

## 📚 Дополнительные ресурсы

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Bun Password Hashing](https://bun.sh/docs/api/hashing#bun-password)
