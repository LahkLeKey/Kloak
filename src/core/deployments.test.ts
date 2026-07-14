import {describe, expect, it} from 'bun:test';

import type {CreateDeploymentInput, DeploymentId, DeploymentRepository} from '../shared';

import {CoreService, InMemoryDeploymentRepository} from './index';

function makeCore() {
  const repository: DeploymentRepository = new InMemoryDeploymentRepository();
  const core = new CoreService(repository);
  return {core, repository};
}

describe('Deployment creation and deletion', () => {
  it('creates a new deployment with specified configuration', async () => {
    const {core} = makeCore();
    const input: CreateDeploymentInput = {
      customerId: 'test-customer',
      name: 'test-deployment',
      target: {
        cloudProvider: 'aws',
        accountId: '123456789012',
        projectId: 'test-project',
        environment: 'staging',
      },
    };

    const deployment = await core.createDeployment(input);

    expect(deployment.customerId).toBe('test-customer');
    expect(deployment.name).toBe('test-deployment');
    expect(deployment.target.cloudProvider).toBe('aws');
    expect(deployment.target.accountId).toBe('123456789012');
    expect(deployment.target.projectId).toBe('test-project');
    expect(deployment.target.environment).toBe('staging');
    expect(deployment.status).toBe('draft');
  });

  it('lists deployments in the system', async () => {
    const {core} = makeCore();
    const input1: CreateDeploymentInput = {
      customerId: 'customer-1',
      name: 'deployment-1',
      target: {
        cloudProvider: 'aws',
        accountId: '111',
        projectId: 'proj-1',
        environment: 'staging',
      },
    };
    const input2: CreateDeploymentInput = {
      customerId: 'customer-2',
      name: 'deployment-2',
      target: {
        cloudProvider: 'gcp',
        accountId: '222',
        projectId: 'proj-2',
        environment: 'production',
      },
    };

    const dep1 = await core.createDeployment(input1);
    const dep2 = await core.createDeployment(input2);
    const all = await core.listDeployments();

    expect(all.length).toBeGreaterThanOrEqual(2);
    const created = all.filter(d => d.id === dep1.id || d.id === dep2.id);
    expect(created.length).toBe(2);
  });

  it('deletes a deployment by id', async () => {
    const {core} = makeCore();
    const input: CreateDeploymentInput = {
      customerId: 'to-delete',
      name: 'doomed-deployment',
      target: {
        cloudProvider: 'azure',
        accountId: '333',
        projectId: 'proj-3',
        environment: 'development',
      },
    };

    const deployment = await core.createDeployment(input);
    const depId = deployment.id as DeploymentId;

    await core.deleteDeployment(depId);

    const fetched = await core.getDeployment(depId);
    expect(fetched).toBeNull();
  });

  it('throws when deleting non-existent deployment', async () => {
    const {core} = makeCore();
    const fakeId = 'non-existent-id' as DeploymentId;

    let error: Error|null = null;
    try {
      await core.deleteDeployment(fakeId);
    } catch (e) {
      error = e as Error;
    }

    expect(error).not.toBeNull();
    expect((error as Error).message).toContain('does not exist');
  });
});

