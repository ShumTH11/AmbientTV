#!/usr/bin/env bash
set -euo pipefail

# AmbientTV Docker Deployment Script
# Usage: ./deploy-docker.sh [dev|prod]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV="${1:-dev}"

echo "====================================="
echo "AmbientTV Docker Deployment"
echo "Environment: $ENV"
echo "====================================="

cd "$SCRIPT_DIR"

# Check prerequisites
echo "[1/5] Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { echo "docker is required but not installed. Aborting."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "docker-compose is required but not installed. Aborting."; exit 1; }

# Check .env exists
if [[ ! -f "backend/.env" ]]; then
    echo "ERROR: backend/.env not found. Copy from .env.example and configure."
    exit 1
fi

# Build image
echo "[2/5] Building Docker image..."
docker build -t ambienttv/backend:latest ./backend

# Deploy
echo "[3/5] Starting services..."
if [[ "$ENV" == "prod" ]]; then
    docker-compose -f docker-compose.prod.yml up -d
else
    docker-compose up -d
fi

# Wait for health
echo "[4/5] Waiting for health checks..."
sleep 5

MAX_RETRIES=30
RETRY=0
while [[ $RETRY -lt $MAX_RETRIES ]]; do
    if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
        echo "Health check: OK"
        break
    fi
    RETRY=$((RETRY + 1))
    echo "Waiting for backend... ($RETRY/$MAX_RETRIES)"
    sleep 2
done

if [[ $RETRY -eq $MAX_RETRIES ]]; then
    echo "ERROR: Backend failed to start"
    docker-compose logs backend
    exit 1
fi

# Verify Redis
echo "[5/5] Verifying Redis..."
if docker-compose exec -T redis redis-cli ping | grep -q PONG; then
    echo "Redis: OK"
else
    echo "WARNING: Redis not responding"
fi

echo ""
echo "====================================="
echo "Deployment complete!"
echo ""
if [[ "$ENV" == "prod" ]]; then
    echo "Backend: http://localhost (via nginx)"
else
    echo "Backend: http://localhost:3000"
fi
echo ""
echo "Useful commands:"
echo "  docker-compose logs -f backend"
echo "  docker-compose logs -f redis"
echo "  docker-compose ps"
echo "  docker-compose down"
echo "====================================="
