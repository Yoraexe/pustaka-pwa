# --- Stage 1: Base & Dependencies ---
FROM node:20-slim AS deps
WORKDIR /app

# Install build dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# --- Stage 2: Build Application ---
FROM node:20-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Run test suite & build frontend/backend
RUN npm run test
RUN npm run build

# --- Stage 3: Production Runner (Non-Root User) ---
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Create non-root system user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copy production dependencies & built assets
COPY package.json package-lock.json ./
RUN apt-get update && apt-get install -y --no-install-recommends curl python3 make g++ && \
    npm ci --omit=dev && \
    apt-get purge -y --auto-remove python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Create directory for persistent SQLite and uploads
RUN mkdir -p /app/data /app/uploads/ebooks && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

CMD ["node", "--loader", "tsx", "src/server/index.ts"]
