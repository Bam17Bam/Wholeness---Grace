# ─── Dockerfile for Wholeness and Grace Backend ────────────────
# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (bcrypt, pg)
RUN apk add --no-cache python3 make g++

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npx tsc

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache postgresql-client

# Copy built artifacts and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Expose the API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the server
CMD ["node", "dist/index.js"]