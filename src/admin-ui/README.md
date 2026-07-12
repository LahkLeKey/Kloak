# admin-ui

This package provides the HTTP API server for Kloak deployments.

## Responsibilities

- Expose core deployment operations (create, list, status updates)
- Route HTTP requests to CoreService handlers
- Serialize/deserialize deployments to/from JSON
- Handle request validation and error responses

## Starting the Server

```bash
node --experimental-transform-types src/admin-ui/cli.ts
```

Set port and host via environment variables:
```bash
PORT=3000 HOST=localhost node --experimental-transform-types src/admin-ui/cli.ts
```

## HTTP API

### POST /deployments
Create a new deployment.

**Request:**
```json
{
  "customerId": "acme",
  "name": "production",
  "target": {
    "createDatabase": true,
    "createIngress": true,
    "createDns": true,
    "createSecrets": true
  }
}
```

**Response:** `201 Created` with deployment object.

### GET /deployments
List all deployments.

**Response:** `200 OK` with array of deployments.

### GET /deployments/:id
Get a specific deployment.

**Response:** `200 OK` with deployment object, or `404 Not Found`.

### POST /deployments/:id/versions
Create a new deployment version.

**Request:**
```json
{
  "createdBy": "alice@example.com",
  "notes": "Update auth settings",
  "snapshot": {
    "keycloakConfig": {...},
    "authProviders": [...]
  }
}
```

**Response:** `201 Created` with version object.

### PUT /deployments/:id/status
Update deployment status.

**Request:**
```json
{
  "status": "healthy"
}
```

**Response:** `200 OK` with updated deployment object.

## Architecture

- `handler.ts`: HTTP request routing and CoreApi bridging
- `server.ts`: Node HTTP server wrapper with route matching
- `cli.ts`: Command-line entry point
