import {type CoreApi, CoreService, type CreateDeploymentInput, type CreateDeploymentVersionInput} from '../core';
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
  readonly core: CoreApi;
  readonly infrastructure: InfrastructureService;
  readonly syncDependencies: Omit<SyncServiceDependencies, 'repository'>;
}

export class DeploymentService {
  private readonly core: CoreApi;
  private readonly infrastructure: InfrastructureService;
  private readonly sync: SyncService;

  constructor(dependencies: Options) {
    this.core = dependencies.core;
    this.infrastructure = dependencies.infrastructure;
    this.sync = new SyncService({
      ...dependencies.syncDependencies,
      repository: extractRepository(dependencies.core),
    });
  }

  async deploy(input: Input): Promise<Result> {
    const deployment = await this.core.createDeployment(input.createDeployment);
    const provisioningResult =
        await this.infrastructure.provision(input.provisioningPlan);
    await this.core.createDeploymentVersion({
      deploymentId: deployment.id,
      createdBy: input.createVersion.createdBy,
      notes: input.createVersion.notes,
      snapshot: input.createVersion.snapshot,
    });
    const reconciliationRun =
        await this.sync.reconcileDeployment(deployment.id);

    return {
      deployment,
      provisioningResult,
      reconciliationRun,
    };
  }
}

function extractRepository(core: CoreApi) {
  if (!(core instanceof CoreService)) {
    throw new Error(
        'DeploymentService requires the default CoreService implementation for now.');
  }

  return core.repository;
}
