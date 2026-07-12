import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import type {
  CustomerId,
  Deployment,
  DeploymentId,
  DeploymentStatus,
  KeycloakDesiredState,
} from '../shared/index.ts';

import { HttpKeycloakClient } from './index.ts';

// Mock Keycloak server for testing
function createMockKeycloakServer() {
  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');

    // Token endpoint
    if (url.pathname === '/realms/master/protocol/openid-connect/token') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          access_token: 'test-token-123',
          expires_in: 300,
          refresh_expires_in: 1800,
          refresh_token: 'test-refresh-token',
          token_type: 'Bearer',
        })
      );
      return;
    }

    // Get realm
    if (url.pathname === '/admin/realms/customer-acme') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          realm: 'customer-acme',
          enabled: true,
          displayName: 'Acme Realm',
        })
      );
      return;
    }

    // Create realm
    if (url.pathname === '/admin/realms' && req.method === 'POST') {
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // List clients
    if (url.pathname === '/admin/realms/customer-acme/clients') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify([
          { clientId: 'webapp', enabled: true },
          { clientId: 'mobile', enabled: true },
        ])
      );
      return;
    }

    // Create client
    if (url.pathname === '/admin/realms/customer-acme/clients' && req.method === 'POST') {
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: 'client-123' }));
      return;
    }

    // List roles
    if (url.pathname === '/admin/realms/customer-acme/roles') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify([
          { name: 'admin', description: 'Administrator' },
          { name: 'user', description: 'Regular user' },
        ])
      );
      return;
    }

    // Create role
    if (url.pathname === '/admin/realms/customer-acme/roles' && req.method === 'POST') {
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ name: 'viewer' }));
      return;
    }

    // List groups
    if (url.pathname === '/admin/realms/customer-acme/groups') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([{ name: 'engineering' }, { name: 'sales' }]));
      return;
    }

    // User count
    if (url.pathname === '/admin/realms/customer-acme/users/count') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('42');
      return;
    }

    // Default 404
    res.writeHead(404);
    res.end();
  });

  return server;
}

test('HttpKeycloakClient reads live state from Keycloak', async () => {
  const server = createMockKeycloakServer();
  const port = await new Promise<number>(resolve => {
    server.listen(0, 'localhost', () => {
      const addr = server.address();
      if (addr && typeof addr !== 'string') {
        resolve(addr.port);
      }
    });
  });

  try {
    const client = new HttpKeycloakClient({
      baseUrl: `http://localhost:${port}`,
      realmAdminUser: 'admin',
      realmAdminPassword: 'admin',
      clientId: 'admin-cli',
      clientSecret: 'secret',
    });

    const deployment = {
      id: 'dep-1' as DeploymentId,
      customerId: 'acme' as CustomerId,
      name: 'prod',
      target: {
        createDatabase: true,
        createIngress: true,
        createDns: true,
        createSecrets: true,
      },
      status: 'healthy' as DeploymentStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const liveState = await client.readLiveState(deployment);

    assert.equal(liveState.realmName, 'customer-acme');
    assert.deepEqual(liveState.clients, ['webapp', 'mobile']);
    assert.deepEqual(liveState.roles, ['admin', 'user']);
    assert.deepEqual(liveState.groups, ['engineering', 'sales']);
    assert.equal(liveState.userCount, 42);
  } finally {
    server.close();
  }
});

test('HttpKeycloakClient applies desired state to Keycloak', async () => {
  const server = createMockKeycloakServer();
  const port = await new Promise<number>(resolve => {
    server.listen(0, 'localhost', () => {
      const addr = server.address();
      if (addr && typeof addr !== 'string') {
        resolve(addr.port);
      }
    });
  });

  try {
    const client = new HttpKeycloakClient({
      baseUrl: `http://localhost:${port}`,
      realmAdminUser: 'admin',
      realmAdminPassword: 'admin',
      clientId: 'admin-cli',
      clientSecret: 'secret',
    });

    const deployment: Deployment = {
      id: 'dep-1' as DeploymentId,
      customerId: 'acme' as CustomerId,
      name: 'prod',
      target: {
        createDatabase: true,
        createIngress: true,
        createDns: true,
        createSecrets: true,
      },
      status: 'healthy' as DeploymentStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const desiredState: KeycloakDesiredState = {
      realmName: 'customer-acme',
      clients: ['webapp', 'api'],
      roles: ['admin', 'viewer'],
      groups: [],
      users: [],
    };

    // Should not throw
    await client.applyDesiredState(deployment, desiredState);
  } finally {
    server.close();
  }
});

test('HttpKeycloakClient verifies live state matches desired state', async () => {
  const server = createMockKeycloakServer();
  const port = await new Promise<number>(resolve => {
    server.listen(0, 'localhost', () => {
      const addr = server.address();
      if (addr && typeof addr !== 'string') {
        resolve(addr.port);
      }
    });
  });

  try {
    const client = new HttpKeycloakClient({
      baseUrl: `http://localhost:${port}`,
      realmAdminUser: 'admin',
      realmAdminPassword: 'admin',
      clientId: 'admin-cli',
      clientSecret: 'secret',
    });

    const deployment = {
      id: 'dep-1' as DeploymentId,
      customerId: 'acme' as CustomerId,
      name: 'prod',
      target: {
        createDatabase: true,
        createIngress: true,
        createDns: true,
        createSecrets: true,
      },
      status: 'healthy' as DeploymentStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const desiredState: KeycloakDesiredState = {
      realmName: 'customer-acme',
      clients: ['webapp', 'mobile'],
      roles: ['admin', 'user'],
      groups: [],
      users: [],
    };

    // Should not throw when live state matches
    await client.verifyLiveState(deployment, desiredState);
  } finally {
    server.close();
  }
});

test('HttpKeycloakClient throws when live state does not match desired state', async () => {
  const server = createMockKeycloakServer();
  const port = await new Promise<number>(resolve => {
    server.listen(0, 'localhost', () => {
      const addr = server.address();
      if (addr && typeof addr !== 'string') {
        resolve(addr.port);
      }
    });
  });

  try {
    const client = new HttpKeycloakClient({
      baseUrl: `http://localhost:${port}`,
      realmAdminUser: 'admin',
      realmAdminPassword: 'admin',
      clientId: 'admin-cli',
      clientSecret: 'secret',
    });

    const deployment = {
      id: 'dep-1' as DeploymentId,
      customerId: 'acme' as CustomerId,
      name: 'prod',
      target: {
        createDatabase: true,
        createIngress: true,
        createDns: true,
        createSecrets: true,
      },
      status: 'healthy' as DeploymentStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const desiredState: KeycloakDesiredState = {
      realmName: 'customer-acme',
      clients: ['webapp', 'missing-client'],
      roles: ['admin', 'user'],
      groups: [],
      users: [],
    };

    // Should throw when live state does not match
    await assert.rejects(
      () => client.verifyLiveState(deployment, desiredState),
      /Verification failed/
    );
  } finally {
    server.close();
  }
});
