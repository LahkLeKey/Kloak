import assert from 'node:assert/strict';
import test from 'node:test';

import {diffDesiredState} from './index.ts';

const desiredState = {
  deploymentId: 'deployment-1',
  versionId: 'version-1',
  keycloak: {
    realmName: 'customer-a',
    clients: [],
    roles: [],
    groups: [],
    users: [],
  },
  infrastructure: {
    ingressHosts: ['login.example.com', 'admin.example.com'],
    dnsRecords: [],
    secrets: [],
  },
} as const;

test(
    'diffDesiredState reports no drift when ingress hosts match in any order',
    () => {
      const findings = diffDesiredState(
          desiredState, {
            realmName: 'customer-a',
            clients: [],
            roles: [],
            groups: [],
            userCount: 0,
          },
          {
            target: {
              cloudProvider: 'aws',
              accountId: '123456789012',
              projectId: 'kloak',
              environment: 'prod',
            },
            ingressHosts: ['admin.example.com', 'login.example.com'],
            dnsRecords: [],
            secrets: [],
          });

      assert.deepEqual(findings, []);
    });

test('diffDesiredState reports drift when ingress hosts differ', () => {
  const findings = diffDesiredState(
      desiredState, {
        realmName: 'customer-a',
        clients: [],
        roles: [],
        groups: [],
        userCount: 0,
      },
      {
        target: {
          cloudProvider: 'aws',
          accountId: '123456789012',
          projectId: 'kloak',
          environment: 'prod',
        },
        ingressHosts: ['login.example.com', 'ops.example.com'],
        dnsRecords: [],
        secrets: [],
      });

  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.path, 'ingressHosts');
});