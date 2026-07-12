# Multi-stage build for Bun app with TypeScript

# Stage 1: Dependencies
FROM oven/bun:latest AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Stage 2: Build and test
FROM oven/bun:latest AS test
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/bun.lockb ./

# Copy package and source code
COPY package.json ./
COPY src ./src

# Run tests to verify build
RUN bun test

# Stage 3: Development image
FROM oven/bun:latest AS development
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/bun.lockb ./

# Copy package and source code
COPY package.json ./
COPY src ./src

# Expose port
EXPOSE 3000

# Start server with watch mode
CMD ["bun", "--watch", "run", "src/admin-ui/cli.ts"]

# Stage 4: Production image
FROM oven/bun:latest AS production
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/bun.lockb ./

# Copy package and source code
COPY package.json ./
COPY src ./src

# Create non-root user for security
RUN useradd -m -u 1001 bunapp
USER bunapp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD bun -e "const res = await fetch('http://localhost:3000/health'); if (res.status !== 200) throw new Error(res.status);"

# Expose port
EXPOSE 3000

# Start server
CMD ["bun", "run", "src/admin-ui/cli.ts"]
