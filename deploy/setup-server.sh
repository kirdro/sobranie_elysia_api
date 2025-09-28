#!/bin/bash
# Скрипт первоначальной настройки сервера для Sobranie API

set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔧 Настройка сервера для Sobranie API${NC}"

# Проверяем, что скрипт запущен от root
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}Запустите скрипт от root пользователя${NC}"
   exit 1
fi

# Обновляем систему
echo -e "${GREEN}📦 Обновляем пакеты...${NC}"
apt update && apt upgrade -y

# Устанавливаем необходимые пакеты
echo -e "${GREEN}🔧 Устанавливаем необходимые пакеты...${NC}"
apt install -y curl git htop

# Проверяем Docker
if ! command -v docker &> /dev/null; then
    echo -e "${GREEN}🐳 Устанавливаем Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo -e "${GREEN}✅ Docker уже установлен${NC}"
fi

# Проверяем Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}🐳 Устанавливаем Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo -e "${GREEN}✅ Docker Compose уже установлен${NC}"
fi

# Создаем директории
echo -e "${GREEN}📁 Создаем необходимые директории...${NC}"
mkdir -p /opt/sobranie-api
mkdir -p /etc/caddy/sites-enabled
mkdir -p /var/log/caddy

# Создаем Docker сеть
echo -e "${GREEN}🔗 Создаем Docker сеть...${NC}"
docker network create caddy_network 2>/dev/null || true

# Проверяем Caddy
if ! docker ps | grep -q caddy; then
    echo -e "${YELLOW}⚠️  Caddy не запущен. Создаем базовую конфигурацию...${NC}"
    
    # Создаем Caddyfile
    cat > /etc/caddy/Caddyfile << 'EOF'
{
    email admin@yaropolk.tech
    admin off
}

import /etc/caddy/sites-enabled/*.caddy
EOF

    # Создаем docker-compose для Caddy
    cat > /opt/caddy-docker-compose.yml << 'EOF'
version: '3.8'

services:
  caddy:
    image: caddy:alpine
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/caddy/Caddyfile:/etc/caddy/Caddyfile
      - /etc/caddy/sites-enabled:/etc/caddy/sites-enabled
      - caddy_data:/data
      - caddy_config:/config
      - /var/log/caddy:/var/log/caddy
    networks:
      - caddy_network

volumes:
  caddy_data:
  caddy_config:

networks:
  caddy_network:
    external: true
EOF

    echo -e "${GREEN}🚀 Запускаем Caddy...${NC}"
    docker-compose -f /opt/caddy-docker-compose.yml up -d
else
    echo -e "${GREEN}✅ Caddy уже запущен${NC}"
fi

# Создаем пример .env.production
echo -e "${GREEN}📝 Создаем пример конфигурации...${NC}"
if [ ! -f /opt/sobranie-api/.env.production ]; then
    cat > /opt/sobranie-api/.env.production.example << 'EOF'
NODE_ENV=production
HOST=0.0.0.0
PORT=3000

# База данных
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT токен (сгенерируйте с помощью: openssl rand -base64 32)
JWT_SECRET=

# Логирование
LOG_LEVEL=info
EOF
    
    echo -e "${YELLOW}⚠️  Не забудьте настроить /opt/sobranie-api/.env.production${NC}"
fi

# Настраиваем файрвол
echo -e "${GREEN}🔒 Настраиваем файрвол...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo "y" | ufw enable
else
    echo -e "${YELLOW}⚠️  UFW не установлен, настройте файрвол вручную${NC}"
fi

# Создаем скрипт для просмотра логов
echo -e "${GREEN}📜 Создаем вспомогательные скрипты...${NC}"
cat > /usr/local/bin/sobranie-logs << 'EOF'
#!/bin/bash
docker logs -f sobranie-api --tail 100
EOF
chmod +x /usr/local/bin/sobranie-logs

cat > /usr/local/bin/sobranie-status << 'EOF'
#!/bin/bash
echo "🐳 Docker контейнеры:"
docker ps | grep -E "(sobranie|caddy)"
echo ""
echo "🏥 Health check:"
curl -s http://localhost:3010/healthz | jq . || echo "API не отвечает"
echo ""
echo "📊 Использование ресурсов:"
docker stats --no-stream sobranie-api
EOF
chmod +x /usr/local/bin/sobranie-status

echo -e "${GREEN}✅ Настройка сервера завершена!${NC}"
echo -e "${GREEN}📋 Следующие шаги:${NC}"
echo -e "  1. Настройте /opt/sobranie-api/.env.production"
echo -e "  2. Добавьте SSH ключ в GitHub Secrets"
echo -e "  3. Запустите деплой через GitHub Actions"
echo -e ""
echo -e "${GREEN}🛠️ Полезные команды:${NC}"
echo -e "  sobranie-logs   - просмотр логов"
echo -e "  sobranie-status - статус приложения"
echo -e "  docker ps       - список контейнеров"
