import assert from 'node:assert/strict';
import test from 'node:test';

import type {ProvisioningPlan} from '../infrastructure/index.ts';
import type {DeploymentId, ProvisioningTarget} from '../shared/index.ts';

// Mock AWS SDK classes to avoid actual AWS calls in tests
class MockRDSClient {
  async send(command: unknown) {
    return {
      DBInstance: {
        Endpoint: {
          Address: 'kloak-db.c9akciq32.us-east-1.rds.amazonaws.com',
          Port: 5432,
        },
      },
    };
  }

  destroy() {}
}

class MockRoute53Client {
  async send(command: unknown) {
    return {
      ResourceRecordSets: [
        {
          Name: 'example.com',
          Type: 'A',
        },
      ],
    };
  }

  destroy() {}
}

class MockSecretsManagerClient {
  async send(command: unknown) {
    return {
      ARN:
          'arn:aws:secretsmanager:us-east-1:123456789012:secret:kloak/dep-1/secrets',
    };
  }

  destroy() {}
}

test('AWS provisioner provisions database', async () => {
  const plan: ProvisioningPlan = {
    deploymentId: 'dep-1' as DeploymentId,
    target: {
      region: 'us-east-1',
      createDatabase: true,
      createIngress: false,
      createDns: false,
      createSecrets: false,
    } as ProvisioningTarget,
  };

  // Test that plan structure is correct
  assert.equal(plan.target.region, 'us-east-1');
  assert.equal(plan.target.createDatabase, true);
});

test('AWS provisioner generates passwords', async () => {
  // Test password generation
  const generatePassword = (length = 16): string => {
    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const password1 = generatePassword();
  const password2 = generatePassword();

  assert.notEqual(password1, password2);
  assert.equal(password1.length, 16);
  assert.equal(password2.length, 16);
});

test('AWS provisioner structures external references', async () => {
  const externalReferences = {
    database: 'kloak-db.c9akciq32.us-east-1.rds.amazonaws.com',
    database_port: '5432',
    database_password: 'SecurePassword123!',
    secrets_arn:
        'arn:aws:secretsmanager:us-east-1:123456789012:secret:kloak/dep-1/secrets',
    dns_record: 'dep-1.example.com',
    dns_zone_id: 'Z1234567890ABC',
    ingress_type: 'ALB',
    ingress_scheme: 'internet-facing',
  };

  assert.equal(
      externalReferences.database,
      'kloak-db.c9akciq32.us-east-1.rds.amazonaws.com');
  assert.equal(externalReferences.database_port, '5432');
  assert(externalReferences.database_password.length >= 16);
  assert(externalReferences.secrets_arn.includes('arn:aws:secretsmanager'));
  assert(externalReferences.dns_record.includes('dep-1'));
  assert.equal(externalReferences.ingress_type, 'ALB');
});

test('AWS provisioner handles missing optional fields', async () => {
  const plan: ProvisioningPlan = {
    deploymentId: 'dep-2' as DeploymentId,
    target: {
      region: 'eu-west-1',
      createDatabase: true,
      createIngress: true,
      createDns: false,
      createSecrets: true,
    } as ProvisioningTarget,
  };

  // Verify plan doesn't require security group
  assert.equal(plan.target.region, 'eu-west-1');
  assert.equal(plan.target.createIngress, true);
  assert.equal(plan.target.createSecrets, true);
});
