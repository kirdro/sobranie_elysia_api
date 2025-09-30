#!/bin/bash

# Команды для выполнения на продакшн сервере 176.98.176.195
# Подключитесь: ssh root@176.98.176.195

echo "🔍 Поиск контейнера sobranie-api..."

# 1. Найти контейнер с sobranie API
docker ps | grep sobranie

# 2. Найти директорию проекта
find /opt /home -name "sobranie*" -type d 2>/dev/null | grep -v ".git"

# 3. Перейти в директорию проекта (обычно /opt/sobranie-api)
cd /opt/sobranie-api || cd /opt/sobranie || exit 1

# 4. Проверить текущие переменные окружения
echo "📋 Текущий .env.production:"
cat .env.production

# 5. Добавить CORS_ORIGINS если его нет
if ! grep -q "^CORS_ORIGINS=" .env.production; then
    echo "" >> .env.production
    echo "# CORS Configuration" >> .env.production
    echo "CORS_ORIGINS=http://localhost:3000,http://localhost:3001,https://sobranie.yaropolk.tech" >> .env.production
    echo "✅ Добавлен CORS_ORIGINS"
else
    # Обновить существующий
    cp .env.production .env.production.backup
    sed -i 's|^CORS_ORIGINS=.*|CORS_ORIGINS=http://localhost:3000,http://localhost:3001,https://sobranie.yaropolk.tech|' .env.production
    echo "✅ Обновлен CORS_ORIGINS"
fi

# 6. Перезапустить контейнер
echo "🔄 Перезапуск контейнера..."
docker-compose pull
docker-compose up -d --force-recreate

# 7. Проверить логи
sleep 5
echo "📜 Последние логи:"
docker-compose logs --tail=20

# 8. Проверить здоровье
if curl -f http://localhost:3010/healthz > /dev/null 2>&1; then
    echo "✅ API работает!"
else
    echo "⚠️ API не отвечает на healthz"
fi

# 9. Проверить Caddy конфигурацию для api.sobranie.yaropolk.tech
echo "🔍 Проверка Caddy:"
cat /etc/caddy/Caddyfile | grep -A5 "api.sobranie"