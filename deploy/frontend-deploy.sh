#!/usr/bin/env bash
# ─── Frontend Deployment Script ────────────────────────────────
# Builds and deploys the frontend to S3 + CloudFront.

set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
S3_BUCKET="${S3_BUCKET:?Set S3_BUCKET}"
CLOUDFRONT_ID="${CLOUDFRONT_ID:-}"

echo "=== Frontend Deploy ==="
echo "Region: $AWS_REGION | Bucket: $S3_BUCKET"

cd frontend

# Install and build
npm ci
npm run build

# Sync to S3
aws s3 sync out/ "s3://$S3_BUCKET/" --delete

# Invalidate CloudFront cache
if [ -n "$CLOUDFRONT_ID" ]; then
  aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_ID" --paths "/*"
  echo "✅ CloudFront cache invalidated"
fi

echo "✅ Frontend deployed to https://$S3_BUCKET.s3-website-$AWS_REGION.amazonaws.com"