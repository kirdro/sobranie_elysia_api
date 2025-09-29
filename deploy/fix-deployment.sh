#!/bin/bash

# 🔧 Скрипт для исправления деплоя Sobranie API

set -e  # Выход при ошибке

echo "🔧 Исправляем деплой Sobranie API..."

# Переходим в директорию приложения
cd /opt/sobranie-api

# Останавливаем существующие контейнеры
echo "⏹️  Останавливаем старые контейнеры..."
docker-compose down || true

# Загружаем правильный docker-compose.yml
echo "📥 Загружаем обновленный docker-compose.yml..."
curl -fsSL https://raw.githubusercontent.com/kirdro/sobranie_elysia_api/main/docker-compose.prod.yml -o docker-compose.yml

# Проверяем наличие .env.production
if [ ! -f .env.production ]; then
    echo "📝 Создаем .env.production файл..."
    
    # Загружаем пример конфигурации
    curl -fsSL https://raw.githubusercontent.com/kirdro/sobranie_elysia_api/main/env.production.example -o .env.production
    
    echo ""
    echo "⚠️  ВНИМАНИЕ: Необходимо настроить .env.production!"
    echo "📝 Откройте файл и измените JWT_SECRET на безопасный ключ:"
    echo "   nano .env.production"
    echo ""
    echo "🔑 Генерация JWT секрета:"
    echo "   openssl rand -base64 32"
    echo ""
fi

# Создаем директории
mkdir -p logs
chmod 755 logs

# Загружаем Docker образ
echo "🐳 Загружаем Docker образ..."
docker pull ghcr.io/kirdro/sobranie_elysia_api:latest

# Проверяем Caddy сеть
echo "🌐 Проверяем Caddy сеть..."
docker network inspect caddy_network >/dev/null 2>&1 || docker network create caddy_network

# Запускаем контейнер
echo "🚀 Запускаем контейнер..."
docker-compose up -d

# Ждем запуска
echo "⏳ Ждем запуска приложения..."
sleep 15

# Проверяем статус
echo "📊 Статус контейнеров:"
docker-compose ps

# Проверяем логи
echo ""
echo "📋 Последние логи:"
docker-compose logs --tail=20

# Проверяем доступность
echo ""
echo "🔍 Проверяем доступность API..."
if curl -f http://localhost:3010/healthz > /dev/null 2>&1; then
    echo "✅ API работает на localhost:3010!"
    
    # Проверяем Caddy конфигурацию
    if curl -f https://api.sobranie.yaropolk.tech/healthz > /dev/null 2>&1; then
        echo "✅ API доступно через HTTPS!"
    else
        echo "⚠️  API работает локально, но не доступно через HTTPS"
        echo "   Проверьте конфигурацию Caddy"
    fi
else
    echo "❌ API не отвечает на localhost:3010"
    echo "   Проверьте логи: docker-compose logs"
fi

echo ""
echo "🎉 Исправление завершено!"
echo ""
echo "📋 Дальнейшие действия:"
echo "1. Настройте .env.production с правильным JWT_SECRET"
echo "2. Обновите конфигурацию Caddy для api.sobranie.yaropolk.tech"
echo "3. Перезапустите: docker-compose down && docker-compose up -d"
