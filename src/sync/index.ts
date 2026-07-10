import type {DeploymentRepository} from '../core';
import type {Deployment, DeploymentId, DesiredStateSnapshot, DriftFinding, InfrastructureDesiredState, KeycloakDesiredState, ProvisioningTarget, ReconciliationRun,} from '../shared';

export interface KeycloakLiveState {
  readonly realmName: string;
  readonly clients: readonly string[];
  readonly roles: readonly string[];
  readonly groups: readonly string[];
  readonly userCount: number;
}

export interface InfrastructureLiveState {
  readonly target: ProvisioningTarget;
  readonly ingressHosts: readonly string[];
  readonly dnsRecords: readonly string[];
  readonly secrets: readonly string[];
}

export interface KeycloakClient {
  readLiveState(deployment: Deployment): Promise<KeycloakLiveState>;
  applyDesiredState(deployment: Deployment, desiredState: KeycloakDesiredState):
      Promise<void>;
  verifyLiveState(deployment: Deployment, desiredState: KeycloakDesiredState):
      Promise<void>;
}

export interface InfrastructureStateReader {
  readLiveState(target: ProvisioningTarget): Promise<InfrastructureLiveState>;
}

export interface SyncServiceDependencies {
  readonly repository: DeploymentRepository;
  readonly keycloak: KeycloakClient;
  readonly infrastructure: InfrastructureStateReader;
  readonly clock?: () => Date;
}

export class SyncService {
  constructor(private readonly dependencies: SyncServiceDependencies) {}

  async reconcileDeployment(deploymentId: DeploymentId):
      Promise<ReconciliationRun> {
    const deployment = await this.requireDeployment(deploymentId);
    const desiredState = await this.loadDesiredState(deployment);
    const startedAt = this.now().toISOString();

    const keycloakLiveState =
        await this.dependencies.keycloak.readLiveState(deployment);
    const infrastructureLiveState =
        await this.dependencies.infrastructure.readLiveState(deployment.target);
    const findings = diffDesiredState(
        desiredState, keycloakLiveState, infrastructureLiveState);

    if (findings.length === 0) {
      const run: ReconciliationRun = {
        id: crypto.randomUUID(),
        deploymentId,
        versionId: desiredState.versionId,
        startedAt,
        finishedAt: this.now().toISOString(),
        status: 'no-op',
        findings,
      };

      await this.dependencies.repository.recordReconciliationRun(run);
      await this.persistDeploymentStatus(deployment, 'healthy');
      return run;
    }

    await this.persistDeploymentStatus(deployment, 'repairing');
    await this.dependencies.keycloak.applyDesiredState(
        deployment, desiredState.keycloak);
    await this.dependencies.keycloak.verifyLiveState(
        deployment, desiredState.keycloak);

    const completedRun: ReconciliationRun = {
      id: crypto.randomUUID(),
      deploymentId,
      versionId: desiredState.versionId,
      startedAt,
      finishedAt: this.now().toISOString(),
      status: 'repaired',
      findings,
    };

    await this.dependencies.repository.recordReconciliationRun(completedRun);
    await this.persistDeploymentStatus(deployment, 'healthy');
    return completedRun;
  }

  private async requireDeployment(deploymentId: DeploymentId):
      Promise<Deployment> {
    const deployment =
        await this.dependencies.repository.getDeployment(deploymentId);
    if (deployment === null) {
      throw new Error(`Deployment ${deploymentId} does not exist.`);
    }

    return deployment;
  }

  private async loadDesiredState(deployment: Deployment):
      Promise<DesiredStateSnapshot> {
    if (deployment.desiredVersionId === undefined) {
      throw new Error(
          `Deployment ${deployment.id} does not have a desired version.`);
    }

    const desiredState = await this.dependencies.repository.getDesiredState(
        deployment.desiredVersionId);
    if (desiredState === null) {
      throw new Error(
          `Desired state ${deployment.desiredVersionId} does not exist.`);
    }

    return desiredState;
  }

  private async persistDeploymentStatus(
      deployment: Deployment, status: Deployment['status']): Promise<void> {
    const shouldAdvanceVersion =
        status === 'healthy' && deployment.desiredVersionId !== undefined;

    await this.dependencies.repository.saveDeployment({
      ...deployment,
      currentVersionId: shouldAdvanceVersion ? deployment.desiredVersionId :
                                               deployment.currentVersionId,
      status,
      updatedAt: this.now().toISOString(),
    });
  }

  private now(): Date {
    return this.dependencies.clock?.() ?? new Date();
  }
}

export function diffDesiredState(
    desiredState: DesiredStateSnapshot,
    keycloakLiveState: KeycloakLiveState,
    infrastructureLiveState: InfrastructureLiveState,
    ): readonly DriftFinding[] {
  const findings: DriftFinding[] = [];

  if (desiredState.keycloak.realmName !== keycloakLiveState.realmName) {
    findings.push({
      scope: 'keycloak',
      path: 'realmName',
      expected: desiredState.keycloak.realmName,
      actual: keycloakLiveState.realmName,
      severity: 'critical',
    });
  }

  if (desiredState.infrastructure.ingressHosts.length !==
      infrastructureLiveState.ingressHosts.length) {
    findings.push({
      scope: 'infrastructure',
      path: 'ingressHosts',
      expected: desiredState.infrastructure.ingressHosts,
      actual: infrastructureLiveState.ingressHosts,
      severity: 'warning',
    });
  }

  return findings;
}
