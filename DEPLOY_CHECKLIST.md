# ✅ Чеклист деплоя Sobranie API

## 📋 Подготовка к деплою

### 1. GitHub Secrets
- [ ] `SERVER_HOST` = `176.98.176.195`
- [ ] `SERVER_USER` = `root`
- [ ] `SERVER_SSH_KEY` = Ваш приватный SSH ключ
- [ ] `SERVER_PORT` = `22` (опционально)

### 2. Проверка кода
- [x] TypeScript компилируется без ошибок
- [x] Dockerfile создан и оптимизирован
- [x] docker-compose.prod.yml настроен
- [x] GitHub Actions workflow готов
- [x] Caddy конфигурация подготовлена

### 3. На сервере
- [ ] SSH доступ работает
- [ ] Docker установлен
- [ ] Docker Compose установлен
- [ ] Caddy запущен или готов к установке
- [ ] Порты 80, 443 открыты

## 🚀 Процесс деплоя

### Шаг 1: Первоначальная настройка сервера
```bash
ssh root@176.98.176.195
curl -fsSL https://raw.githubusercontent.com/ВАШ_GITHUB_USERNAME/sobranie_elysia_api/main/deploy/setup-server.sh | bash
```

### Шаг 2: Настройка переменных окружения
```bash
cd /opt/sobranie-api
cat > .env.production << EOF
NODE_ENV=production
DATABASE_URL=postgresql://gen_user:W%7BI9FH%2Cfd%23YU%23E@109.196.100.98:5432/default_db
JWT_SECRET=$(openssl rand -base64 32)
LOG_LEVEL=info
EOF
chmod 600 .env.production
```

### Шаг 3: Запуск деплоя
1. Commit и push в main ветку:
   ```bash
   git add .
   git commit -m "feat: initial deployment setup"
   git push origin main
   ```

2. Или запустите вручную:
   - GitHub → Actions → Deploy to Production → Run workflow

## 🔍 Проверка после деплоя

### API эндпоинты:
- [ ] https://api.sobranie.yaropolk.tech/healthz - возвращает `{"status":"ok"}`
- [ ] https://api.sobranie.yaropolk.tech/openapi - открывается документация
- [ ] https://api.sobranie.yaropolk.tech/auth/register - работает регистрация
- [ ] wss://api.sobranie.yaropolk.tech/realtime/ws - WebSocket подключается

### Сертификат SSL:
- [ ] Проверить в браузере замочек 🔒
- [ ] Сертификат от Let's Encrypt
- [ ] Автообновление настроено

### Мониторинг:
```bash
# На сервере
docker ps | grep sobranie
docker logs -f sobranie-api --tail 50
curl http://localhost:3010/healthz
```

## ⚠️ Возможные проблемы

### 1. "Permission denied" при SSH
- Проверьте правильность SSH ключа в GitHub Secrets
- Убедитесь, что публичный ключ добавлен на сервер

### 2. "502 Bad Gateway"
- Проверьте, что контейнер запущен: `docker ps`
- Проверьте логи: `docker logs sobranie-api`
- Проверьте .env.production файл

### 3. "Certificate error"
- Проверьте DNS записи для api.sobranie.yaropolk.tech
- Проверьте логи Caddy: `docker logs caddy`

### 4. База данных недоступна
- Проверьте DATABASE_URL в .env.production
- Проверьте доступность PostgreSQL с сервера
- Проверьте файрвол на PostgreSQL сервере

## 📞 Полезные команды

```bash
# Статус
sobranie-status

# Логи
sobranie-logs

# Перезапуск
cd /opt/sobranie-api && docker-compose restart

# Обновление вручную
cd /opt/sobranie-api
docker-compose pull
docker-compose up -d
```

## 🎉 Успешный деплой!

Если все пункты выполнены, ваш API должен быть доступен по адресу:
**https://api.sobranie.yaropolk.tech** 🚀
