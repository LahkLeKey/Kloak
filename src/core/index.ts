import {compare, hash} from 'bcrypt';

import type {AuditEvent, AuthFlow, AuthFlowId, AuthToken, CustomerId, Deployment, DeploymentId, DeploymentStatus, DeploymentVersion, DeploymentVersionId, DesiredStateSnapshot, ExternalApp, ExternalAppId, ExternalAppStatus, LinkAccountInput, LinkedAccount, LoginInput, OAuthAuthorizeInput, OAuthCallbackInput, ProvisioningReferences, ProvisioningTarget, ReconciliationRun, SignupInput, User, UserId,} from '../shared';

export interface CreateDeploymentInput {
  readonly customerId: CustomerId;
  readonly name: string;
  readonly target: ProvisioningTarget;
}

export interface CreateDeploymentVersionInput {
  readonly deploymentId: DeploymentId;
  readonly createdBy: string;
  readonly notes?: string;
  readonly snapshot: DesiredStateSnapshot;
}

export interface DeploymentRepository {
  listDeployments(): Promise<readonly Deployment[]>;
  listDeploymentVersions(deploymentId: DeploymentId):
      Promise<readonly DeploymentVersion[]>;
  getDeployment(deploymentId: DeploymentId): Promise<Deployment|null>;
  getDesiredState(versionId: DeploymentVersionId):
      Promise<DesiredStateSnapshot|null>;
  saveDeployment(deployment: Deployment): Promise<void>;
  deleteDeployment(deploymentId: DeploymentId): Promise<void>;
  saveDeploymentVersion(version: DeploymentVersion): Promise<void>;
  recordDesiredState(snapshot: DesiredStateSnapshot): Promise<void>;
  recordReconciliationRun(run: ReconciliationRun): Promise<void>;
  appendAuditEvent(event: AuditEvent): Promise<void>;
  saveExternalApp(app: ExternalApp): Promise<void>;
  getExternalApp(appId: ExternalAppId): Promise<ExternalApp|null>;
  listExternalApps(deploymentId: DeploymentId): Promise<readonly ExternalApp[]>;
  saveAuthFlow(flow: AuthFlow): Promise<void>;
  getAuthFlow(flowId: AuthFlowId): Promise<AuthFlow|null>;
  listAuthFlows(deploymentId: DeploymentId): Promise<readonly AuthFlow[]>;
  // Users
  saveUser(user: User): Promise<void>;
  getUser(userId: UserId): Promise<User|null>;
  getUserByEmail(deploymentId: DeploymentId, email: string): Promise<User|null>;
  listUsers(deploymentId: DeploymentId): Promise<readonly User[]>;
  deleteUser(userId: UserId): Promise<void>;
  linkAccount(userId: UserId, linkedAccount: LinkedAccount): Promise<void>;
  unlinkAccount(userId: UserId, providerId: string): Promise<void>;
}

export interface RegisterExternalAppInput {
  readonly deploymentId: DeploymentId;
  readonly name: string;
  readonly description?: string;
  readonly allowedOrigins: readonly string[];
  readonly redirectUris: readonly string[];
  readonly scopes: readonly string[];
}

export interface CreateAuthFlowInput {
  readonly deploymentId: DeploymentId;
  readonly externalAppId: ExternalAppId;
  readonly domain: string;
  readonly flowType: AuthFlow['flowType'];
  readonly postLoginRedirectUri: string;
  readonly postLogoutRedirectUri?: string;
  readonly idpHint?: string;
}

