import assert from 'node:assert/strict';
import test from 'node:test';

import type { CreateDeploymentInput } from './index.ts';
import { CoreService, InMemoryDeploymentRepository } from './index.ts';

const target: CreateDeploymentInput['target'] = {
  cloudProvider: 'aws',
  accountId: '123456789012',
  projectId: 'kloak',
  environment: 'prod',
};

function makeCore() {
  return new CoreService(new InMemoryDeploymentRepository());
}

test('registerExternalApp creates an app with pending status and generated clientId', async () => {
  const core = makeCore();
  const deployment = await core.createDeployment({ customerId: 'c1', name: 'prod', target });

  const app = await core.registerExternalApp({
    deploymentId: deployment.id,
    name: 'My SaaS App',
    allowedOrigins: ['https://app.example.com'],
    redirectUris: ['https://app.example.com/callback'],
    scopes: ['openid', 'profile', 'email'],
  });

  assert.equal(app.status, 'pending');
  assert.equal(app.deploymentId, deployment.id);
  assert.equal(app.name, 'My SaaS App');
  assert.ok(app.clientId.startsWith('kloak-my-saas-app-'));
  assert.deepEqual(app.scopes, ['openid', 'profile', 'email']);
  assert.deepEqual(app.redirectUris, ['https://app.example.com/callback']);
});

test('listExternalApps returns only apps for the given deployment', async () => {
  const core = makeCore();
  const d1 = await core.createDeployment({ customerId: 'c1', name: 'prod', target });
  const d2 = await core.createDeployment({ customerId: 'c2', name: 'staging', target });

  await core.registerExternalApp({
    deploymentId: d1.id,
    name: 'App A',
    allowedOrigins: ['https://a.example.com'],
    redirectUris: ['https://a.example.com/callback'],
    scopes: ['openid'],
  });
  await core.registerExternalApp({
    deploymentId: d1.id,
    name: 'App B',
    allowedOrigins: ['https://b.example.com'],
    redirectUris: ['https://b.example.com/callback'],
    scopes: ['openid'],
  });
  await core.registerExternalApp({
    deploymentId: d2.id,
    name: 'Other Deployment App',
    allowedOrigins: ['https://other.example.com'],
    redirectUris: ['https://other.example.com/callback'],
    scopes: ['openid'],
  });

  const appsD1 = await core.listExternalApps(d1.id);
  assert.equal(appsD1.length, 2);
  assert.ok(appsD1.every(a => a.deploymentId === d1.id));

  const appsD2 = await core.listExternalApps(d2.id);
  assert.equal(appsD2.length, 1);
});

test('getExternalApp returns null for unknown app', async () => {
  const core = makeCore();
  const result = await core.getExternalApp('nonexistent-id');
  assert.equal(result, null);
});

test('updateExternalAppStatus transitions status correctly', async () => {
  const core = makeCore();
  const deployment = await core.createDeployment({ customerId: 'c1', name: 'prod', target });
  const app = await core.registerExternalApp({
    deploymentId: deployment.id,
    name: 'My App',
    allowedOrigins: ['https://app.example.com'],
    redirectUris: ['https://app.example.com/cb'],
    scopes: ['openid'],
  });

  assert.equal(app.status, 'pending');

  const activated = await core.updateExternalAppStatus(app.id, 'active');
  assert.equal(activated.status, 'active');

  const suspended = await core.updateExternalAppStatus(app.id, 'suspended');
  assert.equal(suspended.status, 'suspended');
});

test('updateExternalAppStatus throws for unknown app', async () => {
  const core = makeCore();
  await assert.rejects(() => core.updateExternalAppStatus('ghost-id', 'active'), /does not exist/);
});

test('createAuthFlow links a domain to an external app', async () => {
  const core = makeCore();
  const deployment = await core.createDeployment({ customerId: 'c1', name: 'prod', target });
  const app = await core.registerExternalApp({
    deploymentId: deployment.id,
    name: 'Portal',
    allowedOrigins: ['https://portal.example.com'],
    redirectUris: ['https://portal.example.com/auth/callback'],
    scopes: ['openid', 'profile'],
  });

  const flow = await core.createAuthFlow({
    deploymentId: deployment.id,
    externalAppId: app.id,
    domain: 'portal.example.com',
    flowType: 'authorization_code_pkce',
    postLoginRedirectUri: 'https://portal.example.com/dashboard',
    postLogoutRedirectUri: 'https://portal.example.com/',
  });

  assert.equal(flow.domain, 'portal.example.com');
  assert.equal(flow.flowType, 'authorization_code_pkce');
  assert.equal(flow.externalAppId, app.id);
  assert.equal(flow.deploymentId, deployment.id);
  assert.equal(flow.postLoginRedirectUri, 'https://portal.example.com/dashboard');
});

test('createAuthFlow throws when external app does not exist', async () => {
  const core = makeCore();
  const deployment = await core.createDeployment({ customerId: 'c1', name: 'prod', target });

  await assert.rejects(
    () =>
      core.createAuthFlow({
        deploymentId: deployment.id,
        externalAppId: 'nonexistent-app-id',
        domain: 'example.com',
        flowType: 'authorization_code',
        postLoginRedirectUri: 'https://example.com/dashboard',
      }),
    /does not exist/
  );
});

test('listAuthFlows returns only flows for the given deployment', async () => {
  const core = makeCore();
  const d1 = await core.createDeployment({ customerId: 'c1', name: 'prod', target });
  const d2 = await core.createDeployment({ customerId: 'c2', name: 'staging', target });

  const appD1 = await core.registerExternalApp({
    deploymentId: d1.id,
    name: 'D1 App',
    allowedOrigins: ['https://d1.example.com'],
    redirectUris: ['https://d1.example.com/cb'],
    scopes: ['openid'],
  });
  const appD2 = await core.registerExternalApp({
    deploymentId: d2.id,
    name: 'D2 App',
    allowedOrigins: ['https://d2.example.com'],
    redirectUris: ['https://d2.example.com/cb'],
    scopes: ['openid'],
  });

  await core.createAuthFlow({
    deploymentId: d1.id,
    externalAppId: appD1.id,
    domain: 'd1.example.com',
    flowType: 'authorization_code_pkce',
    postLoginRedirectUri: 'https://d1.example.com/home',
  });
  await core.createAuthFlow({
    deploymentId: d2.id,
    externalAppId: appD2.id,
    domain: 'd2.example.com',
    flowType: 'client_credentials',
    postLoginRedirectUri: 'https://d2.example.com/home',
  });

  const d1Flows = await core.listAuthFlows(d1.id);
  assert.equal(d1Flows.length, 1);
  assert.equal(d1Flows[0]?.domain, 'd1.example.com');

  const d2Flows = await core.listAuthFlows(d2.id);
  assert.equal(d2Flows.length, 1);
  assert.equal(d2Flows[0]?.flowType, 'client_credentials');
});
