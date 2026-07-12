import type {
  AuditEvent,
  CustomerId,
  Deployment,
  DeploymentId,
  DeploymentStatus,
  DeploymentVersion,
  DeploymentVersionId,
  DesiredStateSnapshot,
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
  appendAuditEvent(event: AuditEvent): Promise<void>;
}

export class InMemoryDeploymentRepository implements DeploymentRepository {
  private readonly deployments = new Map<DeploymentId, Deployment>();
  private readonly versions = new Map<DeploymentVersionId, DeploymentVersion>();
  private readonly desiredStates = new Map<DeploymentVersionId, DesiredStateSnapshot>();
  private readonly reconciliationRuns = new Map<string, ReconciliationRun>();
  private readonly auditEvents = new Map<string, AuditEvent>();

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
}
