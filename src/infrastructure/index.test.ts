import assert from 'node:assert/strict';
import test from 'node:test';

import {InMemoryInfrastructureService} from './in-memory.ts';

test('provision only returns the requested external references', async () => {
  const infrastructure = new InMemoryInfrastructureService();

  const result = await infrastructure.provision({
    target: {
      cloudProvider: 'aws',
      accountId: '123456789012',
      projectId: 'kloak',
      environment: 'prod',
    },
    createDatabase: true,
    createIngress: false,
    createDns: true,
    createSecrets: false,
  });

  assert.deepEqual(result.externalReferences, {
    database: '123456789012/kloak/database',
    dns: '123456789012/kloak/dns',
  });
});