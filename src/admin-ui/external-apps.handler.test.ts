import assert from 'node:assert/strict';
import test from 'node:test';

import { CoreService, InMemoryDeploymentRepository } from '../core/index.ts';
import type { ExternalApp } from '../shared/index.ts';
import { AdminHandler } from './handler.ts';

const target = {
  cloudProvider: 'aws' as const,
  accountId: '123456789012',
  projectId: 'kloak',
  environment: 'prod',
};

async function makeHandlerWithDeployment() {
  const core = new CoreService(new InMemoryDeploymentRepository());
  const handler = new AdminHandler(core);
  const deployment = await core.createDeployment({ customerId: 'c1', name: 'prod', target });
  return { core, handler, deployment };
}

// ── External App routes ───────────────────────────────────────────────────────

test('POST /deployments/:id/apps registers an external app and returns 201', async () => {
  const { handler, deployment } = await makeHandlerWithDeployment();

  const res = await handler.handle({
    method: 'POST',
    path: '/deployments/:id/apps',
    params: { id: deployment.id },
    body: {
      name: 'My Portal',
      allowedOrigins: ['https://portal.example.com'],
      redirectUris: ['https://portal.example.com/callback'],
      scopes: ['openid', 'profile'],
    },
  });

  assert.equal(res.status, 201);
  const app = res.body as ExternalApp;
  assert.equal(app.name, 'My Portal');
  assert.equal(app.status, 'pending');
  assert.ok(app.id);
});

test('GET /deployments/:id/apps returns registered apps', async () => {
  const { core, handler, deployment } = await makeHandlerWithDeployment();

  await core.registerExternalApp({
    deploymentId: deployment.id,
    name: 'App One',
    allowedOrigins: ['https://one.example.com'],
    redirectUris: ['https://one.example.com/cb'],
    scopes: ['openid'],
  });
  await core.registerExternalApp({
    deploymentId: deployment.id,
    name: 'App Two',
    allowedOrigins: ['https://two.example.com'],
    redirectUris: ['https://two.example.com/cb'],
    scopes: ['openid'],
  });

  const res = await handler.handle({
    method: 'GET',
    path: '/deployments/:id/apps',
    params: { id: deployment.id },
    body: null,
  });

  assert.equal(res.status, 200);
  const apps = res.body as ExternalApp[];
  assert.equal(apps.length, 2);
});

test('GET /apps/:appId returns the app', async () => {
  const { core, handler, deployment } = await makeHandlerWithDeployment();
  const app = await core.registerExternalApp({
    deploymentId: deployment.id,
    name: 'My App',
    allowedOrigins: ['https://myapp.example.com'],
    redirectUris: ['https://myapp.example.com/cb'],
    scopes: ['openid'],
  });

  const res = await handler.handle({
    method: 'GET',
    path: '/apps/:appId',
    params: { appId: app.id },
    body: null,
  });

  assert.equal(res.status, 200);
  assert.equal((res.body as ExternalApp).name, 'My App');
});

test('GET /apps/:appId returns 404 for unknown app', async () => {
  const { handler } = await makeHandlerWithDeployment();

  const res = await handler.handle({
    method: 'GET',
    path: '/apps/:appId',
    params: { appId: 'ghost-id' },
    body: null,
  });

  assert.equal(res.status, 404);
});

test('PUT /apps/:appId/status updates app status', async () => {
  const { core, handler, deployment } = await makeHandlerWithDeployment();
  const app = await core.registerExternalApp({
    deploymentId: deployment.id,
    name: 'My App',
    allowedOrigins: ['https://myapp.example.com'],
    redirectUris: ['https://myapp.example.com/cb'],
    scopes: ['openid'],
  });

  const res = await handler.handle({
    method: 'PUT',
    path: '/apps/:appId/status',
    params: { appId: app.id },
    body: { status: 'active' },
  });

  assert.equal(res.status, 200);
  assert.equal((res.body as ExternalApp).status, 'active');
});

// ── Auth Flow routes ──────────────────────────────────────────────────────────

test('POST /deployments/:id/flows creates an auth flow and returns 201', async () => {
  const { core, handler, deployment } = await makeHandlerWithDeployment();
  const app = await core.registerExternalApp({
    deploymentId: deployment.id,
    name: 'Portal',
    allowedOrigins: ['https://portal.example.com'],
    redirectUris: ['https://portal.example.com/cb'],
    scopes: ['openid'],
  });

  const res = await handler.handle({
    method: 'POST',
    path: '/deployments/:id/flows',
    params: { id: deployment.id },
    body: {
      externalAppId: app.id,
      domain: 'portal.example.com',
      flowType: 'authorization_code_pkce',
      postLoginRedirectUri: 'https://portal.example.com/dashboard',
    },
  });

  assert.equal(res.status, 201);
  const flow = res.body as { domain: string; flowType: string };
  assert.equal(flow.domain, 'portal.example.com');
  assert.equal(flow.flowType, 'authorization_code_pkce');
});

test('GET /deployments/:id/flows returns flows for deployment', async () => {
  const { core, handler, deployment } = await makeHandlerWithDeployment();
  const app = await core.registerExternalApp({
    deploymentId: deployment.id,
    name: 'App',
    allowedOrigins: ['https://app.example.com'],
    redirectUris: ['https://app.example.com/cb'],
    scopes: ['openid'],
  });
  await core.createAuthFlow({
    deploymentId: deployment.id,
    externalAppId: app.id,
    domain: 'app.example.com',
    flowType: 'authorization_code',
    postLoginRedirectUri: 'https://app.example.com/home',
  });

  const res = await handler.handle({
    method: 'GET',
    path: '/deployments/:id/flows',
    params: { id: deployment.id },
    body: null,
  });

  assert.equal(res.status, 200);
  const flows = res.body as unknown[];
  assert.equal(flows.length, 1);
});

test('GET /flows/:flowId returns 404 for unknown flow', async () => {
  const { handler } = await makeHandlerWithDeployment();

  const res = await handler.handle({
    method: 'GET',
    path: '/flows/:flowId',
    params: { flowId: 'ghost-flow' },
    body: null,
  });

  assert.equal(res.status, 404);
});
