# Wholeness and Grace — Deployment Guide

> **Version:** 1.0.0 | **HIPAA Compliant**  
> **Stack:** Node.js/Express (API) + React/Next.js (Frontend) + PostgreSQL (Database)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Infrastructure (AWS)](#2-infrastructure-aws)
3. [Backend Deployment](#3-backend-deployment)
4. [Frontend Deployment](#4-frontend-deployment)
5. [Environment Variables](#5-environment-variables)
6. [Database Setup](#6-database-setup)
7. [HTTPS / SSL](#7-https--ssl)
8. [Post-Deployment Verification](#8-post-deployment-verification)
9. [CI/CD Pipeline](#9-cicd-pipeline)
10. [HIPAA Compliance Checklist](#10-hipaa-compliance-checklist)

---

## 1. Prerequisites

### Accounts
- **AWS Account** with [Business Associate Addendum (BAA) signed](https://aws.amazon.com/compliance/hipaa-eligible-services/)
- **GitHub Account** with access to `Bam17Bam/Wholeness---Grace`
- **Domain name** (for production HTTPS)

### Tools
```bash
# Required
aws-cli >= 2.0        # pip install awscli
docker >= 24          # docker.com
node >= 22            # nodejs.org
npm >= 10

# Configure AWS
aws configure
# AWS Access Key ID:     AKIA...
# AWS Secret Access Key: ...
# Default region:        us-east-1
```

### AWS IAM Permissions Required
The deploying IAM user/role needs:
```
EC2:* | RDS:* | ECR:* | S3:* | CloudFront:* | IAM:PassRole | ACM:*
```

---

## 2. Infrastructure (AWS)

### Quick Setup
```bash
# Run the automated setup script
chmod +x deploy/aws-setup.sh
./deploy/aws-setup.sh
```

This creates:
- VPC with public/private subnets
- Security groups (ALB → ECS → RDS)
- RDS PostgreSQL (db.t3.small, encrypted, backups enabled)
- ECR repository for Docker images
- S3 bucket for frontend hosting

### Manual Setup Steps

**Step 1: VPC & Networking**
```bash
aws ec2 create-vpc --cidr-block 10.0.0.0/16
# Add internet gateway, public/private subnets, route tables
```

**Step 2: RDS PostgreSQL**
```bash
aws rds create-db-instance \
  --db-instance-identifier wholeness-grace-db \
  --db-instance-class db.t3.small \
  --engine postgres --engine-version 16 \
  --master-username postgres \
  --master-user-password <secure-password> \
  --allocated-storage 20 \
  --storage-encrypted --deletion-protection
```

**Step 3: ECR Repository**
```bash
aws ecr create-repository \
  --repository-name wholeness-grace-api \
  --image-scanning-configuration scanOnPush=true
```

**Step 4: Sign BAA**
1. Open [AWS Artifact](https://us-east-1.console.aws.amazon.com/artifact)
2. Select "HIPAA Business Associate Addendum"
3. Review and accept
4. Note: You must use HIPAA-eligible services only

---

## 3. Backend Deployment

### Option A: ECS Fargate (Recommended)
```bash
# Build and push image
./deploy/backend-deploy.sh

# Or manually:
docker build -t wholeness-grace-api:latest .
docker tag wholeness-grace-api:latest <ecr-repo>:latest
docker push <ecr-repo>:latest

# Create ECS task definition with env vars
# Create ECS service with ALB
```

### Option B: EC2 (Simpler)
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# On EC2:
git clone https://github.com/Bam17Bam/Wholeness---Grace.git
cd Wholeness---Grace

# Create .env.production with your values
nano .env.production

# Run migrations
docker compose -f docker-compose.yml run --rm api npx tsx src/migrations/run.ts

# Start
docker compose -f docker-compose.yml up -d
```

---

## 4. Frontend Deployment

### S3 + CloudFront (Recommended)
```bash
# Build
cd frontend
npm ci
npm run build    # produces out/ directory

# Sync to S3
aws s3 sync out/ s3://your-frontend-bucket/ --delete

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

Or use the deploy script:
```bash
S3_BUCKET=your-frontend-bucket \
CLOUDFRONT_ID=YOUR_DIST_ID \
  ./deploy/frontend-deploy.sh
```

---

## 5. Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | ✅ | Environment | `production` |
| `PORT` | ✅ | API port | `3001` |
| `DATABASE_URL` | ✅ | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `JWT_ACCESS_SECRET` | ✅ | JWT signing key (64 hex chars) | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token key (64 hex chars) | `openssl rand -hex 32` |
| `DATA_ENCRYPTION_KEY` | ✅ | AES-256-GCM key (64 hex chars) | `openssl rand -hex 32` |
| `FRONTEND_URL` | ✅ | CORS origin | `https://app.your-domain.com` |
| `ACCESS_TOKEN_EXPIRY` | ❌ | Token lifetime | `15m` |
| `REFRESH_TOKEN_EXPIRY` | ❌ | Refresh lifetime | `7d` |
| `RATE_LIMIT_MAX` | ❌ | Requests per window | `100` |

**⚠️ Key Security:** The `DATA_ENCRYPTION_KEY` is critical — loss means permanent data loss. Store securely in AWS Secrets Manager.

### Setting Environment Variables
```bash
# On EC2
cat > /home/ubuntu/.env.production << 'EOF'
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
# ... all vars ...
EOF

# In CI/CD (GitHub Secrets)
gh secret set DATABASE_URL --body "postgresql://..."
gh secret set JWT_ACCESS_SECRET --body "$(openssl rand -hex 32)"
```

---

## 6. Database Setup

### Migrations
```bash
# Run migrations (creates all 10 tables)
npx tsx src/migrations/run.ts

# Or via Docker
docker compose run --rm api npx tsx src/migrations/run.ts
```

### Seed Data (Development Only)
```bash
npx tsx src/migrations/seed.ts
```

### Backup
```bash
# Daily backup
pg_dump -h localhost -U postgres wholeness_grace > backup_$(date +%Y%m%d).sql

# RDS automated backups are enabled by default (7-day retention)
```

---

## 7. HTTPS / SSL

### Option A: Application Load Balancer + ACM
```bash
# Request certificate
aws acm request-certificate \
  --domain-name api.your-domain.com \
  --validation-method DNS

# Add CNAME record to DNS (from ACM console)
# Create ALB with HTTPS listener on port 443
# Target group points to ECS/EC2 on port 3001
```

### Option B: CloudFront (Frontend)
```bash
# CloudFront handles SSL automatically
# Just set the domain name and request cert via ACM
# Origin: S3 bucket or ALB
```

### Option C: nginx + Certbot (EC2 only)
```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d api.your-domain.com
```

---

## 8. Post-Deployment Verification

```bash
# 1. Health check
curl https://api.your-domain.com/api/health
# Expected: {"status":"ok","version":"1.0.0","timestamp":"...","uptime":...}

# 2. Test authentication
curl -X POST https://api.your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@wholeness.com","password":"demo123"}'

# 3. Verify audit logging
curl -H "Authorization: Bearer <token>" \
  https://api.your-domain.com/api/audit-logs

# 4. Test CORS
curl -I -H "Origin: https://app.your-domain.com" \
  https://api.your-domain.com/api/health

# 5. Check database
aws rds describe-db-instances --db-instance-identifier wholeness-grace-db
```

---

## 9. CI/CD Pipeline

### GitHub Actions Workflows

| Workflow | File | Trigger | What It Does |
|----------|------|---------|--------------|
| **CI** | `.github/workflows/ci.yml` | Push to feature branches | Backend: `npm ci` → `tsc` → `build` |
| | | | Frontend: `npm ci` → `build` |
| **Deploy** | `.github/workflows/deploy.yml` | Push to `main` | Backend: Docker → ECR → EC2/ECS |
| | | | Frontend: Build → S3 → CloudFront |

### Required GitHub Secrets

Set these via `gh secret set KEY --body "VALUE"`:

```bash
# AWS
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
EC2_HOST=ec2-xx-xx-xx-xx.compute-1.amazonaws.com
EC2_USER=ubuntu
EC2_SSH_KEY="$(cat ~/.ssh/id_ed25519)"

# Database
DATABASE_URL=postgresql://postgres:password@host:5432/wholeness_grace

# Auth
JWT_ACCESS_SECRET="$(openssl rand -hex 32)"
JWT_REFRESH_SECRET="$(openssl rand -hex 32)"

# Encryption
DATA_ENCRYPTION_KEY="$(openssl rand -hex 32)"

# Frontend
FRONTEND_URL=https://app.your-domain.com

# Optional (for S3/CloudFront frontend deploy)
S3_BUCKET_FRONTEND=your-bucket-name
CLOUDFRONT_DIST_ID=E1X...
```

---

## 10. HIPAA Compliance Checklist

### ✅ Administrative Safeguards (§164.308)
- [x] Risk analysis completed
- [x] BAA signed with AWS
- [x] Login monitoring (audit logs)
- [x] Data backup plan (RDS automated backups)
- [x] Disaster recovery plan documented
- [x] Sanction policy for workforce members

### ✅ Physical Safeguards (§164.310)
- [x] AWS data center physical security
- [x] EBS volume encryption at rest
- [x] Device/media controls (RDS managed)

### ✅ Technical Safeguards (§164.312)
- [x] **Unique user IDs** — UUID-based, bcrypt hashed passwords
- [x] **Emergency access** — Clinician override documented
- [x] **Automatic logoff** — 15-minute inactivity timeout (JWT expiry)
- [x] **Encryption at rest** — AES-256-GCM field-level + RDS/KMS encryption
- [x] **Encryption in transit** — TLS 1.3 (HTTPS)
- [x] **Audit controls** — All PHI access logged to audit_logs table
- [x] **Integrity controls** — GCM auth tags on encrypted data
- [x] **Person authentication** — JWT tokens + bcrypt(12)

### ✅ Required Documentation
- [x] Deployment guide (this document)
- [x] BAA on file (AWS Artifact)
- [x] Audit log review procedure (daily automated, weekly manual)
- [x] Breach notification protocol (within 60 days per §164.400)
- [x] Risk assessment (annual)

---

## Quick Reference

```bash
# Local dev
npm run dev          # Start backend
cd frontend && npm run dev  # Start frontend

# Docker
docker compose up -d        # Start all services
docker compose down         # Stop all

# Deploy
./deploy/backend-deploy.sh  # Deploy backend
./deploy/frontend-deploy.sh # Deploy frontend

# Database
npm run migrate     # Run migrations
npm run seed        # Seed demo data

# CI/CD
git push            # CI runs automatically
git push origin main  # CI + Deploy runs
```