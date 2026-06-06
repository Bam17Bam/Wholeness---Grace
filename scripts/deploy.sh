#!/usr/bin/env bash
# ─── Wholeness and Grace — Deployment Script ───────────────────
#
# Usage:
#   ./scripts/deploy.sh [staging|production]
#
# Prerequisites:
#   - Docker and docker-compose installed
#   - AWS CLI configured (for production)
#   - Environment-specific .env file present
#
# This script handles:
#   - Environment validation
#   - Docker image build and push
#   - Database migration
#   - Rolling deployment with zero-downtime

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# ─── Configuration ─────────────────────────────────────────────
ENVIRONMENT="${1:-staging}"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.${ENVIRONMENT}"

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
  echo "Error: Environment must be 'staging' or 'production'"
  echo "Usage: $0 [staging|production]"
  exit 1
fi

# ─── Load environment ──────────────────────────────────────────
if [ -f "$ENV_FILE" ]; then
  echo "📝 Loading environment: $ENVIRONMENT"
  set -a
  source "$ENV_FILE"
  set +a
elif [ -f ".env" ]; then
  echo "⚠️  No .env.${ENVIRONMENT} found, falling back to .env"
  set -a
  source ".env"
  set +a
else
  echo "❌ No environment file found (.env.${ENVIRONMENT} or .env)"
  exit 1
fi

# ─── Pre-deployment checks ─────────────────────────────────────
echo "🔍 Running pre-deployment checks..."

# Docker availability
if ! command -v docker &> /dev/null; then
  echo "❌ Docker is not installed"
  exit 1
fi

# Database connectivity (if local)
if [ "$ENVIRONMENT" = "staging" ]; then
  echo "  • Testing local database..."
  docker compose -f "$COMPOSE_FILE" exec -T db pg_isready -U postgres 2>/dev/null || {
    echo "  ⚠️  Database not running. Starting services..."
    docker compose -f "$COMPOSE_FILE" up -d db
    sleep 5
  }
fi

# ─── Build ──────────────────────────────────────────────────────
echo "🏗️  Building application..."
if [ "$ENVIRONMENT" = "production" ]; then
  # Production: build Docker image
  TAG="${TAG:-$(git rev-parse --short HEAD)}"
  IMAGE_NAME="wholeness-grace-api:${TAG}"

  echo "  • Building Docker image: ${IMAGE_NAME}"
  docker build -t "${IMAGE_NAME}" -t "wholeness-grace-api:latest" .

  # Push to registry (configure for your registry)
  if [ -n "${DOCKER_REGISTRY:-}" ]; then
    echo "  • Pushing to registry: ${DOCKER_REGISTRY}"
    docker tag "${IMAGE_NAME}" "${DOCKER_REGISTRY}/${IMAGE_NAME}"
    docker push "${DOCKER_REGISTRY}/${IMAGE_NAME}"
  fi
else
  # Staging: build with docker-compose
  echo "  • Building with docker-compose..."
  docker compose -f "$COMPOSE_FILE" build
fi

# ─── Database Migrations ───────────────────────────────────────
echo "🗄️  Running database migrations..."
if command -v npx &> /dev/null; then
  npx tsx src/migrations/run.ts
else
  docker compose -f "$COMPOSE_FILE" run --rm api npx tsx src/migrations/run.ts
fi

# ─── Seed (staging only) ───────────────────────────────────────
if [ "$ENVIRONMENT" = "staging" ]; then
  echo "🌱 Seeding development data..."
  if command -v npx &> /dev/null; then
    npx tsx src/migrations/seed.ts
  else
    docker compose -f "$COMPOSE_FILE" run --rm api npx tsx src/migrations/seed.ts
  fi
fi

# ─── Deploy ─────────────────────────────────────────────────────
echo "🚀 Deploying application..."

if [ "$ENVIRONMENT" = "production" ]; then
  # Production: rolling update
  docker compose -f "$COMPOSE_FILE" up -d --no-deps --scale api=2 api
  sleep 10

  # Health check
  echo "  • Running health check..."
  for i in $(seq 1 5); do
    if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
      echo "  ✅ Health check passed"
      break
    fi
    echo "  • Waiting for service... (attempt $i/5)"
    sleep 3
  done

  # Remove old container
  docker container prune -f --filter "until=5m"
else
  # Staging: simple restart
  docker compose -f "$COMPOSE_FILE" up -d
fi

# ─── Post-deployment ───────────────────────────────────────────
echo "✅ Deployment complete! (${ENVIRONMENT})"
echo "   API:        http://localhost:3001"
echo "   Health:     http://localhost:3001/api/health"
echo "   Frontend:   http://localhost:5173 (dev) / http://localhost:3000 (prod)"
echo ""

# Print version info
if [ -f package.json ]; then
  VERSION=$(node -e "console.log(require('./package.json').version)")
  echo "   Version:    ${VERSION}"
fi

exit 0