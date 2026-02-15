# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json bun.lock* ./

# Install Bun
ENV BUN_INSTALL=/root/.bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="$BUN_INSTALL/bin:$PATH"

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN bun run build

# Production stage
FROM node:20-alpine AS runner

# Set working directory
WORKDIR /app

# Install Bun
ENV BUN_INSTALL=/root/.bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="$BUN_INSTALL/bin:$PATH"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 sveltejs

# Copy built application
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create data directory for SQLite database
RUN mkdir -p /app/data && chown -R sveltejs:nodejs /app/data

# Switch to non-root user
USER sveltejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["bun", "run", "preview"]
