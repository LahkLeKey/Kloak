import type {
  AuditEvent,
  AuthFlow,
  AuthFlowId,
  CustomerId,
  Deployment,
  DeploymentId,
  DeploymentStatus,
  DeploymentVersion,
  DeploymentVersionId,
  DesiredStateSnapshot,
  ExternalApp,
  ExternalAppId,
  ExternalAppStatus,
  ProvisioningReferences,
  ProvisioningTarget,
  ReconciliationRun,
} from '../shared';

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
  listDeploymentVersions(deploymentId: DeploymentId): Promise<readonly DeploymentVersion[]>;
  getDeployment(deploymentId: DeploymentId): Promise<Deployment | null>;
  getDesiredState(versionId: DeploymentVersionId): Promise<DesiredStateSnapshot | null>;
  saveDeployment(deployment: Deployment): Promise<void>;
  saveDeploymentVersion(version: DeploymentVersion): Promise<void>;
  recordDesiredState(snapshot: DesiredStateSnapshot): Promise<void>;
  recordReconciliationRun(run: ReconciliationRun): Promise<void>;
  appendAuditEvent(event: AuditEvent): Promise<void>;
  saveExternalApp(app: ExternalApp): Promise<void>;
  getExternalApp(appId: ExternalAppId): Promise<ExternalApp | null>;
  listExternalApps(deploymentId: DeploymentId): Promise<readonly ExternalApp[]>;
  saveAuthFlow(flow: AuthFlow): Promise<void>;
  getAuthFlow(flowId: AuthFlowId): Promise<AuthFlow | null>;
  listAuthFlows(deploymentId: DeploymentId): Promise<readonly AuthFlow[]>;
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
  createDeploymentVersion(input: CreateDeploymentVersionInput): Promise<DeploymentVersion>;
  markDeploymentStatus(deploymentId: DeploymentId, status: DeploymentStatus): Promise<Deployment>;
  getDeployment(deploymentId: DeploymentId): Promise<Deployment | null>;
  listDeployments(): Promise<readonly Deployment[]>;
  recordReconciliationRun(run: ReconciliationRun): Promise<void>;
  recordProvisioningReferences(
    deploymentId: DeploymentId,
    references: ProvisioningReferences
  ): Promise<void>;
  // External apps
  registerExternalApp(input: RegisterExternalAppInput): Promise<ExternalApp>;
  listExternalApps(deploymentId: DeploymentId): Promise<readonly ExternalApp[]>;
  getExternalApp(appId: ExternalAppId): Promise<ExternalApp | null>;
  updateExternalAppStatus(appId: ExternalAppId, status: ExternalAppStatus): Promise<ExternalApp>;
  // Auth flows
  createAuthFlow(input: CreateAuthFlowInput): Promise<AuthFlow>;
  listAuthFlows(deploymentId: DeploymentId): Promise<readonly AuthFlow[]>;
  getAuthFlow(flowId: AuthFlowId): Promise<AuthFlow | null>;
  appendAuditEvent(event: AuditEvent): Promise<void>;
}

export class InMemoryDeploymentRepository implements DeploymentRepository {
  private readonly deployments = new Map<DeploymentId, Deployment>();
  private readonly versions = new Map<DeploymentVersionId, DeploymentVersion>();
  private readonly desiredStates = new Map<DeploymentVersionId, DesiredStateSnapshot>();
  private readonly reconciliationRuns = new Map<string, ReconciliationRun>();
  private readonly auditEvents = new Map<string, AuditEvent>();
  private readonly externalApps = new Map<ExternalAppId, ExternalApp>();
  private readonly authFlows = new Map<AuthFlowId, AuthFlow>();

  async listDeployments(): Promise<readonly Deployment[]> {
    return [...this.deployments.values()];
  }

  async listDeploymentVersions(deploymentId: DeploymentId): Promise<readonly DeploymentVersion[]> {
    return [...this.versions.values()].filter(version => version.deploymentId === deploymentId);
  }

  async getDeployment(deploymentId: DeploymentId): Promise<Deployment | null> {
    return this.deployments.get(deploymentId) ?? null;
  }

