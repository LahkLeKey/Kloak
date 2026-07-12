# Multi-stage build for Node.js app with --experimental-transform-types

# Stage 1: Dependencies
FROM node:25.2.1-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Stage 2: Build and test
FROM node:25.2.1-alpine AS test
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Run tests to verify build
RUN npm test

# Stage 3: Development image
FROM node:25.2.1-alpine AS development
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/package-lock.json ./

# Copy source code
COPY src ./src

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3000

# Start server with watch mode and experimental transform types
CMD ["node", "--watch", "--experimental-transform-types", "src/admin-ui/cli.ts"]

# Stage 4: Production image
FROM node:25.2.1-alpine AS production
WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/package-lock.json ./

# Copy source code
COPY src ./src

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Expose port
EXPOSE 3000

# Use dumb-init to handle SIGTERM properly
ENTRYPOINT ["dumb-init", "--"]

# Start server with experimental transform types
CMD ["node", "--experimental-transform-types", "src/admin-ui/cli.ts"]
