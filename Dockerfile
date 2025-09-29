# Build stage
FROM oven/bun:1.2.20-alpine AS builder

WORKDIR /app

# Копируем файлы зависимостей и Prisma схему сразу
COPY package.json bun.lockb* ./
COPY prisma ./prisma

# Устанавливаем зависимости без postinstall скриптов
RUN bun install --frozen-lockfile --ignore-scripts || bun install --ignore-scripts

# Генерируем Prisma клиент вручную
RUN bunx prisma generate

# Копируем исходный код
COPY . .

# Собираем приложение
RUN bun build src/index.ts --target bun --outdir dist

# Production stage
FROM oven/bun:1.2.20-alpine

# Устанавливаем необходимые пакеты для Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Создаем пользователя для запуска приложения
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Копируем необходимые файлы из builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Создаем директорию для логов
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Переключаемся на пользователя nodejs
USER nodejs

# Экспонируем порт
EXPOSE 3000

# Проверка здоровья контейнера
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun --eval "fetch('http://localhost:3000/healthz').then(r => process.exit(r.ok ? 0 : 1))" || exit 1

# Запускаем приложение
CMD ["bun", "run", "dist/index.js"]