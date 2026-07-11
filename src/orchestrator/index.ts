import {type CoreService, type CreateDeploymentInput, type CreateDeploymentVersionInput} from '../core';
import type {InfrastructureService, ProvisioningPlan, ProvisioningResult} from '../infrastructure';
import type {Deployment, ReconciliationRun} from '../shared';
import {SyncService, type SyncServiceDependencies} from '../sync';

export interface Input {
  readonly createDeployment: CreateDeploymentInput;
  readonly createVersion: Omit<CreateDeploymentVersionInput, 'deploymentId'>;
  readonly provisioningPlan: ProvisioningPlan;
}

export interface Result {
  readonly deployment: Deployment;
  readonly provisioningResult: ProvisioningResult;
  readonly reconciliationRun: ReconciliationRun;
}

export interface Options {
  readonly core: CoreService;
  readonly infrastructure: InfrastructureService;
  readonly syncDependencies: Omit<SyncServiceDependencies, 'repository'>;
}

export class DeploymentService {
  private readonly core: CoreService;
  private readonly infrastructure: InfrastructureService;
  private readonly sync: SyncService;

  constructor(dependencies: Options) {
    this.core = dependencies.core;
    this.infrastructure = dependencies.infrastructure;
    this.sync = new SyncService({
      ...dependencies.syncDependencies,
      repository: dependencies.core.repository,
    });
  }

  async deploy(input: Input): Promise<Result> {
    if (!sameTarget(
            input.createDeployment.target, input.provisioningPlan.target)) {
      throw new Error('Deployment target and provisioning target must match.');
    }

    const deployment = await this.core.createDeployment(input.createDeployment);
    const provisioningResult =
        await this.infrastructure.provision(input.provisioningPlan);
    await this.core.recordProvisioningReferences(
        deployment.id, provisioningResult.externalReferences);
    await this.core.createDeploymentVersion({
      deploymentId: deployment.id,
      createdBy: input.createVersion.createdBy,
      notes: input.createVersion.notes,
      snapshot: input.createVersion.snapshot,
    });
    const reconciliationRun =
        await this.sync.reconcileDeployment(deployment.id);
    const refreshedDeployment = await this.core.getDeployment(deployment.id);
    if (refreshedDeployment === null) {
      throw new Error(`Deployment ${deployment.id} does not exist.`);
    }

    return {
      deployment: refreshedDeployment,
      provisioningResult,
      reconciliationRun,
    };
  }
}

function sameTarget(
    left: ProvisioningPlan['target'],
    right: ProvisioningPlan['target']): boolean {
  return left.cloudProvider === right.cloudProvider &&
      left.accountId === right.accountId &&
      left.projectId === right.projectId &&
      left.environment === right.environment;
}
