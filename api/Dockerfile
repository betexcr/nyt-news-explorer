# Multi-stage Docker build for production optimization
# Stage 1: Build stage
FROM node:20-alpine AS builder

# Install security updates and build dependencies
RUN apk update && apk upgrade && apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Create app directory with non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S api -u 1001 -G nodejs

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY --chown=api:nodejs src/ ./src/

# Build TypeScript
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine AS production

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S api -u 1001 -G nodejs

WORKDIR /app

# Copy production files from builder
COPY --from=builder --chown=api:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=api:nodejs /app/dist ./dist
COPY --from=builder --chown=api:nodejs /app/package.json ./package.json

# Create necessary directories
RUN mkdir -p /app/logs && chown -R api:nodejs /app/logs

# Switch to non-root user
USER api

# Security: Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${PORT:-3000}/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Expose port (non-privileged)
EXPOSE 3000

# Resource constraints and security
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024 --enable-source-maps"

# Start application
CMD ["node", "dist/server.js"]