export interface CoreApi {
  createDeployment(input: CreateDeploymentInput): Promise<Deployment>;
  createDeploymentVersion(input: CreateDeploymentVersionInput):
      Promise<DeploymentVersion>;
  markDeploymentStatus(deploymentId: DeploymentId, status: DeploymentStatus):
      Promise<Deployment>;
  deleteDeployment(deploymentId: DeploymentId): Promise<void>;
  getDeployment(deploymentId: DeploymentId): Promise<Deployment|null>;
  listDeployments(): Promise<readonly Deployment[]>;
  recordReconciliationRun(run: ReconciliationRun): Promise<void>;
  recordProvisioningReferences(
      deploymentId: DeploymentId,
      references: ProvisioningReferences): Promise<void>;
  // External apps
  registerExternalApp(input: RegisterExternalAppInput): Promise<ExternalApp>;
  listExternalApps(deploymentId: DeploymentId): Promise<readonly ExternalApp[]>;
  getExternalApp(appId: ExternalAppId): Promise<ExternalApp|null>;
  updateExternalAppStatus(appId: ExternalAppId, status: ExternalAppStatus):
      Promise<ExternalApp>;
  // Auth flows
  createAuthFlow(input: CreateAuthFlowInput): Promise<AuthFlow>;
  listAuthFlows(deploymentId: DeploymentId): Promise<readonly AuthFlow[]>;
  getAuthFlow(flowId: AuthFlowId): Promise<AuthFlow|null>;
  // User authentication
  signup(input: SignupInput): Promise<User>;
  login(input: LoginInput): Promise<{user: User; token: AuthToken}>;
  getUser(userId: UserId): Promise<User|null>;
  listUsers(deploymentId: DeploymentId): Promise<readonly User[]>;
  linkAccount(userId: UserId, input: LinkAccountInput): Promise<User>;
  unlinkAccount(userId: UserId, providerId: string): Promise<User>;
  // OAuth flows
  getOAuthAuthorizationUrl(input: OAuthAuthorizeInput): Promise<string>;
  handleOAuthCallback(input: OAuthCallbackInput):
      Promise<{user: User; token: AuthToken}>;
  appendAuditEvent(event: AuditEvent): Promise<void>;
}

export class InMemoryDeploymentRepository implements DeploymentRepository {
  private readonly deployments = new Map<DeploymentId, Deployment>();
  private readonly versions = new Map<DeploymentVersionId, DeploymentVersion>();
  private readonly desiredStates =
      new Map<DeploymentVersionId, DesiredStateSnapshot>();
  private readonly reconciliationRuns = new Map<string, ReconciliationRun>();
  private readonly auditEvents = new Map<string, AuditEvent>();
  private readonly externalApps = new Map<ExternalAppId, ExternalApp>();
  private readonly authFlows = new Map<AuthFlowId, AuthFlow>();
  private readonly users = new Map<UserId, User>();
  private readonly oauthProviders = new Map<string, Record<string, string>>();

  async listDeployments(): Promise<readonly Deployment[]> {
    return [...this.deployments.values()];
  }

  async listDeploymentVersions(deploymentId: DeploymentId):
      Promise<readonly DeploymentVersion[]> {
    return [...this.versions.values()].filter(
        version => version.deploymentId === deploymentId);
  }

  async getDeployment(deploymentId: DeploymentId): Promise<Deployment|null> {
    return this.deployments.get(deploymentId) ?? null;
  }

  async getDesiredState(versionId: DeploymentVersionId):
      Promise<DesiredStateSnapshot|null> {
    return this.desiredStates.get(versionId) ?? null;
  }

  async saveDeployment(deployment: Deployment): Promise<void> {
    this.deployments.set(deployment.id, deployment);
  }

  async deleteDeployment(deploymentId: DeploymentId): Promise<void> {
    this.deployments.delete(deploymentId);
  }

  async saveDeploymentVersion(version: DeploymentVersion): Promise<void> {
    this.versions.set(version.id, version);
  }

  async recordDesiredState(snapshot: DesiredStateSnapshot): Promise<void> {
    this.desiredStates.set(snapshot.versionId, snapshot);
  }

  async recordReconciliationRun(run: ReconciliationRun): Promise<void> {
    this.reconciliationRuns.set(run.id, run);
  }

  async appendAuditEvent(event: AuditEvent): Promise<void> {
    this.auditEvents.set(event.id, event);
  }

  async saveExternalApp(app: ExternalApp): Promise<void> {
    this.externalApps.set(app.id, app);
  }

