import { Elysia, t } from "elysia";
import { prismaPlugin } from "../../plugins/prisma";
import { SignJWT, jwtVerify } from "jose";
import { env } from "../../config/env";

// Схемы для валидации
const authSchemas = {
  register: t.Object({
    email: t.String({ format: "email" }),
    password: t.String({ minLength: 8 }),
    firstName: t.Optional(t.String()),
    lastName: t.Optional(t.String())
  }),
  
  login: t.Object({
    email: t.String({ format: "email" }),
    password: t.String()
  }),
  
  token: t.Object({
    accessToken: t.String(),
    tokenType: t.Literal("Bearer"),
    expiresIn: t.Number(),
    user: t.Object({
      id: t.String(),
      email: t.String(),
      firstName: t.Union([t.String(), t.Null()]),
      lastName: t.Union([t.String(), t.Null()]),
      role: t.String()
    })
  }),
  
  refresh: t.Object({
    refreshToken: t.String()
  }),
  
  changePassword: t.Object({
    currentPassword: t.String(),
    newPassword: t.String({ minLength: 8 })
  })
};

// Вспомогательные функции
async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10
  });
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

async function generateToken(userId: string, email: string, role: string): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  
  const jwt = await new SignJWT({ 
    sub: userId,
    email,
    role 
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
    
  return jwt;
}

async function verifyToken(token: string): Promise<any> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

// Создаем модуль авторизации
export const authModule = new Elysia({
  name: "auth",
  prefix: "/auth",
  tags: ["auth"]
})
  .use(prismaPlugin)
  .model({
    "auth.register": authSchemas.register,
    "auth.login": authSchemas.login,
    "auth.token": authSchemas.token,
    "auth.refresh": authSchemas.refresh,
    "auth.changePassword": authSchemas.changePassword
  })
  // Регистрация
  .post("/register", async ({ body, prisma, set }) => {
    const { email, password, firstName, lastName } = body;
    
    // Проверяем, существует ли пользователь
    const existingUser = await prisma.users.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      set.status = 409;
      return {
        error: "User already exists",
        message: "Пользователь с таким email уже существует"
      };
    }
    
    // Хешируем пароль
    const hashedPassword = await hashPassword(password);
    
    try {
      // Создаем пользователя
      const user = await prisma.users.create({
        data: {
          id: crypto.randomUUID(),
          email,
          password: hashedPassword,
          firstName,
          lastName,
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true
        }
      });
      
      // Генерируем токен
      const accessToken = await generateToken(user.id, user.email, user.role);
      
      return {
        accessToken,
        tokenType: "Bearer" as const,
        expiresIn: 86400, // 24 часа
        user: {
          ...user,
          role: user.role.toString()
        }
      };
    } catch (error) {
      set.status = 500;
      return {
        error: "Registration failed",
        message: "Не удалось создать пользователя"
      };
    }
  }, {
    detail: {
      summary: "Register new user",
      description: "Создание нового пользователя с email и паролем"
    },
    body: "auth.register",
    response: {
      200: "auth.token",
      409: t.Object({
        error: t.String(),
        message: t.String()
      }),
      500: t.Object({
        error: t.String(),
        message: t.String()
      })
    }
  })
  // Вход
  .post("/login", async ({ body, prisma, set }) => {
    const { email, password } = body;
    
    // Находим пользователя
    const user = await prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    });
    
    if (!user) {
      set.status = 401;
      return {
        error: "Invalid credentials",
        message: "Неверный email или пароль"
      };
    }
    
    // Проверяем, активен ли пользователь
    if (!user.isActive) {
      set.status = 403;
      return {
        error: "Account disabled",
        message: "Аккаунт деактивирован"
      };
    }
    
    // Проверяем пароль
    const isValidPassword = await verifyPassword(password, user.password);
    
    if (!isValidPassword) {
      set.status = 401;
      return {
        error: "Invalid credentials",
        message: "Неверный email или пароль"
      };
    }
    
    // Генерируем токен
    const accessToken = await generateToken(user.id, user.email, user.role);
    
    return {
      accessToken,
      tokenType: "Bearer" as const,
      expiresIn: 86400, // 24 часа
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.toString()
      }
    };
  }, {
    detail: {
      summary: "User login",
      description: "Авторизация пользователя по email и паролю"
    },
    body: "auth.login",
    response: {
      200: "auth.token",
      401: t.Object({
        error: t.String(),
        message: t.String()
      }),
      403: t.Object({
        error: t.String(),
        message: t.String()
      })
    }
  })
  // Проверка токена и получение профиля
  .get("/me", async ({ headers, prisma, set }) => {
    const authHeader = headers.authorization || headers.Authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    
    if (!token) {
      set.status = 401;
      return {
        error: "No token provided",
        message: "Токен не предоставлен"
      };
    }
    
    const payload = await verifyToken(token);
    
    if (!payload) {
      set.status = 401;
      return {
        error: "Invalid token",
        message: "Недействительный токен"
      };
    }
    
    const user = await prisma.users.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        teamId: true,
        avatarId: true
      }
    });
    
    if (!user || !user.isActive) {
      set.status = 404;
      return {
        error: "User not found",
        message: "Пользователь не найден"
      };
    }
    
    return {
      ...user,
      role: user.role.toString(),
      createdAt: user.createdAt.toISOString()
    };
  }, {
    detail: {
      summary: "Get current user",
      description: "Получение информации о текущем авторизованном пользователе"
    },
    headers: t.Object({
      authorization: t.Optional(t.String())
    }),
    response: {
      200: t.Object({
        id: t.String(),
        email: t.String(),
        firstName: t.Union([t.String(), t.Null()]),
        lastName: t.Union([t.String(), t.Null()]),
        role: t.String(),
        isActive: t.Boolean(),
        createdAt: t.String(),
        teamId: t.Union([t.String(), t.Null()]),
        avatarId: t.Union([t.String(), t.Null()])
      }),
      401: t.Object({
        error: t.String(),
        message: t.String()
      }),
      404: t.Object({
        error: t.String(),
        message: t.String()
      })
    }
  })
  // Смена пароля
  .post("/change-password", async ({ body, headers, prisma, set }) => {
    const authHeader = headers.authorization || headers.Authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    
    if (!token) {
      set.status = 401;
      return {
        error: "No token provided",
        message: "Токен не предоставлен"
      };
    }
    
    const payload = await verifyToken(token);
    
    if (!payload) {
      set.status = 401;
      return {
        error: "Invalid token",
        message: "Недействительный токен"
      };
    }
    
    const { currentPassword, newPassword } = body;
    
    // Получаем пользователя с паролем
    const user = await prisma.users.findUnique({
      where: { id: payload.sub },
      select: { password: true }
    });
    
    if (!user) {
      set.status = 404;
      return {
        error: "User not found",
        message: "Пользователь не найден"
      };
    }
    
    // Проверяем текущий пароль
    const isValidPassword = await verifyPassword(currentPassword, user.password);
    
    if (!isValidPassword) {
      set.status = 401;
      return {
        error: "Invalid password",
        message: "Неверный текущий пароль"
      };
    }
    
    // Хешируем новый пароль
    const hashedPassword = await hashPassword(newPassword);
    
    // Обновляем пароль
    await prisma.users.update({
      where: { id: payload.sub },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });
    
    return {
      success: true,
      message: "Пароль успешно изменен"
    };
  }, {
    detail: {
      summary: "Change password",
      description: "Изменение пароля текущего пользователя"
    },
    headers: t.Object({
      authorization: t.Optional(t.String())
    }),
    body: "auth.changePassword",
    response: {
      200: t.Object({
        success: t.Boolean(),
        message: t.String()
      }),
      401: t.Object({
        error: t.String(),
        message: t.String()
      }),
      404: t.Object({
        error: t.String(),
        message: t.String()
      })
    }
  })
  // Выход (опционально, для инвалидации токена на клиенте)
  .post("/logout", () => {
    // В случае с JWT токенами, выход обычно происходит на клиенте
    // Здесь можно добавить логику для blacklist токенов если нужно
    return {
      success: true,
      message: "Вы успешно вышли из системы"
    };
  }, {
    detail: {
      summary: "User logout",
      description: "Выход из системы (очистка токена на клиенте)"
    },
    response: {
      200: t.Object({
        success: t.Boolean(),
        message: t.String()
      })
    }
  });
