#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Webhook Viewer Deployment Script${NC}"
echo "======================================"

if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Error: .env.production not found!${NC}"
    echo "Please create .env.production file with your credentials"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Error: Docker not installed!${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Error: Docker Compose not installed!${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Copying production configs...${NC}"
cp .env.production .env
cp Dockerfile.production Dockerfile
cp docker-compose.production.yml docker-compose.yml
cp nginx.production.conf nginx.conf

if [ ! -f mongo-init.js ]; then
    echo -e "${YELLOW}⚠️  Warning: mongo-init.js not found. Creating...${NC}"
    cat > mongo-init.js << 'EOF'
db = db.getSiblingDB('webhook_viewer');

db.createUser({
  user: 'webhook_user',
  pwd: process.env.MONGO_USER_PASSWORD || 'WebhookUserPassword456!',
  roles: [
    { role: 'readWrite', db: 'webhook_viewer' },
    { role: 'dbAdmin', db: 'webhook_viewer' }
  ]
});

db.createCollection('users');
db.createCollection('rooms');
db.createCollection('webhooks');
db.createCollection('fake_errors');

print('✅ Database initialized successfully');
EOF
fi

# Останавливаем старые контейнеры
echo -e "${YELLOW}🛑 Stopping old containers...${NC}"
docker-compose down || true

# Удаляем старые образы (опционально)
read -p "Remove old images? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🗑️  Removing old images...${NC}"
    docker-compose down --rmi all --volumes --remove-orphans || true
fi

# Сборка новых образов
echo -e "${YELLOW}🔨 Building images...${NC}"
docker-compose build --no-cache

# Запуск контейнеров
echo -e "${YELLOW}🚀 Starting containers...${NC}"
docker-compose up -d

# Ждем пока контейнеры запустятся
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 10

# Проверяем статус
echo -e "${YELLOW}📊 Checking services status...${NC}"
docker-compose ps

# Проверяем health
echo -e "${YELLOW}🏥 Checking health endpoints...${NC}"
sleep 5

if curl -f http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${RED}❌ Health check failed!${NC}"
    echo -e "${YELLOW}Checking logs...${NC}"
    docker-compose logs webhook-app
    exit 1
fi

echo -e "${YELLOW}📜 Last logs:${NC}"
docker-compose logs --tail=20

echo ""
echo -e "${GREEN}======================================"
echo -e "✅ Deployment completed successfully!"
echo -e "======================================${NC}"
echo ""
echo "📍 Services:"
echo "   - Webhook Viewer: http://localhost"
echo "   - Admin Panel:    http://localhost/admin.html"
echo "   - Login:          http://localhost/login.html"
echo "   - Health Check:   http://localhost/health"
echo ""
echo "🔧 Useful commands:"
echo "   - View logs:      docker-compose logs -f"
echo "   - Stop services:  docker-compose down"
echo "   - Restart:        docker-compose restart"
echo "   - Shell:          docker exec -it webhook-app sh"
echo ""
echo "🔐 Default admin: admin / admin"
echo "⚠️  CHANGE DEFAULT PASSWORD IN PRODUCTION!"
echo ""

read -p "Show live logs? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose logs -f
fi