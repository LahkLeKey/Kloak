# keycloak

Real Keycloak client for drift detection and auth stack reconciliation.

## Usage

```typescript
import {HttpKeycloakClient} from './src/keycloak/index.ts';

const keycloak = new HttpKeycloakClient({
  baseUrl: 'https://keycloak.example.com',
  realmAdminUser: 'admin',
  realmAdminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD,
  clientId: 'admin-cli',
  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
});

// Read live state
const live = await keycloak.readLiveState(deployment);
console.log(live.realmName, live.clients, live.roles);

// Apply desired state
await keycloak.applyDesiredState(deployment, {
  clients: ['webapp', 'mobile'],
  roles: ['admin', 'user'],
});

// Verify
await keycloak.verifyLiveState(deployment, desiredState);
```

## Architecture

- Uses Node's built-in HTTPS module (zero external dependencies)
- Bearer token authentication with Keycloak master realm
- Token caching with expiry tracking
- Implements KeycloakClient interface from src/sync/index.ts

## Keycloak Setup

For local testing, run Keycloak with Docker:

```bash
docker run -d \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  -p 8080:8080 \
  quay.io/keycloak/keycloak:latest start-dev

# Point client to http://localhost:8080
```

## API Endpoints Used

- `POST /realms/master/protocol/openid-connect/token` — Get access token
- `GET /admin/realms/{realm}` — Read realm config
- `POST /admin/realms` — Create realm
- `GET /admin/realms/{realm}/clients` — List clients
- `POST /admin/realms/{realm}/clients` — Create client
- `GET /admin/realms/{realm}/roles` — List realm roles
- `POST /admin/realms/{realm}/roles` — Create role
- `GET /admin/realms/{realm}/groups` — List groups
- `GET /admin/realms/{realm}/users/count` — Get user count

## Environment Variables

```bash
export KEYCLOAK_BASE_URL=https://keycloak.example.com
export KEYCLOAK_ADMIN_USER=admin
export KEYCLOAK_ADMIN_PASSWORD=...
export KEYCLOAK_CLIENT_ID=admin-cli
export KEYCLOAK_CLIENT_SECRET=...
```
