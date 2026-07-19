# Kloak

Kloak manages Keycloak deployments.

## Development

### Quick Start

```bash
# Install dependencies
bun install

# Run tests
bun test

# Start development server (with live reload)
bun run dev:watch

# Or start server without watch
bun run dev
```

### Linting

Kloak uses [Biome](https://biomejs.dev) for TypeScript/JavaScript linting and formatting.

```bash
# Check linting (no changes)
bun run lint:check

# Fix all linting issues
bun run lint

# Format code
bun run format
```

### Docker Development

```bash
# Start all services (app, PostgreSQL, Keycloak) with live reload
docker-compose up

# Access the app at http://localhost:3000
# Keycloak at http://localhost:8080/admin (admin/admin)
# PostgreSQL at localhost:5432

# Production deployment with health checks
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up

# Run tests
docker exec kloak bun test

# Run linting
docker exec kloak bun run lint:check
```

### Environment Variables

Development defaults (set in docker-compose.yml):
- `PORT=3000` — Server port
- `HOST=0.0.0.0` — Server host
- `DATABASE_URL` — PostgreSQL connection (optional, uses in-memory if not set)
- `KEYCLOAK_BASE_URL=http://keycloak:8080` — Keycloak server
- `KEYCLOAK_REALM_ADMIN_USER=admin` — Keycloak admin user
- `KEYCLOAK_REALM_ADMIN_PASSWORD=admin` — Keycloak admin password

### Available Commands

| Command | Purpose |
|---------|---------|
| `bun test` | Run all tests |
| `bun run dev` | Start server |
| `bun run dev:watch` | Start server with live reload |
| `bun run lint:check` | Check linting |
| `bun run lint` | Fix linting issues |
| `bun run format` | Format code |
| `bun run migrate` | Run database migrations |

### Project Structure

```
src/
├── shared/           # Domain types and ubiquitous language
├── core/             # Deployment lifecycle (CoreService, repository)
├── database/         # PostgreSQL persistence layer
├── sync/             # Drift detection and reconciliation
├── keycloak/         # Keycloak integration
├── aws/              # AWS provisioning
├── infrastructure/   # Infrastructure abstraction layer
├── admin-ui/         # HTTP API server
├── orchestrator/     # Orchestration service
└── *.test.ts         # Test files
```