  async getExternalApp(appId: ExternalAppId): Promise<ExternalApp|null> {
    return this.externalApps.get(appId) ?? null;
  }

  async listExternalApps(deploymentId: DeploymentId):
      Promise<readonly ExternalApp[]> {
    return [...this.externalApps.values()].filter(
        a => a.deploymentId === deploymentId);
  }

  async saveAuthFlow(flow: AuthFlow): Promise<void> {
    this.authFlows.set(flow.id, flow);
  }

  async getAuthFlow(flowId: AuthFlowId): Promise<AuthFlow|null> {
    return this.authFlows.get(flowId) ?? null;
  }

  async listAuthFlows(deploymentId: DeploymentId):
      Promise<readonly AuthFlow[]> {
    return [...this.authFlows.values()].filter(
        f => f.deploymentId === deploymentId);
  }

  async saveUser(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async getUser(userId: UserId): Promise<User|null> {
    return this.users.get(userId) ?? null;
  }

  async getUserByEmail(deploymentId: DeploymentId, email: string):
      Promise<User|null> {
    for (const user of this.users.values()) {
      if (user.deploymentId === deploymentId &&
          user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  async listUsers(deploymentId: DeploymentId): Promise<readonly User[]> {
    return [...this.users.values()].filter(
        u => u.deploymentId === deploymentId);
  }

  async deleteUser(userId: UserId): Promise<void> {
    this.users.delete(userId);
  }

  async linkAccount(userId: UserId, linkedAccount: LinkedAccount):
      Promise<void> {
    const user = await this.getUser(userId);
    if (user === null) throw new Error(`User ${userId} not found`);
    const updated: User = {
      ...user,
      linkedAccounts: [...user.linkedAccounts, linkedAccount],
      updatedAt: new Date().toISOString(),
    };
    await this.saveUser(updated);
  }

  async unlinkAccount(userId: UserId, providerId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (user === null) throw new Error(`User ${userId} not found`);
    const updated: User = {
      ...user,
      linkedAccounts:
          user.linkedAccounts.filter(la => la.provider !== providerId),
      updatedAt: new Date().toISOString(),
    };
    await this.saveUser(updated);
  }
}

// ── Deployment Status Transition State Machine
// ──────────────────────────────────

type DeploymentStatus = 'draft'|'provisioning'|'healthy'|'drifted'|'repairing'|
    'failed'|'decommissioned';

interface StateTransitions {
  readonly [key: string]: readonly DeploymentStatus[];
}

const VALID_TRANSITIONS: StateTransitions = {
  draft: ['provisioning', 'decommissioned'],
  provisioning: ['healthy', 'failed', 'decommissioned'],
  healthy: ['drifted', 'decommissioned'],
  drifted: ['repairing', 'decommissioned'],
  repairing: ['healthy', 'failed', 'decommissioned'],
  failed: ['provisioning', 'decommissioned'],
  decommissioned: [],
};

function canTransitionTo(
    from: DeploymentStatus, to: DeploymentStatus): boolean {
  const allowed = VALID_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

function getAvailableTransitions(status: DeploymentStatus):
    readonly DeploymentStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────

export class CoreService implements CoreApi {
  constructor(public readonly repository: DeploymentRepository) {}

  async createDeployment(input: CreateDeploymentInput): Promise<Deployment> {
    const now = new Date().toISOString();
    const deployment: Deployment = {
      id: crypto.randomUUID(),
      customerId: input.customerId,
      name: input.name,
      target: input.target,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.saveDeployment(deployment);
    return deployment;
  }

  async createDeploymentVersion(input: CreateDeploymentVersionInput):
      Promise<DeploymentVersion> {
    const deployment = await this.repository.getDeployment(input.deploymentId);
    if (deployment === null) {
      throw new Error(`Deployment ${input.deploymentId} does not exist.`);
    }

    const existingVersions =
        await this.repository.listDeploymentVersions(input.deploymentId);
    const versionNumber = existingVersions.length + 1;

    const version: DeploymentVersion = {
      id: crypto.randomUUID(),
      deploymentId: input.deploymentId,
      number: versionNumber,
      createdBy: input.createdBy,
      notes: input.notes,
      snapshot: input.snapshot,
      createdAt: new Date().toISOString(),
    };

    const normalizedSnapshot = {
      ...input.snapshot,
      versionId: version.id,
    };

    const persistedVersion: DeploymentVersion = {
      ...version,
      snapshot: normalizedSnapshot,
    };

    await this.repository.saveDeploymentVersion(persistedVersion);
    await this.repository.recordDesiredState(normalizedSnapshot);

    await this.repository.saveDeployment({
      ...deployment,
      desiredVersionId: version.id,
      status: deployment.currentVersionId === undefined ? 'provisioning' :
                                                          'repairing',
      updatedAt: new Date().toISOString(),
    });

    return persistedVersion;
  }

  async markDeploymentStatus(
      deploymentId: DeploymentId,
      status: DeploymentStatus): Promise<Deployment> {
    const deployment = await this.repository.getDeployment(deploymentId);
    if (deployment === null) {
      throw new Error(`Deployment ${deploymentId} does not exist.`);
    }

    if (!canTransitionTo(deployment.status, status)) {
      throw new Error(
          `Cannot transition from ${deployment.status} to ${status}. ` +
          `Valid transitions: ${
              getAvailableTransitions(deployment.status).join(', ')}`);
    }

    const updatedDeployment: Deployment = {
      ...deployment,
      status,
      updatedAt: new Date().toISOString(),
    };

    await this.repository.saveDeployment(updatedDeployment);
    return updatedDeployment;
  }

  async deleteDeployment(deploymentId: DeploymentId): Promise<void> {
    const deployment = await this.repository.getDeployment(deploymentId);
    if (deployment === null) {
      throw new Error(`Deployment ${deploymentId} does not exist.`);
    }

    await this.repository.deleteDeployment(deploymentId);
  }

  async getDeployment(deploymentId: DeploymentId): Promise<Deployment|null> {
    return this.repository.getDeployment(deploymentId);
  }

  async listDeployments(): Promise<readonly Deployment[]> {
    return this.repository.listDeployments();
  }

  async recordReconciliationRun(run: ReconciliationRun): Promise<void> {
    await this.repository.recordReconciliationRun(run);
  }

  async recordProvisioningReferences(
      deploymentId: DeploymentId,
      references: ProvisioningReferences): Promise<void> {
    const deployment = await this.repository.getDeployment(deploymentId);
    if (deployment === null) {
      throw new Error(`Deployment ${deploymentId} does not exist.`);
    }

    await this.repository.saveDeployment({
      ...deployment,
      provisioningReferences: references,
      updatedAt: new Date().toISOString(),
    });
  }

  async appendAuditEvent(event: AuditEvent): Promise<void> {
    await this.repository.appendAuditEvent(event);
  }

  async registerExternalApp(input: RegisterExternalAppInput):
      Promise<ExternalApp> {
    const now = new Date().toISOString();
    const app: ExternalApp = {
      id: crypto.randomUUID() as ExternalAppId,
      deploymentId: input.deploymentId,
      name: input.name,
      description: input.description,
      allowedOrigins: input.allowedOrigins,
      redirectUris: input.redirectUris,
      scopes: input.scopes,
      clientId: `kloak-${input.name.toLowerCase().replace(/\s+/g, '-')}-${
          Date.now()}`,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.saveExternalApp(app);
    return app;
  }

  async listExternalApps(deploymentId: DeploymentId):
      Promise<readonly ExternalApp[]> {
    return this.repository.listExternalApps(deploymentId);
  }

  async getExternalApp(appId: ExternalAppId): Promise<ExternalApp|null> {
    return this.repository.getExternalApp(appId);
  }

  async updateExternalAppStatus(
      appId: ExternalAppId, status: ExternalAppStatus): Promise<ExternalApp> {
    const app = await this.repository.getExternalApp(appId);
    if (app === null) throw new Error(`ExternalApp ${appId} does not exist.`);
    const updated:
        ExternalApp = {...app, status, updatedAt: new Date().toISOString()};
    await this.repository.saveExternalApp(updated);
    return updated;
  }

  async createAuthFlow(input: CreateAuthFlowInput): Promise<AuthFlow> {
    const app = await this.repository.getExternalApp(input.externalAppId);
    if (app === null)
      throw new Error(`ExternalApp ${input.externalAppId} does not exist.`);
    const now = new Date().toISOString();
    const flow: AuthFlow = {
      id: crypto.randomUUID() as AuthFlowId,
      deploymentId: input.deploymentId,
      externalAppId: input.externalAppId,
      domain: input.domain,
      flowType: input.flowType,
      postLoginRedirectUri: input.postLoginRedirectUri,
      postLogoutRedirectUri: input.postLogoutRedirectUri,
      idpHint: input.idpHint,
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.saveAuthFlow(flow);
    return flow;
  }

  async listAuthFlows(deploymentId: DeploymentId):
      Promise<readonly AuthFlow[]> {
    return this.repository.listAuthFlows(deploymentId);
  }

  async getAuthFlow(flowId: AuthFlowId): Promise<AuthFlow|null> {
    return this.repository.getAuthFlow(flowId);
  }

  async signup(input: SignupInput): Promise<User> {
    const existing =
        await this.repository.getUserByEmail(input.deploymentId, input.email);
    if (existing !== null) {
      throw new Error(`User with email ${input.email} already exists`);
    }

    // TODO: Hash password with bcrypt
    const passwordHash =
        input.password ? await this.hashPassword(input.password) : undefined;

    const now = new Date().toISOString();
    const userId = crypto.randomUUID() as UserId;

    const user: User = {
      id: userId,
      deploymentId: input.deploymentId,
      email: input.email,
      passwordHash,
      displayName: input.displayName || input.email.split('@')[0],
      status: 'active',
      linkedAccounts: [
        {
          id: crypto.randomUUID(),
          userId,
          provider: 'email',
          providerId: input.email,
          isPrimary: true,
          createdAt: now,
          linkedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.saveUser(user);
    return user;
  }

  async login(input: LoginInput): Promise<{user: User; token: AuthToken}> {
    const user =
        await this.repository.getUserByEmail(input.deploymentId, input.email);
    if (user === null) {
      throw new Error(`User with email ${input.email} not found`);
    }

    if (!user.passwordHash) {
      throw new Error(`User ${user.id} has no password set`);
    }

    // TODO: Verify password with bcrypt
    const passwordValid =
        await this.verifyPassword(input.password, user.passwordHash);
    if (!passwordValid) {
      throw new Error('Invalid password');
    }

    const token = this.generateToken(user);
    const updatedUser: User = {
      ...user,
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.repository.saveUser(updatedUser);

    return {user: updatedUser, token};
  }

  async getUser(userId: UserId): Promise<User|null> {
    return this.repository.getUser(userId);
  }

  async listUsers(deploymentId: DeploymentId): Promise<readonly User[]> {
    return this.repository.listUsers(deploymentId);
  }

  async linkAccount(userId: UserId, input: LinkAccountInput): Promise<User> {
    const user = await this.repository.getUser(userId);
    if (user === null) throw new Error(`User ${userId} not found`);

    const existing =
        user.linkedAccounts.find(la => la.provider === input.provider);
    if (existing !== undefined) {
      throw new Error(
          `User already has a linked account for ${input.provider}`);
    }

    const linkedAccount: LinkedAccount = {
      id: crypto.randomUUID(),
      userId,
      provider: input.provider,
      providerId: input.providerId,
      providerEmail: input.providerEmail,
      isPrimary: user.linkedAccounts.length === 0,
      createdAt: new Date().toISOString(),
      linkedAt: new Date().toISOString(),
    };

    await this.repository.linkAccount(userId, linkedAccount);
    return this.repository.getUser(userId) as Promise<User>;
  }

  async unlinkAccount(userId: UserId, providerId: string): Promise<User> {
    const user = await this.repository.getUser(userId);
    if (user === null) throw new Error(`User ${userId} not found`);

    if (user.linkedAccounts.length <= 1) {
      throw new Error('Cannot unlink the only account');
    }

    await this.repository.unlinkAccount(userId, providerId);
    return this.repository.getUser(userId) as Promise<User>;
  }

  async getOAuthAuthorizationUrl(input: OAuthAuthorizeInput): Promise<string> {
    const config = this.getOAuthConfig(input.provider);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: input.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state: input.state || crypto.randomUUID(),
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  async handleOAuthCallback(input: OAuthCallbackInput):
      Promise<{user: User; token: AuthToken}> {
    // TODO: In production, validate state and exchange code for token via HTTP
    // For MVP, we'll use the code as a mock token and look up/create the user
    const mockUserInfo = this.parseMockOAuthCode(input.code, input.provider);

    let user = await this.repository.getUserByEmail(
        input.deploymentId, mockUserInfo.email);

    if (user === null) {
      // Create new user from OAuth provider
      const now = new Date().toISOString();
      const userId = crypto.randomUUID() as UserId;

      user = {
        id: userId,
        deploymentId: input.deploymentId,
        email: mockUserInfo.email,
        displayName: mockUserInfo.displayName,
        avatarUrl: mockUserInfo.avatarUrl,
        status: 'active',
        linkedAccounts: [
          {
            id: crypto.randomUUID(),
            userId,
            provider: input.provider,
            providerId: mockUserInfo.providerId,
            providerEmail: mockUserInfo.email,
            isPrimary: true,
            createdAt: now,
            linkedAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      await this.repository.saveUser(user);
    } else {
      // Link OAuth provider to existing user if not already linked
      const existing =
          user.linkedAccounts.find(la => la.provider === input.provider);

      if (!existing) {
        const now = new Date().toISOString();
        const linkedAccount: LinkedAccount = {
          id: crypto.randomUUID(),
          userId: user.id,
          provider: input.provider,
          providerId: mockUserInfo.providerId,
          providerEmail: mockUserInfo.email,
          isPrimary: false,
          createdAt: now,
          linkedAt: now,
        };

        await this.repository.linkAccount(user.id, linkedAccount);
        user = (await this.repository.getUser(user.id))!;
      }
    }

    const token = this.generateToken(user);
    return {user, token};
  }

  private getOAuthConfig(provider: string): {
    clientId: string; clientSecret: string; scopes: string[];
    authorizationUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
  } {
    // TODO: Load from secure configuration
    if (provider === 'github') {
      return {
        clientId: process.env.GITHUB_CLIENT_ID || 'mock-github-client-id',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || 'mock-github-secret',
        scopes: ['user', 'user:email'],
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
      };
    }

    if (provider === 'gmail') {
      return {
        clientId: process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock-google-secret',
        scopes: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
        ],
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v1/userinfo',
      };
    }

    throw new Error(`Unknown OAuth provider: ${provider}`);
  }

  private parseMockOAuthCode(code: string, provider: string): {
    providerId: string; email: string;
    displayName?: string;
    avatarUrl?: string;
  } {
    // TODO: Exchange code for real token via HTTP in production
    // For MVP, we decode from the code format: provider:id:email:name
    const parts = code.split(':');
    return {
      providerId: parts[1] || 'mock-user',
      email: parts[2] || `user-${Date.now()}@example.com`,
      displayName: parts[3] || `${provider} User`,
      avatarUrl: undefined,
    };
  }

  private async hashPassword(password: string): Promise<string> {
    return await hash(password, 10);
  }

  private async verifyPassword(password: string, hash: string):
      Promise<boolean> {
    return await compare(password, hash);
  }

  private generateToken(user: User): AuthToken {
    const now = Math.floor(Date.now() / 1000);
    return {
      userId: user.id,
      deploymentId: user.deploymentId,
      email: user.email,
      displayName: user.displayName,
      iat: now,
      exp: now + 24 * 60 * 60,  // 24 hours
    };
  }
}
