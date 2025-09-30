#!/bin/bash

# Script to update CORS configuration on production server
# This should be run on the production server

echo "🔧 Updating CORS configuration..."

# Navigate to application directory
cd /opt/sobranie-api || exit 1

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ .env.production not found!"
    exit 1
fi

# Update or add CORS_ORIGINS in .env.production
if grep -q "^CORS_ORIGINS=" .env.production; then
    # Update existing
    sed -i 's|^CORS_ORIGINS=.*|CORS_ORIGINS=http://localhost:3000,http://localhost:3001,https://sobranie.yaropolk.tech|' .env.production
    echo "✅ Updated existing CORS_ORIGINS"
else
    # Add new
    echo "" >> .env.production
    echo "# CORS Configuration" >> .env.production
    echo "CORS_ORIGINS=http://localhost:3000,http://localhost:3001,https://sobranie.yaropolk.tech" >> .env.production
    echo "✅ Added CORS_ORIGINS configuration"
fi

# Restart the container to apply changes
echo "🔄 Restarting container..."
docker-compose restart

# Wait for service to be healthy
sleep 10

# Check health
if curl -f http://localhost:3010/healthz > /dev/null 2>&1; then
    echo "✅ Service is healthy with new CORS configuration"
    echo "📝 Allowed origins:"
    grep "^CORS_ORIGINS=" .env.production
else
    echo "❌ Service health check failed"
    docker-compose logs --tail=50
    exit 1
fi