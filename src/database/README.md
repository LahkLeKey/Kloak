# database

PostgreSQL-backed persistence layer for Kloak deployments.

## Setup

### Local development

```bash
# Install postgres locally or use Docker
docker run --name kloak-postgres -e POSTGRES_DB=kloak -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:16

# Create .env file
echo "DATABASE_URL=postgresql://postgres:dev@localhost/kloak" > .env

# Run migrations
npm run migrate

# Start server with Postgres
source .env && npm run dev
```

### Cloud deployment (fly.io)

```bash
# Create Postgres database
fly postgres create --name kloak-db

# Attach to app
fly postgres attach kloak-db --app kloak

# Migrations run automatically on app start (or manually with `fly ssh console` + `npm run migrate`)
```

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (required for Postgres mode; omit to use in-memory)

## Schema

Tables:
- `deployments` — Deployment records with status and target config
- `deployment_versions` — Immutable versions of each deployment
- `desired_state_snapshots` — Auth config snapshots for each version
- `reconciliation_runs` — Drift detection and repair attempts
- `audit_events` — Operator-visible action log

All tables include indexes for query performance.

## TypeScript Types

The repository implements the `DeploymentRepository` interface from `src/core/index.ts`, so it's a drop-in replacement for `InMemoryDeploymentRepository`.
