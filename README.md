# Kloak

Kloak manages Keycloak deployments.

## Development

### Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start development server (with live reload)
npm run dev:watch

# Or start server without watch
npm run dev
```

### Linting

Kloak uses [Biome](https://biomejs.dev) for TypeScript/JavaScript linting and formatting.

```bash
# Check linting (no changes)
npm run lint:check

# Fix all linting issues
npm run lint

# Format code
npm run format
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
docker exec kloak npm test

# Run linting
docker exec kloak npm run lint:check
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
| `npm test` | Run all tests |
| `npm run dev` | Start server |
| `npm run dev:watch` | Start server with live reload |
| `npm run lint:check` | Check linting |
| `npm run lint` | Fix linting issues |
| `npm run format` | Format code |
| `npm run migrate` | Run database migrations |

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
