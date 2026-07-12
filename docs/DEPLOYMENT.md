# Deployment Guide

Kloak is designed for production deployment on Fly.io with optional Kubernetes support.

## Quick Start: Local Development with Docker Compose

```bash
# Start all services (app, PostgreSQL, Keycloak)
docker-compose up

# Access the app
curl http://localhost:3000/deployments

# Stop services
docker-compose down
```

Services:
- **App** — http://localhost:3000 (admin API)
- **PostgreSQL** — localhost:5432 (persistence)
- **Keycloak** — http://localhost:8080/admin (auth server)

## Production Deployment: Fly.io

### Prerequisites

1. Install `flyctl`:
   ```bash
   brew install flyctl  # macOS
   # or download from https://fly.io/docs/hands-on/install-flyctl/
   ```

2. Create a Fly.io account:
   ```bash
   flyctl auth signup
   ```

3. Set up Fly.io app:
   ```bash
   flyctl app create kloak --region lax
   ```

### Deployment Steps

1. **Build and deploy**:
   ```bash
   flyctl deploy
   ```

2. **Set secrets**:
   ```bash
   flyctl secrets set \
     DATABASE_URL="postgres://user:pass@host:5432/kloak" \
     AWS_REGION="us-east-1" \
     AWS_ACCESS_KEY_ID="..." \
     AWS_SECRET_ACCESS_KEY="..." \
     AWS_ACCOUNT_ID="..." \
     AWS_HOSTED_ZONE_ID="..." \
     KEYCLOAK_BASE_URL="https://keycloak.example.com" \
     KEYCLOAK_REALM_ADMIN_USER="admin" \
     KEYCLOAK_REALM_ADMIN_PASSWORD="..." \
     KEYCLOAK_CLIENT_ID="kloak" \
     KEYCLOAK_CLIENT_SECRET="..."
   ```

3. **Verify deployment**:
   ```bash
   flyctl status
   flyctl logs -n 20
   flyctl open
   ```

### Database Setup

For managed PostgreSQL on Fly.io:

```bash
# Create Postgres cluster
flyctl postgres create --region lax --vm-size shared-cpu-1x --initial-cluster-size 1

# Attach to app
flyctl postgres attach <cluster-name>

# Run migrations
flyctl ssh console -c "node src/admin-ui/cli.ts"
```

Or use external managed database:

```bash
flyctl secrets set DATABASE_URL="postgres://user:pass@external-host:5432/kloak"
```

### Environment Variables

**Required:**
- `DATABASE_URL` — PostgreSQL connection string
- `KEYCLOAK_BASE_URL` — Keycloak server URL
- `KEYCLOAK_REALM_ADMIN_USER` — Keycloak admin username
- `KEYCLOAK_REALM_ADMIN_PASSWORD` — Keycloak admin password
- `KEYCLOAK_CLIENT_ID` — OAuth2 client ID
- `KEYCLOAK_CLIENT_SECRET` — OAuth2 client secret

**Optional:**
- `AWS_REGION` — AWS region (default: us-east-1)
- `AWS_ACCESS_KEY_ID` — AWS access key
- `AWS_SECRET_ACCESS_KEY` — AWS secret key
- `AWS_ACCOUNT_ID` — AWS account ID
- `AWS_HOSTED_ZONE_ID` — Route53 hosted zone ID (for DNS provisioning)
- `LOG_LEVEL` — Log level (default: info)

### Monitoring and Logs

```bash
# View live logs
flyctl logs -f

# View app status
flyctl status

# View app metrics
flyctl metrics

# SSH into running instance
flyctl ssh console
```

### Scaling

Edit `fly.toml` to adjust autoscaling:

```toml
[autoscaling]
enabled = true
min_machines = 1
max_machines = 3

[[autoscaling.policies]]
type = "cpu"
threshold = 70
```

Deploy changes:
```bash
flyctl deploy
```

## CI/CD: GitHub Actions

Three workflows handle automated deployment:

### 1. **Test** — Runs on every push and PR
- Installs dependencies
- Runs full test suite
- Uploads test results

### 2. **Build and Deploy** — Runs on main branch changes
- Builds Docker image with cache
- Deploys to Fly.io staging
- Verifies deployment health

### 3. **Release** — Runs on version tags
- Creates GitHub release
- Documents changes
- Tags Docker image

## Docker

### Build locally

```bash
docker build -t kloak:latest .
```

### Run container

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgres://user:pass@host:5432/kloak" \
  -e KEYCLOAK_BASE_URL="https://keycloak.example.com" \
  kloak:latest
```

### Multi-stage build stages

1. **deps** — Install npm dependencies
2. **test** — Build and run test suite
3. **production** — Minimal runtime image (Alpine + Node.js)

## Health Checks

The app provides a health check endpoint:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "uptime": 12345,
  "database": "connected",
  "version": "1.0.0"
}
```

Fly.io performs health checks every 15 seconds with 5-second timeout.

## Rollback

If deployment fails:

```bash
# View release history
flyctl releases

# Rollback to previous release
flyctl releases rollback <release-number>

# Or redeploy a specific release
flyctl deploy --release-number <release-number>
```

## Troubleshooting

### Database connection fails
- Verify DATABASE_URL is correct: `postgres://user:pass@host:port/db`
- Check network connectivity: `flyctl ssh console` then `psql $DATABASE_URL`
- Ensure database is running and accessible

### Keycloak auth fails
- Verify KEYCLOAK_BASE_URL is reachable: `curl $KEYCLOAK_BASE_URL`
- Check credentials in Secrets Manager
- Verify client is registered in Keycloak realm

### High memory usage
- Check logs: `flyctl logs | grep memory`
- Reduce autoscaling max_machines in fly.toml
- Monitor with `flyctl metrics`

### Deploy hangs
- Check build logs: `flyctl logs -t`
- Kill stuck deployment: `flyctl cancel`
- Try redeploy: `flyctl deploy --force-machines`

## Performance Tuning

### Database connections
- Adjust connection pool in fly.toml
- Use PgBouncer for connection pooling if needed
- Monitor with `flyctl metrics`

### Request concurrency
- Increase `services.concurrency.soft_limit` and `hard_limit`
- Scale horizontally by increasing `autoscaling.max_machines`
- Profile with Node.js profiler

### Memory optimization
- Use Node.js memory flags: `--max-old-space-size=512`
- Monitor heap usage: `flyctl ssh console` then `node -e "console.log(process.memoryUsage())"`

## Security

### HTTPS/TLS
- Fly.io automatically provisions Let's Encrypt certificates
- Force HTTPS in fly.toml: `force_https = true`

### Secrets management
- Always use `flyctl secrets set` for sensitive values
- Never commit secrets to git
- Rotate secrets regularly: `flyctl secrets unset <key>` then `set` new value

### Access control
- Restrict Fly.io access via GitHub teams
- Use service accounts for CI/CD
- Enable audit logging for all deployments

## See Also

- [Fly.io Documentation](https://fly.io/docs)
- [fly.toml Configuration](https://fly.io/docs/reference/configuration)
- [Deployment Troubleshooting](https://fly.io/docs/getting-started/troubleshooting/)
