# Development Guide

Guide for local development of Kloak.

## Prerequisites

- Bun >=1.0.0 (check with `bun --version`)
- Node.js >=25.0.0 (required by Bun, check with `node --version`)
- PostgreSQL 15+ (optional, for persistent storage)
- Docker & Docker Compose (optional, for local services)

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Run Tests

```bash
bun test
```

All 18 tests should pass.

### 3. Start Development Server

```bash
bun run dev:watch
```

Server starts at `http://localhost:3000` with automatic reload on file changes.

### 4. Access the API

```bash
# List deployments
curl http://localhost:3000/deployments

# Create a deployment
curl -X POST http://localhost:3000/deployments \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "name": "test-deployment",
    "target": {
      "region": "us-east-1",
      "createDatabase": true,
      "createIngress": true,
      "createDns": false,
      "createSecrets": true
    }
  }'
```

## Development with Docker

### Start Full Stack

```bash
docker-compose up
```

This starts:
- **Kloak app** at `http://localhost:3000`
- **PostgreSQL** at `localhost:5432`
- **Keycloak** at `http://localhost:8080/admin` (admin/admin)

### Development Features

- **Live reload**: Source code changes automatically reload the server
- **Source mounts**: `./src` mounted into container for instant updates
- **Database**: PostgreSQL initialized with schema migrations
- **Auth**: Keycloak running with test realm and credentials

### Run Commands in Container

```bash
# Run tests
docker exec kloak bun test

# Check linting
docker exec kloak bun run lint:check

# Fix linting
docker exec kloak bun run lint

# View logs
docker logs -f kloak

# SSH into container
docker exec -it kloak sh
```

### Restart Services

```bash
# Restart just the app
docker-compose restart app

# Restart all services
docker-compose restart

# Stop all
docker-compose down

# Full reset (WARNING: deletes database)
docker-compose down -v
```

## Linting with Biome

Kloak uses [Biome](https://biomejs.dev) for code quality.

### Commands

```bash
# Check for issues (don't fix)
npm run lint:check

# Fix issues automatically
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check
```

### Configuration

Biome configuration in `biome.json`:
- **Formatter**: Single quotes, 2-space indentation, 100-char line width
- **Linter**: TypeScript/JavaScript recommended rules
- **Imports**: Automatically sorted

### Before Committing

```bash
npm run lint        # Fix issues
npm test           # Verify tests pass
npm run lint:check # Double-check linting
```

## TypeScript Configuration

Kloak uses TypeScript with `--experimental-transform-types`:
- Direct TypeScript execution (no build step)
- `.ts` files run natively on Node.js 25+
- Explicit file extensions required in imports (`./index.ts` not `./index`)

### Import Syntax

```typescript
// ✅ Correct: Explicit extension
import { CoreService } from '../core/index.ts';
import type { Deployment } from '../shared/index.ts';

// ❌ Wrong: Missing extension
import { CoreService } from '../core';
```

## Database Development

### Using PostgreSQL

```bash
# Set DATABASE_URL
export DATABASE_URL="postgres://user:pass@localhost:5432/kloak"

# Run server
npm run dev

# Migrations run automatically on startup
```

### Using In-Memory (Default)

```bash
# No DATABASE_URL set
npm run dev

# Uses InMemoryDeploymentRepository (data lost on restart)
```

### Manual Migrations

```bash
npm run migrate
```

### Database Schema

Located in `src/database/schema.sql`:
- **deployments** — Deployment records
- **deployment_versions** — Versioned configurations
- **desired_state_snapshots** — Auth stack desired state
- **reconciliation_runs** — Drift detection history
- **audit_events** — Deployment audit trail

## Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
node --experimental-transform-types --test src/core/index.test.ts
```

### Watch Mode (Experimental)

```bash
node --experimental-transform-types --test --watch src/
```

### Test Structure

- Tests use `node:test` (built-in test runner)
- Assertions with `node:assert/strict`
- Mocks in `*.ts` test files (e.g., `src/sync/fakes.ts`)
- All tests should pass before committing

## Architecture

### Domain Layer (`src/shared/`)

Core types and ubiquitous language:
- `Deployment` — Customer deployment record
- `DesiredStateSnapshot` — Auth stack configuration
- `DriftFinding` — Reconciliation result
- `DeploymentStatus` — Lifecycle states

### Core (`src/core/`)

Deployment lifecycle and persistence:
- `CoreService` — Business logic (create, list, update)
- `DeploymentRepository` — Persistence interface
- `InMemoryDeploymentRepository` — Testing implementation
- `SqlDeploymentRepository` — PostgreSQL implementation

### Integration (`src/keycloak/`, `src/aws/`)

External system integration:
- `HttpKeycloakClient` — Keycloak API integration
- `AwsProvisioner` — AWS resource provisioning

### Sync (`src/sync/`)

Reconciliation and drift detection:
- `SyncService` — Orchestrates reconciliation
- `diffDesiredState()` — Compares desired vs live state
- Returns `ReconciliationRun` with status and findings

### API Layer (`src/admin-ui/`)

HTTP server and request handling:
- `AdminHandler` — Routes requests to CoreService
- `startServer()` — Creates HTTP server
- 5 REST endpoints for deployment management

## Common Tasks

### Add a New Field to Deployment

1. Update `Deployment` type in `src/shared/models.ts`
2. Update PostgreSQL schema in `src/database/schema.sql`
3. Update `SqlDeploymentRepository` queries
4. Add tests in relevant `*.test.ts` file
5. Update API endpoints if needed

### Add a New Endpoint

1. Add route pattern in `AdminHandler.handle()`
2. Implement request/response logic
3. Add test in `src/admin-ui/handler.test.ts`
4. Update API documentation

### Integrate a New External Service

1. Create interface in `src/service/index.ts`
2. Create implementation in `src/service/service-client.ts`
3. Add mock implementation for tests (`src/service/fakes.ts`)
4. Integrate into `DeploymentService`
5. Add tests with mocks

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Connection Fails

```bash
# Check PostgreSQL is running
psql -U postgres -d kloak

# Verify DATABASE_URL
echo $DATABASE_URL

# Check connection string format
# postgres://user:password@host:port/database
```

### Tests Fail with Import Errors

```bash
# Ensure explicit .ts extensions in imports
# ✅ Correct: import { x } from './module.ts'
# ❌ Wrong: import { x } from './module'
```

### Docker Issues

```bash
# Clean up all containers and volumes
docker-compose down -v

# Rebuild images
docker-compose build --no-cache

# Start fresh
docker-compose up
```

## Performance Tips

### Development

- Use `npm run dev:watch` for automatic reload
- Install Biome extension in IDE for real-time linting
- Use `--watch` flag for tests during TDD

### Docker

- Mount only source (`./src`) for fast reloads
- Use production target for final testing
- Leverage Docker cache with layer optimization

## Next Steps

- Read [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
- Check [CONTEXT.md](../CONTEXT.md) for domain terminology
- Review [AGENTS.md](../AGENTS.md) for agent workflow
