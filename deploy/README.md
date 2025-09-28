# 🚀 Деплой Sobranie API

## 📋 Требования

- Docker и Docker Compose на сервере
- Caddy (reverse proxy)
- Доступ по SSH к серверу
- GitHub Container Registry для хранения образов

## 🔧 Первоначальная настройка

### 1. Настройка GitHub Secrets

В настройках репозитория добавьте следующие секреты:

- `SERVER_HOST` - IP адрес сервера (176.98.176.195)
- `SERVER_USER` - пользователь SSH (root)
- `SERVER_SSH_KEY` - приватный SSH ключ для доступа
- `SERVER_PORT` - порт SSH (по умолчанию 22)

### 2. Подготовка сервера

```bash
# Подключаемся к серверу
ssh root@176.98.176.195

# Создаем директорию для приложения
mkdir -p /opt/sobranie-api
cd /opt/sobranie-api

# Создаем файл с переменными окружения
cat > .env.production << EOF
NODE_ENV=production
DATABASE_URL=postgresql://gen_user:W%7BI9FH%2Cfd%23YU%23E@109.196.100.98:5432/default_db
JWT_SECRET=$(openssl rand -base64 32)
LOG_LEVEL=info
EOF

# Устанавливаем права
chmod 600 .env.production

# Создаем Docker сеть для Caddy
docker network create caddy_network || true

# Создаем директорию для Caddy конфигураций
mkdir -p /etc/caddy/sites-enabled
```

### 3. Настройка Caddy

Убедитесь, что Caddy настроен для загрузки конфигураций из `/etc/caddy/sites-enabled/`:

```caddyfile
# /etc/caddy/Caddyfile
import /etc/caddy/sites-enabled/*.caddy
```

## 🚀 Деплой

### Автоматический деплой

Деплой происходит автоматически при пуше в ветку `main`:

```bash
git add .
git commit -m "feat: новая функция"
git push origin main
```

### Ручной деплой

1. Запустите workflow вручную через GitHub Actions
2. Или выполните на сервере:

```bash
cd /opt/sobranie-api
docker-compose pull
docker-compose up -d
```

## 🔍 Мониторинг

### Проверка статуса

```bash
# Статус контейнера
docker ps | grep sobranie-api

# Логи приложения
docker logs -f sobranie-api

# Проверка здоровья
curl http://localhost:3010/healthz
```

### Доступ к API

- **API**: https://api.sobranie.yaropolk.tech
- **OpenAPI**: https://api.sobranie.yaropolk.tech/openapi
- **Health Check**: https://api.sobranie.yaropolk.tech/healthz

## 🛠️ Обслуживание

### Обновление переменных окружения

```bash
cd /opt/sobranie-api
nano .env.production
docker-compose restart
```

### Просмотр логов

```bash
# Логи приложения
docker logs -f sobranie-api --tail 100

# Логи Caddy
tail -f /var/log/caddy/api.sobranie.yaropolk.tech.log
```

### Бэкап базы данных

```bash
# Создание бэкапа (если БД локальная)
docker exec -t postgres pg_dump -U user dbname > backup.sql
```

## 🚨 Устранение неполадок

### Контейнер не запускается

1. Проверьте логи: `docker logs sobranie-api`
2. Проверьте переменные окружения: `docker-compose config`
3. Убедитесь, что порт 3010 свободен: `netstat -tlnp | grep 3010`

### 502 Bad Gateway

1. Проверьте, что контейнер запущен: `docker ps`
2. Проверьте health check: `curl http://localhost:3010/healthz`
3. Проверьте логи Caddy: `docker logs caddy`

### Проблемы с сертификатом

1. Проверьте DNS: `dig api.sobranie.yaropolk.tech`
2. Проверьте логи Caddy для ошибок Let's Encrypt
3. Убедитесь, что порты 80 и 443 открыты

## 📊 Метрики и мониторинг

Рекомендуется настроить:

1. **Prometheus** + **Grafana** для метрик
2. **Loki** для централизованного логирования
3. **Uptime Kuma** для мониторинга доступности

## 🔐 Безопасность

1. Регулярно обновляйте зависимости
2. Используйте сильные JWT секреты
3. Настройте файрвол (ufw/iptables)
4. Включите автоматические обновления системы
5. Настройте fail2ban для защиты SSH

## 📝 Чеклист после деплоя

- [ ] Проверить доступность API
- [ ] Проверить работу WebSocket
- [ ] Проверить HTTPS сертификат
- [ ] Проверить логи на ошибки
- [ ] Протестировать основные эндпоинты
- [ ] Настроить мониторинг
- [ ] Настроить бэкапы