describe('Deployment status transitions', () => {
  it('allows draft to transition to provisioning', async () => {
    const {core} = makeCore();
    const input: CreateDeploymentInput = {
      customerId: 'test',
      name: 'test-deployment',
      target: {
        cloudProvider: 'aws',
        accountId: '123',
        projectId: 'proj',
        environment: 'staging',
      },
    };

    const deployment = await core.createDeployment(input);
    const updated = await core.markDeploymentStatus(
        deployment.id as DeploymentId, 'provisioning');

    expect(updated.status).toBe('provisioning');
  });

  it('allows draft to transition to decommissioned', async () => {
    const {core} = makeCore();
    const input: CreateDeploymentInput = {
      customerId: 'test',
      name: 'test-deployment',
      target: {
        cloudProvider: 'aws',
        accountId: '123',
        projectId: 'proj',
        environment: 'staging',
      },
    };

    const deployment = await core.createDeployment(input);
    const updated = await core.markDeploymentStatus(
        deployment.id as DeploymentId, 'decommissioned');

    expect(updated.status).toBe('decommissioned');
  });

  it('allows provisioning to transition to healthy', async () => {
    const {core} = makeCore();
    const input: CreateDeploymentInput = {
      customerId: 'test',
      name: 'test-deployment',
      target: {
        cloudProvider: 'aws',
        accountId: '123',
        projectId: 'proj',
        environment: 'staging',
      },
    };

    const deployment = await core.createDeployment(input);
    let updated = await core.markDeploymentStatus(
        deployment.id as DeploymentId, 'provisioning');
    updated =
        await core.markDeploymentStatus(updated.id as DeploymentId, 'healthy');

    expect(updated.status).toBe('healthy');
  });

  it('allows provisioning to transition to failed', async () => {
    const {core} = makeCore();
    const input: CreateDeploymentInput = {
      customerId: 'test',
      name: 'test-deployment',
      target: {
        cloudProvider: 'aws',
        accountId: '123',
        projectId: 'proj',
        environment: 'staging',
      },
    };

    const deployment = await core.createDeployment(input);
    let updated = await core.markDeploymentStatus(
        deployment.id as DeploymentId, 'provisioning');
    updated =
        await core.markDeploymentStatus(updated.id as DeploymentId, 'failed');

    expect(updated.status).toBe('failed');
  });

  it('allows healthy to transition to drifted', async () => {
    const {core} = makeCore();
    const input: CreateDeploymentInput = {
      customerId: 'test',
      name: 'test-deployment',
      target: {
        cloudProvider: 'aws',
        accountId: '123',
        projectId: 'proj',
        environment: 'staging',
      },
    };

    const deployment = await core.createDeployment(input);
    let updated = await core.markDeploymentStatus(
        deployment.id as DeploymentId, 'provisioning');
    updated =
        await core.markDeploymentStatus(updated.id as DeploymentId, 'healthy');
    updated =
        await core.markDeploymentStatus(updated.id as DeploymentId, 'drifted');

    expect(updated.status).toBe('drifted');
  });

  it('allows drifted to transition to repairing', async () => {
    const {core} = makeCore();
    const input: CreateDeploymentInput = {
      customerId: 'test',
      name: 'test-deployment',
      target: {
        cloudProvider: 'aws',
        accountId: '123',
        projectId: 'proj',
        environment: 'staging',
      },
    };

    const deployment = await core.createDeployment(input);
    let updated = await core.markDeploymentStatus(
        deployment.id as DeploymentId, 'provisioning');
    updated =
        await core.markDeploymentStatus(updated.id as DeploymentId, 'healthy');
    updated =
        await core.markDeploymentStatus(updated.id as DeploymentId, 'drifted');
    updated = await core.markDeploymentStatus(
        updated.id as DeploymentId, 'repairing');

    expect(updated.status).toBe('repairing');
  });

  it('allows repairing to transition back to healthy', async () => {
    const {core} = makeCore();
    const input: CreateDeploymentInput = {
      customerId: 'test',
      name: 'test-deployment',
      target: {
        cloudProvider: 'aws',
        accountId: '123',
        projectId: 'proj',
        environment: 'staging',
      },
    };

    const deployment = await core.createDeployment(input);
    let updated = await core.markDeploymentStatus(
        deployment.id as DeploymentId, 'provisioning');
    updated =
        await core.markDeploymentStatus(updated.id as DeploymentId, 'healthy');
    updated =
        await core.markDeploymentStatus(updated.id as DeploymentId, 'drifted');
    updated = await core.markDeploymentStatus(
        updated.id as DeploymentId, 'repairing');
    updated =
        await core.markDeploymentStatus(updated.id as DeploymentId, 'healthy');

    expect(updated.status).toBe('healthy');
  });

  it('rejects invalid status transitions', async () => {
    const {core} = makeCore();
    const input: CreateDeploymentInput = {
      customerId: 'test',
      name: 'test-deployment',
      target: {
        cloudProvider: 'aws',
        accountId: '123',
        projectId: 'proj',
        environment: 'staging',
      },
    };

    const deployment = await core.createDeployment(input);

    let error: Error|null = null;
    try {
      await core.markDeploymentStatus(deployment.id as DeploymentId, 'healthy');
    } catch (e) {
      error = e as Error;
    }

    expect(error).not.toBeNull();
    expect((error as Error).message).toContain('Cannot transition');
  });

  it('rejects transitions from decommissioned status', async () => {
    const {core} = makeCore();
    const input: CreateDeploymentInput = {
      customerId: 'test',
      name: 'test-deployment',
      target: {
        cloudProvider: 'aws',
        accountId: '123',
        projectId: 'proj',
        environment: 'staging',
      },
    };

    const deployment = await core.createDeployment(input);
    let updated = await core.markDeploymentStatus(
        deployment.id as DeploymentId, 'decommissioned');

    let error: Error|null = null;
    try {
      await core.markDeploymentStatus(
          updated.id as DeploymentId, 'provisioning');
    } catch (e) {
      error = e as Error;
    }

    expect(error).not.toBeNull();
    expect((error as Error).message).toContain('Cannot transition');
  });

  it('updates the updatedAt timestamp when status changes', async () => {
    const {core} = makeCore();
    const input: CreateDeploymentInput = {
      customerId: 'test',
      name: 'test-deployment',
      target: {
        cloudProvider: 'aws',
        accountId: '123',
        projectId: 'proj',
        environment: 'staging',
      },
    };

    const deployment = await core.createDeployment(input);
    const initialTime = deployment.updatedAt;

    await new Promise(resolve => setTimeout(resolve, 10));

    const updated = await core.markDeploymentStatus(
        deployment.id as DeploymentId, 'provisioning');

    expect(updated.updatedAt).not.toBe(initialTime);
    expect(new Date(updated.updatedAt).getTime())
        .toBeGreaterThan(new Date(initialTime).getTime());
  });
});
