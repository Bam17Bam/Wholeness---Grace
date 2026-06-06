# ─── Wholeness and Grace — Production Backend Dockerfile ──────
# Multi-stage build: builder → production runner (minimal, secure)

# ─── Stage 1: Build ────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /build

# Build dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

# Install dependencies (separate from source for layer caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy and compile TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# Prune dev dependencies for production
RUN npm prune --omit=dev

# ─── Stage 2: Production ───────────────────────────────────────
FROM node:22-alpine AS runner

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Runtime dependencies only (pg client for health checks)
RUN apk add --no-cache curl

# Copy production artifacts from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /build/dist ./dist

# Security: drop root privileges
USER appuser

# Expose API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Label for compliance tracking
LABEL maintainer="Wholeness and Grace Team" \
      version="1.0.0" \
      hipaa="compliant" \
      description="HIPAA-compliant therapy homework API"

# Start
CMD ["node", "dist/index.js"]