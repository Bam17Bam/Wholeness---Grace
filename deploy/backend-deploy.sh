#!/usr/bin/env bash
# ─── Backend Deployment Script ─────────────────────────────────
# Builds, pushes, and deploys the backend Docker image.

set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPO="${ECR_REPO:-wholeness-grace-api}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
EC2_HOST="${EC2_HOST:?Set EC2_HOST}"
EC2_USER="${EC2_USER:-ubuntu}"

echo "=== Backend Deploy ==="
echo "Region: $AWS_REGION | Tag: $IMAGE_TAG"

# Login to ECR
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com"

ECR_REGISTRY="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

# Build
docker build -t "$ECR_REPO:$IMAGE_TAG" -t "$ECR_REPO:latest" .

# Push
docker tag "$ECR_REPO:$IMAGE_TAG" "$ECR_REGISTRY/$ECR_REPO:$IMAGE_TAG"
docker tag "$ECR_REPO:latest" "$ECR_REGISTRY/$ECR_REPO:latest"
docker push "$ECR_REGISTRY/$ECR_REPO:$IMAGE_TAG"
docker push "$ECR_REGISTRY/$ECR_REPO:latest"

# Deploy to EC2 via SSH
ssh "$EC2_USER@$EC2_HOST" << SSH
  set -e
  aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
  docker pull $ECR_REGISTRY/$ECR_REPO:latest
  docker stop wholeness-api || true
  docker rm wholeness-api || true
  docker run -d --name wholeness-api --restart unless-stopped -p 3001:3001 \
    --env-file /home/$EC2_USER/.env.production \
    $ECR_REGISTRY/$ECR_REPO:latest
  docker image prune -f
SSH

# Health check
sleep 5
curl -sf "http://$EC2_HOST:3001/api/health" && echo "✅ Deploy OK" || echo "⚠️ Health check failed"