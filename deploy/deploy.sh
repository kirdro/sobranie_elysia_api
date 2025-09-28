#!/bin/bash
set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Конфигурация
APP_NAME="sobranie-api"
APP_DIR="/opt/sobranie-api"
CADDY_DIR="/etc/caddy/sites-enabled"
DOCKER_NETWORK="caddy_network"

echo -e "${YELLOW}🚀 Начинаем деплой ${APP_NAME}...${NC}"

# Создаем директорию если не существует
echo -e "${GREEN}📁 Создаем директорию приложения...${NC}"
mkdir -p ${APP_DIR}
cd ${APP_DIR}

# Проверяем существование Docker сети
echo -e "${GREEN}🔗 Проверяем Docker сеть...${NC}"
docker network inspect ${DOCKER_NETWORK} >/dev/null 2>&1 || \
    docker network create ${DOCKER_NETWORK}

# Копируем docker-compose файл
echo -e "${GREEN}📋 Копируем конфигурацию...${NC}"
cp /tmp/docker-compose.prod.yml ${APP_DIR}/docker-compose.yml

# Проверяем наличие .env.production
if [ ! -f "${APP_DIR}/.env.production" ]; then
    echo -e "${RED}❌ Файл .env.production не найден!${NC}"
    echo -e "${YELLOW}📝 Создайте файл .env.production со следующими переменными:${NC}"
    echo "DATABASE_URL=postgresql://..."
    echo "JWT_SECRET=..."
    echo "LOG_LEVEL=info"
    exit 1
fi

# Останавливаем старый контейнер
echo -e "${GREEN}🛑 Останавливаем старую версию...${NC}"
docker-compose down --remove-orphans || true

# Загружаем новый образ
echo -e "${GREEN}📥 Загружаем новый образ...${NC}"
docker-compose pull

# Запускаем новый контейнер
echo -e "${GREEN}🚀 Запускаем новую версию...${NC}"
docker-compose up -d

# Ждем пока контейнер запустится
echo -e "${GREEN}⏳ Ожидаем запуска контейнера...${NC}"
sleep 10

# Проверяем здоровье
echo -e "${GREEN}🏥 Проверяем состояние приложения...${NC}"
if curl -f http://localhost:3010/healthz > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Приложение успешно запущено!${NC}"
else
    echo -e "${RED}❌ Приложение не отвечает!${NC}"
    echo -e "${YELLOW}📋 Логи контейнера:${NC}"
    docker-compose logs --tail=50
    exit 1
fi

# Настраиваем Caddy если еще не настроен
if [ ! -f "${CADDY_DIR}/sobranie-api.caddy" ]; then
    echo -e "${GREEN}🔧 Настраиваем Caddy...${NC}"
    cp /tmp/Caddyfile ${CADDY_DIR}/sobranie-api.caddy
    
    # Перезагружаем Caddy
    echo -e "${GREEN}🔄 Перезагружаем Caddy...${NC}"
    docker exec caddy caddy reload --config /etc/caddy/Caddyfile
fi

# Очищаем старые образы
echo -e "${GREEN}🧹 Очищаем старые Docker образы...${NC}"
docker image prune -f

echo -e "${GREEN}✨ Деплой завершен успешно!${NC}"
echo -e "${GREEN}🌐 API доступен по адресу: https://api.sobranie.yaropolk.tech${NC}"
echo -e "${GREEN}📚 OpenAPI документация: https://api.sobranie.yaropolk.tech/openapi${NC}"
