import assert from 'node:assert/strict';
import test from 'node:test';

import {CoreService, InMemoryDeploymentRepository} from '../core/index.ts';
import type {DesiredStateSnapshot} from '../shared/index.ts';

import {AdminHandler} from './handler.ts';

function makeCore() {
  return new CoreService(new InMemoryDeploymentRepository());
}

const target = {
  cloudProvider: 'aws' as const,
  accountId: '123456789012',
  projectId: 'kloak',
  environment: 'prod',
};

const snapshot: DesiredStateSnapshot = {
  deploymentId: 'placeholder',
  versionId: 'placeholder',
  keycloak: {
    realmName: 'kloak',
    clients: [],
    roles: [],
    groups: [],
    users: [],
  },
  infrastructure: {
    ingressHosts: ['kloak.example.com'],
    dnsRecords: [],
    secrets: [],
  },
};

test('POST /deployments creates a deployment and returns 201', async () => {
  const handler = new AdminHandler(makeCore());

  const res = await handler.handle({
    method: 'POST',
    path: '/deployments',
    params: {},
    body: {customerId: 'cust-1', name: 'prod', target},
  });

  assert.equal(res.status, 201);
  const deployment = res.body as {
    id: string;
    name: string;
    status: string
  };
  assert.equal(deployment.name, 'prod');
  assert.equal(deployment.status, 'draft');
});

test('GET /deployments returns all deployments', async () => {
  const core = makeCore();
  const handler = new AdminHandler(core);

  await core.createDeployment({customerId: 'c1', name: 'a', target});
  await core.createDeployment({customerId: 'c2', name: 'b', target});

  const res = await handler.handle({
    method: 'GET',
    path: '/deployments',
    params: {},
    body: null,
  });

  assert.equal(res.status, 200);
  assert.equal((res.body as unknown[]).length, 2);
});

test('GET /deployments/:id returns 404 for unknown id', async () => {
  const handler = new AdminHandler(makeCore());

  const res = await handler.handle({
    method: 'GET',
    path: '/deployments/:id',
    params: {id: 'does-not-exist'},
    body: null,
  });

  assert.equal(res.status, 404);
});

test('GET /deployments/:id returns the deployment', async () => {
  const core = makeCore();
  const handler = new AdminHandler(core);

  const created =
      await core.createDeployment({customerId: 'c1', name: 'prod', target});

  const res = await handler.handle({
    method: 'GET',
    path: '/deployments/:id',
    params: {id: created.id},
    body: null,
  });

  assert.equal(res.status, 200);
  assert.equal((res.body as {id: string}).id, created.id);
});

test(
    'POST /deployments/:id/versions creates a version and returns 201',
    async () => {
      const core = makeCore();
      const handler = new AdminHandler(core);

      const deployment =
          await core.createDeployment({customerId: 'c1', name: 'prod', target});
      const versionSnapshot = {
        ...snapshot,
        deploymentId: deployment.id,
        versionId: crypto.randomUUID(),
      };

      const res = await handler.handle({
        method: 'POST',
        path: '/deployments/:id/versions',
        params: {id: deployment.id},
        body: {createdBy: 'operator', snapshot: versionSnapshot},
      });

      assert.equal(res.status, 201);
      assert.equal((res.body as {number: number}).number, 1);
    });

test('PUT /deployments/:id/status updates the deployment status', async () => {
  const core = makeCore();
  const handler = new AdminHandler(core);

  const deployment =
      await core.createDeployment({customerId: 'c1', name: 'prod', target});

  // First transition: draft → provisioning
  let res = await handler.handle({
    method: 'PUT',
    path: '/deployments/:id/status',
    params: {id: deployment.id},
    body: {status: 'provisioning'},
  });

  assert.equal(res.status, 200);
  assert.equal((res.body as {status: string}).status, 'provisioning');

  // Second transition: provisioning → healthy
  res = await handler.handle({
    method: 'PUT',
    path: '/deployments/:id/status',
    params: {id: deployment.id},
    body: {status: 'healthy'},
  });

  assert.equal(res.status, 200);
  assert.equal((res.body as {status: string}).status, 'healthy');
});

test('unknown route returns 404', async () => {
  const handler = new AdminHandler(makeCore());

  const res = await handler.handle({
    method: 'GET',
    path: '/unknown',
    params: {},
    body: null,
  });

  assert.equal(res.status, 404);
});
