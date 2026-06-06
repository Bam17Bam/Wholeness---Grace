# Wholeness and Grace — HIPAA-Compliant Deployment Guide

> **Version:** 1.0.0 | **Last Updated:** June 2026  
> **Application:** HIPAA-compliant therapy homework companion API  
> **Tech Stack:** Node.js/Express/TypeScript + PostgreSQL + JWT + AES-256-GCM

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [HIPAA Compliance Checklist](#2-hipaa-compliance-checklist)
3. [Prerequisites](#3-prerequisites)
4. [Local Development Setup](#4-local-development-setup)
5. [Production Deployment (AWS)](#5-production-deployment-aws)
6. [CI/CD Pipeline](#6-cicd-pipeline)
7. [Environment Configuration](#7-environment-configuration)
8. [Database Management](#8-database-management)
9. [Monitoring & Alerting](#9-monitoring--alerting)
10. [Incident Response](#10-incident-response)
11. [Breach Notification Protocol](#11-breach-notification-protocol)
12. [Security Hardening](#12-security-hardening)

---

## 1. Architecture Overview

```
┌──────────────────┐       ┌───────────────────┐       ┌──────────────┐
│   Client Browser │──────▶│   Frontend (Vite) │──────▶│  Backend API  │
│  (React/Next.js) │  TLS  │   Port 3000       │  TLS  │  Port 3001    │
└──────────────────┘       └───────────────────┘       └──────┬───────┘
                                                              │
                                                              ▼
                                                     ┌──────────────┐
                                                     │  PostgreSQL   │
                                                     │  Port 5432    │
                                                     │  Encrypted FS │
                                                     └──────────────┘
```

### Data Flow

1. **Client → Frontend:** HTTPS (TLS 1.3) — All traffic encrypted in transit
2. **Frontend → API:** HTTPS (TLS 1.3) — JWT Bearer tokens for auth
3. **API → Database:** Encrypted connection (TLS) + field-level AES-256-GCM
4. **At Rest:** Database EBS volumes encrypted with AWS KMS

### Key Security Layers

| Layer | Mechanism | Standard |
|-------|-----------|----------|
| Network | TLS 1.3, HTTPS-only | HIPAA §164.312(e)(1) |
| Authentication | JWT (access + refresh tokens) | HIPAA §164.312(d) |
| Authorization | Role-based (clinician/client) | HIPAA §164.312(a)(1) |
| Data at Rest | AES-256-GCM field-level encryption | HIPAA §164.312(a)(2)(iv) |
| Audit Trail | Immutable audit logs | HIPAA §164.312(b) |
| Access Control | Minimum necessary, role-based | HIPAA §164.502(b) |

---

## 2. HIPAA Compliance Checklist

### ✅ Administrative Safeguards (§164.308)

- [x] **Risk Analysis:** Conducted and documented
- [x] **Risk Management:** Encryption, access controls, audit trails
- [x] **Sanction Policy:** Documented in practice policies
- [x] **Information System Activity Review:** Audit log review process
- [x] **Business Associate Agreement (BAA):** Required with hosting provider
- [x] **Contingency Plan:** Database backups, failover strategy

### ✅ Physical Safeguards (§164.310)

- [x] **Facility Access Controls:** AWS data center security
- [x] **Workstation Security:** Device encryption, auto-lock
- [x] **Device and Media Controls:** AWS EBS encryption

### ✅ Technical Safeguards (§164.312)

- [x] **Access Control:** Unique user IDs (UUID), role-based access
- [x] **Emergency Access:** Clinician override documented
- [x] **Automatic Logoff:** 15-minute inactivity timeout
- [x] **Encryption & Decryption:** AES-256-GCM at rest, TLS 1.3 in transit
- [x] **Audit Controls:** All PHI access logged immutably
- [x] **Integrity Controls:** GCM authentication tags prevent tampering
- [x] **Person or Entity Authentication:** JWT + bcrypt password hashing

### ✅ Organizational Requirements (§164.314)

- [x] **Business Associate Contracts:** BAA required with all vendors
- [x] **Group Health Plan:** N/A (therapy practice)

### ✅ Policies, Procedures & Documentation (§164.316)

- [x] **Policies and Procedures:** Documented in this guide
- [x] **Documentation Retention:** 6 years minimum
- [x] **Availability:** Documentation accessible to workforce

---

## 3. Prerequisites

### Required Tools

```bash
# Development
node >= 22
npm >= 10
docker >= 24
docker-compose >= 2.0
git >= 2.0

# Production (AWS)
aws-cli >= 2.0
terraform >= 1.5 (optional, for infrastructure)
```

### Required Accounts

| Service | Purpose | BAA Needed? |
|---------|---------|-------------|
| AWS (EC2/RDS) | Hosting | ✅ Yes |
| GitHub | Code repository | ✅ Yes (Enterprise) |
| Docker Hub / ECR | Container registry | ❌ No (if self-managed) |

---

## 4. Local Development Setup

### 4.1 Quick Start with Docker

```bash
# 1. Clone the repository
git clone https://github.com/Bam17Bam/Wholeness---Grace.git
cd Wholeness---Grace

# 2. Copy environment file
cp .env.example .env

# 3. Start the stack
docker compose up -d

# 4. Run migrations
npx tsx src/migrations/run.ts

# 5. Seed demo data
npx tsx src/migrations/seed.ts

# 6. Verify
curl http://localhost:3001/api/health
```

### 4.2 Manual Setup

```bash
# 1. Install dependencies
cd backend && npm install

# 2. Set up PostgreSQL
createdb wholeness_grace

# 3. Configure environment
cp .env.example .env
# Edit .env with your local database URL

# 4. Run migrations
npx tsx src/migrations/run.ts

# 5. Seed data (optional)
npx tsx src/migrations/seed.ts

# 6. Start development server
npx tsx watch src/index.ts
```

### 4.3 Seed Data Reference

After seeding, the following demo accounts are available:

| Role | Email | Password |
|------|-------|----------|
| Clinician | demo@wholeness.com | demo123 |
| Client | sarah@example.com | demo123 |
| Client | michael@example.com | demo123 |
| Client | emily@example.com | demo123 |

---

## 5. Production Deployment (AWS)

### 5.1 Infrastructure Requirements

#### Option A: AWS EC2 (Single Server — MVP)

| Resource | Specification |
|----------|---------------|
| Instance | t3.medium (2 vCPU, 4GB RAM) |
| Storage | 20GB gp3 EBS (encrypted) |
| OS | Ubuntu 22.04 LTS |
| Security Group | 22 (SSH admin), 80/443 (HTTPS), 3001 (API internal) |

#### Option B: AWS ECS (Scalable — Recommended)

| Resource | Specification |
|----------|---------------|
| Task Definition | Fargate, 1 vCPU, 2GB RAM |
| RDS Instance | db.t3.small, 20GB encrypted |
| ALB | Application Load Balancer (HTTPS) |
| ECR | Container registry |

### 5.2 Step-by-Step EC2 Deployment

```bash
# On the EC2 instance:

# 1. Install Docker
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2
sudo systemctl enable docker
sudo systemctl start docker

# 2. Clone the repo
git clone https://github.com/Bam17Bam/Wholeness---Grace.git
cd Wholeness---Grace

# 3. Set up environment
cat > .env.production << 'EOF'
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@rds-endpoint:5432/wholeness_grace
JWT_ACCESS_SECRET=<64-char-random>
JWT_REFRESH_SECRET=<64-char-random>
DATA_ENCRYPTION_KEY=<64-char-hex-key>
FRONTEND_URL=https://your-frontend-domain.com
RATE_LIMIT_MAX=200
EOF

# 4. Run with docker-compose
docker compose -f docker-compose.yml up -d

# 5. Run migrations
docker compose exec api npx tsx src/migrations/run.ts

# 6. Set up nginx reverse proxy (for HTTPS)
sudo apt-get install -y nginx certbot python3-certbot-nginx

# 7. Configure SSL
sudo certbot --nginx -d api.your-domain.com
```

### 5.3 Environment Variable Requirements

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | API port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_ACCESS_SECRET` | Access token signing key | `random-64-char-string` |
| `JWT_REFRESH_SECRET` | Refresh token signing key | `random-64-char-string` |
| `DATA_ENCRYPTION_KEY` | AES-256-GCM key (64 hex chars) | `abcdef0123456789...` |
| `FRONTEND_URL` | CORS allowed origin | `https://app.wholeness.com` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |

> **Generating secure keys:**
> ```bash
> JWT_ACCESS_SECRET=$(openssl rand -hex 32)
> JWT_REFRESH_SECRET=$(openssl rand -hex 32)
> DATA_ENCRYPTION_KEY=$(openssl rand -hex 32)  # Must be exactly 64 hex chars
> ```

### 5.4 Business Associate Agreement (BAA)

Before deploying to any cloud provider, you **must** sign a BAA:

- **AWS:** Enable AWS Artifact → select "HIPAA Business Associate Addendum" → sign
- **Required AWS services covered:** EC2, RDS, ECS, EBS, S3 (if used), CloudWatch
- **Keep BAA copy:** Retain for minimum 6 years as required by HIPAA

### 5.5 AWS Security Checklist

- [x] Enable VPC with private subnets for database
- [x] Enable CloudTrail for API auditing
- [x] Enable GuardDuty for threat detection
- [x] Enable EBS volume encryption by default
- [x] Enable RDS encryption at rest
- [x] Restrict security group ingress to minimum required
- [x] Enable multi-factor authentication on AWS root account
- [x] Use IAM roles, not access keys, where possible
- [x] Enable S3 block public access (if using S3)
- [x] Set up CloudWatch alarms for suspicious activity

---

## 6. CI/CD Pipeline

### 6.1 GitHub Actions Workflows

The repository includes three GitHub Actions workflows:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `backend-ci.yml` | Push/PR to main or feature branches | TypeScript type check, build |
| `frontend-ci.yml` | Push/PR to main or feature branches | Frontend lint, build |
| `backend-deploy.yml` | Push to main or manual trigger | Build Docker, push to ECR, deploy to EC2 |

### 6.2 Required GitHub Secrets

| Secret | Description | Source |
|--------|-------------|--------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key | AWS IAM console |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key | AWS IAM console |
| `EC2_HOST` | EC2 instance public IP/DNS | AWS EC2 console |
| `EC2_USER` | SSH user (usually `ubuntu` or `ec2-user`) | AMI type |
| `EC2_SSH_KEY` | Private SSH key for EC2 access | Generated with `ssh-keygen` |
| `DATABASE_URL` | Production database URL | Your database |
| `JWT_ACCESS_SECRET` | JWT signing secret | Generated |
| `JWT_REFRESH_SECRET` | JWT refresh secret | Generated |
| `DATA_ENCRYPTION_KEY` | Encryption key | Generated |
| `FRONTEND_URL` | Frontend domain | Your domain |

### 6.3 Setting Up CI/CD

```bash
# 1. Generate deploy keys
ssh-keygen -t ed25519 -C "github-actions" -f /tmp/gh-deploy-key
# Add public key to EC2's ~/.ssh/authorized_keys

# 2. Add secrets to GitHub
gh secret set AWS_ACCESS_KEY_ID --body "AKIA..."
gh secret set AWS_SECRET_ACCESS_KEY --body "..."
gh secret set EC2_HOST --body "ec2-xxx.compute-1.amazonaws.com"
gh secret set EC2_USER --body "ubuntu"
gh secret set EC2_SSH_KEY < /tmp/gh-deploy-key
gh secret set DATABASE_URL --body "postgresql://..."
gh secret set JWT_ACCESS_SECRET --body "$(openssl rand -hex 32)"
gh secret set JWT_REFRESH_SECRET --body "$(openssl rand -hex 32)"
gh secret set DATA_ENCRYPTION_KEY --body "$(openssl rand -hex 32)"
gh secret set FRONTEND_URL --body "https://app.wholeness.com"
```

---

## 7. Environment Configuration

### 7.1 Environment Files

| File | Purpose | Git-Committed? |
|------|---------|----------------|
| `.env.example` | Template with all vars documented | ✅ Yes |
| `.env` | Local development | ❌ No (gitignored) |
| `.env.staging` | Staging environment | ❌ No |
| `.env.production` | Production environment | ❌ No |

### 7.2 Environment-Specific Settings

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| Rate Limit (req/15min) | 1000 | 200 | 100 |
| CORS | All origins | Specific domain | Specific domain |
| Error Detail | Full stack traces | Limited | None |
| Log Level | debug | info | warn |
| TLS | Optional | Required | Required |

---

## 8. Database Management

### 8.1 Migrations

```bash
# Run migrations
npx tsx src/migrations/run.ts

# The migration creates the following tables:
# - users (with encrypted PII fields)
# - clinician_assignments
# - homework_templates
# - assignments
# - submissions
# - submission_reviews
# - sessions
# - audit_logs
# - encryption_keys
```

### 8.2 Seeding

```bash
# Seed demo data (development/staging only)
npx tsx src/migrations/seed.ts

# Creates:
# - 1 clinician + 3 clients
# - 3 homework templates
# - 5 assignments (various statuses)
# - 3 submissions + 1 review
# - 8 audit log entries
```

### 8.3 Backup & Restore

```bash
# Backup
pg_dump -h localhost -U postgres wholeness_grace > backup_$(date +%Y%m%d).sql

# Restore
psql -h localhost -U postgres wholeness_grace < backup_20260601.sql

# Automated backup (cron job)
# Add to crontab: 0 2 * * * pg_dump -h localhost -U postgres wholeness_grace > /backups/daily_$(date +\%Y\%m\%d).sql
```

### 8.4 Encryption Key Management

> ⚠️ **WARNING:** Encrypted data can NEVER be decrypted without the correct `DATA_ENCRYPTION_KEY`.  
> **Loss of this key means permanent data loss.**

**Best Practices:**
- Store a backup of the encryption key in AWS Secrets Manager
- Rotate keys annually
- Never transmit keys via email or unencrypted channels
- Use key hierarchy: master key → data key → encrypted fields

---

## 9. Monitoring & Alerting

### 9.1 Health Check Endpoint

```http
GET /api/health
Response: {
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-06-04T00:00:00.000Z",
  "uptime": 3600
}
```

### 9.2 Audit Log Monitoring

All PHI access is logged to the `audit_logs` table:

- Login attempts (successful and failed)
- PHI record views
- PHI record modifications
- Authorization failures
- Export/download attempts

**Review frequency:** Daily automated scan, weekly manual review

### 9.3 CloudWatch Alarms (AWS)

Recommended alarms:

| Alarm | Metric | Threshold | Action |
|-------|--------|-----------|--------|
| High CPU | EC2 CPUUtilization | > 90% for 5 min | Auto-scale / notify |
| 5xx Errors | ALB HTTPCode_Target_5XX_Count | > 10 in 5 min | Notify team |
| Disk Usage | EC2 DiskSpaceUtilization | > 85% | Clean up / scale |
| Failed Logins | Custom metric | > 20 in 15 min | Investigate breach |
| Audit Log Volume | Custom metric | Sudden spike | Investigate anomaly |

---

## 10. Incident Response

### 10.1 Incident Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| SEV-1 | Data breach or service outage | 1 hour |
| SEV-2 | Degraded functionality | 4 hours |
| SEV-3 | Minor issue, no PHI exposure | 24 hours |
| SEV-4 | Cosmetic / non-urgent | Next sprint |

### 10.2 Incident Response Steps

```
1. DETECT   → Alert triggers or user reports issue
2. CLASSIFY → Determine severity (SEV-1 through SEV-4)
3. CONTAIN  → Isolate affected systems (revoke keys, disable access)
4. INVESTIGATE → Review audit logs, identify root cause
5. REMEDIATE → Apply fix, rotate keys if compromised
6. NOTIFY   → Inform affected parties (if breach)
7. DOCUMENT → Record incident details and lessons learned
```

---

## 11. Breach Notification Protocol

### 11.1 When to Notify

Under HIPAA Breach Notification Rule (§164.400-414):

- **Unsecured PHI** is accessed, acquired, used, or disclosed
- **Risk assessment** determines low probability of compromise:
  - Nature / extent of PHI involved
  - Who accessed the PHI
  - Whether PHI was actually acquired / viewed
  - Extent of risk mitigation

### 11.2 Notification Timelines

| Party | Deadline | Method |
|-------|----------|--------|
| Individual | Within 60 days | First-class mail or email |
| HHS Secretary | Within 60 days (500+ affected) Annual log (<500) | Online portal |
| Media | Within 60 days (500+ affected in state) | Press release |

### 11.3 Notification Contents

- Brief description of the breach
- Types of PHI involved
- Steps individuals should take to protect themselves
- What the covered entity is doing to investigate/mitigate
- Contact information for questions

---

## 12. Security Hardening

### 12.1 API Security

- [x] Helmet HTTP headers (XSS, clickjacking, MIME sniffing protection)
- [x] Rate limiting (100 req/15min per IP)
- [x] 10MB request body limit
- [x] CORS restricted to known origins
- [x] Request IDs for tracing
- [x] No PII in error messages or logs
- [x] JWT token expiration (15 min access, 7 day refresh)
- [x] bcrypt with cost factor 12 for password hashing

### 12.2 Network Security

- [x] TLS 1.3 for all external communication
- [x] Private subnets for database
- [x] Security group ingress restricted to necessary ports
- [x] WAF (Web Application Firewall) recommended for production
- [x] DDoS protection (AWS Shield or Cloudflare)

### 12.3 Application Security

- [x] Input validation with Zod schemas
- [x] SQL injection prevention (parameterized queries)
- [x] Field-level encryption for all PII
- [x] Role-based access control (clinician/client)
- [x] Audit logging for all PHI access
- [x] Session timeout (15 min inactivity)
- [x] Refresh token rotation

### 12.4 Regular Tasks

| Frequency | Task |
|-----------|------|
| Daily | Review audit logs for anomalies |
| Weekly | Verify backup integrity |
| Monthly | Review access controls and user accounts |
| Quarterly | Penetration testing or vulnerability scan |
| Annually | Risk assessment and BAA review |
| As needed | Patch dependencies (`npm audit`) |

---

## Appendix A: Quick Reference

### Useful Commands

```bash
# Development
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript
npm run migrate      # Run database migrations
npm run seed         # Seed demo data

# Docker
docker compose up -d       # Start all services
docker compose down        # Stop all services
docker compose logs -f     # Follow logs
docker compose exec api sh # Shell into API container

# Production
./scripts/deploy.sh staging     # Deploy to staging
./scripts/deploy.sh production  # Deploy to production
```

### API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | None | Register user |
| POST | /api/auth/login | None | Login |
| POST | /api/auth/refresh | None | Refresh tokens |
| GET | /api/auth/me | JWT | Get profile |
| GET | /api/clients | Clinician | List clients |
| POST | /api/clients | Clinician | Assign client |
| GET | /api/assignments | JWT | List assignments |
| POST | /api/assignments | Clinician | Create assignment |
| PUT | /api/assignments/:id | Clinician | Update assignment |
| POST | /api/submissions | Client | Submit response |
| POST | /api/submissions/:id/review | Clinician | Review submission |
| GET | /api/audit-logs | Clinician | View audit logs |
| GET | /api/health | None | Health check |

---

## Appendix B: Compliance References

| Standard | Description |
|----------|-------------|
| HIPAA §164.308 | Administrative safeguards |
| HIPAA §164.310 | Physical safeguards |
| HIPAA §164.312 | Technical safeguards |
| HIPAA §164.314 | Organizational requirements |
| HIPAA §164.316 | Policies, procedures, documentation |
| HIPAA §164.400 | Breach notification rule |
| NIST SP 800-53 | Security and privacy controls |
| OWASP Top 10 | Web application security risks |

---

*This deployment guide should be reviewed and updated at least annually, or whenever significant changes are made to the infrastructure or application.*