#!/bin/bash
set -e

echo "🚀 AmbientTV Local Deploy"
echo "=========================="

# Check docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Install: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose not found. Install: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check .env exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️  backend/.env not found. Creating from example..."
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo "✅ Created backend/.env — edit it with your API keys"
    else
        echo "❌ No .env or .env.example found"
        exit 1
    fi
fi

# Pull latest
echo "📥 Pulling latest code..."
git pull origin master || true

# Build and start
echo "🏗️  Building containers..."
docker compose down 2>/dev/null || true
docker compose up -d --build

# Wait for health
echo "⏳ Waiting for health check..."
for i in {1..10}; do
    if curl -s http://localhost:3000/api/health | grep -q '"status":"ok"'; then
        echo "✅ AmbientTV is running at http://localhost:3000"
        echo ""
        echo "📊 Status:"
        docker compose ps
        exit 0
    fi
    sleep 2
done

echo "❌ Health check failed. View logs:"
docker compose logs ambienttv
exit 1
