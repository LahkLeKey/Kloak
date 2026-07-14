import {describe, expect, test} from 'bun:test';

import type {CreateDeploymentInput, DeploymentId, DeploymentRepository, LinkAccountInput, LoginInput, SignupInput, UserId,} from '../../../shared';
import {CoreService, InMemoryDeploymentRepository} from '../index.ts';

function makeCore() {
  const repository: DeploymentRepository = new InMemoryDeploymentRepository();
  const core = new CoreService(repository);
  return {core, repository};
}

async function createDeploymentForTesting(core: CoreService):
    Promise<DeploymentId> {
  const input: CreateDeploymentInput = {
    customerId: 'test-customer',
    name: 'test-deployment',
    target: {
      cloudProvider: 'aws',
      accountId: '123456789',
      projectId: 'test',
      environment: 'test',
    },
  };
  const deployment = await core.createDeployment(input);
  return deployment.id;
}

describe('User authentication', () => {
  test('signup creates a new user with email and password', async () => {
    const {core} = makeCore();
    const deploymentId = await createDeploymentForTesting(core);

    const input: SignupInput = {
      deploymentId,
      email: 'test@example.com',
      password: 'secure-password-123',
      displayName: 'Test User',
    };

    const user = await core.signup(input);

    expect(user.email).toBe('test@example.com');
    expect(user.displayName).toBe('Test User');
    expect(user.status).toBe('active');
    expect(user.linkedAccounts).toHaveLength(1);
    expect(user.linkedAccounts[0].provider).toBe('email');
  });

  test('signup throws if email already exists', async () => {
    const {core} = makeCore();
    const deploymentId = await createDeploymentForTesting(core);

    const input: SignupInput = {
      deploymentId,
      email: 'existing@example.com',
      password: 'password123',
    };

    await core.signup(input);

    try {
      await core.signup(input);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });

  test('login returns user and token for valid credentials', async () => {
    const {core} = makeCore();
    const deploymentId = await createDeploymentForTesting(core);

    const signupInput: SignupInput = {
      deploymentId,
      email: 'user@example.com',
      password: 'correct-password',
    };

    await core.signup(signupInput);

    const loginInput: LoginInput = {
      deploymentId,
      email: 'user@example.com',
      password: 'correct-password',
    };

    const {user, token} = await core.login(loginInput);

    expect(user.email).toBe('user@example.com');
    expect(token.userId).toBe(user.id);
    expect(token.deploymentId).toBe(deploymentId);
    expect(token.exp).toBeGreaterThan(token.iat);
  });

  test('login throws for invalid email', async () => {
    const {core} = makeCore();
    const deploymentId = await createDeploymentForTesting(core);

    const loginInput: LoginInput = {
      deploymentId,
      email: 'nonexistent@example.com',
      password: 'any-password',
    };

    try {
      await core.login(loginInput);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });

  test('getUser returns user by id', async () => {
    const {core} = makeCore();
    const deploymentId = await createDeploymentForTesting(core);

    const signupInput: SignupInput = {
      deploymentId,
      email: 'lookup@example.com',
      password: 'password123',
    };

    const created = await core.signup(signupInput);
    const retrieved = await core.getUser(created.id);

    expect(retrieved).toEqual(created);
  });

  test('getUser returns null for unknown user', async () => {
    const {core} = makeCore();
    const user = await core.getUser(crypto.randomUUID() as UserId);
    expect(user).toBeNull();
  });

  test('listUsers returns only users in the deployment', async () => {
    const {core} = makeCore();
    const dep1 = await createDeploymentForTesting(core);
    const dep2 = await createDeploymentForTesting(core);

    const user1 = await core.signup({
      deploymentId: dep1,
      email: 'user1@example.com',
      password: 'password',
    });

    const user2 = await core.signup({
      deploymentId: dep2,
      email: 'user2@example.com',
      password: 'password',
    });

    const list1 = await core.listUsers(dep1);
    const list2 = await core.listUsers(dep2);

    expect(list1).toHaveLength(1);
    expect(list2).toHaveLength(1);
    expect(list1[0].id).toBe(user1.id);
    expect(list2[0].id).toBe(user2.id);
  });

  test('linkAccount adds a GitHub account to a user', async () => {
    const {core} = makeCore();
    const deploymentId = await createDeploymentForTesting(core);

    const user = await core.signup({
      deploymentId,
      email: 'user@example.com',
      password: 'password123',
    });

    const linkInput: LinkAccountInput = {
      provider: 'github',
      providerId: 'github-username',
      providerEmail: 'github@example.com',
      displayName: 'GitHub User',
    };

    const updated = await core.linkAccount(user.id, linkInput);

    expect(updated.linkedAccounts).toHaveLength(2);
    const githubAccount =
        updated.linkedAccounts.find(la => la.provider === 'github');
    expect(githubAccount).toBeDefined();
    expect(githubAccount?.providerId).toBe('github-username');
  });

  test('linkAccount throws if already linked', async () => {
    const {core} = makeCore();
    const deploymentId = await createDeploymentForTesting(core);

    const user = await core.signup({
      deploymentId,
      email: 'user@example.com',
      password: 'password123',
    });

    const linkInput: LinkAccountInput = {
      provider: 'github',
      providerId: 'github-user',
    };

    await core.linkAccount(user.id, linkInput);

    try {
      await core.linkAccount(user.id, linkInput);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });

  test('unlinkAccount removes a provider from user', async () => {
    const {core} = makeCore();
    const deploymentId = await createDeploymentForTesting(core);

    const user = await core.signup({
      deploymentId,
      email: 'user@example.com',
      password: 'password123',
    });

    await core.linkAccount(user.id, {
      provider: 'github',
      providerId: 'github-user',
    });

    const updated = await core.unlinkAccount(user.id, 'github');

    expect(updated.linkedAccounts).toHaveLength(1);
    expect(updated.linkedAccounts[0].provider).toBe('email');
  });

  test('unlinkAccount throws if only one account remains', async () => {
    const {core} = makeCore();
    const deploymentId = await createDeploymentForTesting(core);

    const user = await core.signup({
      deploymentId,
      email: 'user@example.com',
      password: 'password123',
    });

    try {
      await core.unlinkAccount(user.id, 'email');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });
});