  async getDesiredState(versionId: DeploymentVersionId): Promise<DesiredStateSnapshot | null> {
    return this.desiredStates.get(versionId) ?? null;
  }

  async saveDeployment(deployment: Deployment): Promise<void> {
    this.deployments.set(deployment.id, deployment);
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

  async getExternalApp(appId: ExternalAppId): Promise<ExternalApp | null> {
    return this.externalApps.get(appId) ?? null;
  }

  async listExternalApps(deploymentId: DeploymentId): Promise<readonly ExternalApp[]> {
    return [...this.externalApps.values()].filter(a => a.deploymentId === deploymentId);
  }

  async saveAuthFlow(flow: AuthFlow): Promise<void> {
    this.authFlows.set(flow.id, flow);
  }

  async getAuthFlow(flowId: AuthFlowId): Promise<AuthFlow | null> {
    return this.authFlows.get(flowId) ?? null;
  }

  async listAuthFlows(deploymentId: DeploymentId): Promise<readonly AuthFlow[]> {
    return [...this.authFlows.values()].filter(f => f.deploymentId === deploymentId);
  }
}

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

  async createDeploymentVersion(input: CreateDeploymentVersionInput): Promise<DeploymentVersion> {
    const deployment = await this.repository.getDeployment(input.deploymentId);
    if (deployment === null) {
      throw new Error(`Deployment ${input.deploymentId} does not exist.`);
    }

    const existingVersions = await this.repository.listDeploymentVersions(input.deploymentId);
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
      status: deployment.currentVersionId === undefined ? 'provisioning' : 'repairing',
      updatedAt: new Date().toISOString(),
    });

    return persistedVersion;
  }

  async markDeploymentStatus(
    deploymentId: DeploymentId,
    status: DeploymentStatus
  ): Promise<Deployment> {
    const deployment = await this.repository.getDeployment(deploymentId);
    if (deployment === null) {
      throw new Error(`Deployment ${deploymentId} does not exist.`);
    }

    const updatedDeployment: Deployment = {
      ...deployment,
      status,
      updatedAt: new Date().toISOString(),
    };

    await this.repository.saveDeployment(updatedDeployment);
    return updatedDeployment;
  }

  async getDeployment(deploymentId: DeploymentId): Promise<Deployment | null> {
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
    references: ProvisioningReferences
  ): Promise<void> {
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

  async registerExternalApp(input: RegisterExternalAppInput): Promise<ExternalApp> {
    const now = new Date().toISOString();
    const app: ExternalApp = {
      id: crypto.randomUUID() as ExternalAppId,
      deploymentId: input.deploymentId,
      name: input.name,
      description: input.description,
      allowedOrigins: input.allowedOrigins,
      redirectUris: input.redirectUris,
      scopes: input.scopes,
      clientId: `kloak-${input.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.saveExternalApp(app);
    return app;
  }

  async listExternalApps(deploymentId: DeploymentId): Promise<readonly ExternalApp[]> {
    return this.repository.listExternalApps(deploymentId);
  }

  async getExternalApp(appId: ExternalAppId): Promise<ExternalApp | null> {
    return this.repository.getExternalApp(appId);
  }

  async updateExternalAppStatus(
    appId: ExternalAppId,
    status: ExternalAppStatus
  ): Promise<ExternalApp> {
    const app = await this.repository.getExternalApp(appId);
    if (app === null) throw new Error(`ExternalApp ${appId} does not exist.`);
    const updated: ExternalApp = { ...app, status, updatedAt: new Date().toISOString() };
    await this.repository.saveExternalApp(updated);
    return updated;
  }

  async createAuthFlow(input: CreateAuthFlowInput): Promise<AuthFlow> {
    const app = await this.repository.getExternalApp(input.externalAppId);
    if (app === null) throw new Error(`ExternalApp ${input.externalAppId} does not exist.`);
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

  async listAuthFlows(deploymentId: DeploymentId): Promise<readonly AuthFlow[]> {
    return this.repository.listAuthFlows(deploymentId);
  }

  async getAuthFlow(flowId: AuthFlowId): Promise<AuthFlow | null> {
    return this.repository.getAuthFlow(flowId);
  }
}
