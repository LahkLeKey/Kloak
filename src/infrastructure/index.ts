import type { ProvisioningReferences, ProvisioningTarget } from '../shared';

export interface ProvisioningPlan {
  readonly target: ProvisioningTarget;
  readonly createDatabase: boolean;
  readonly createIngress: boolean;
  readonly createDns: boolean;
  readonly createSecrets: boolean;
}

export interface ProvisioningResult {
  readonly target: ProvisioningTarget;
  readonly externalReferences: ProvisioningReferences;
}

export interface InfrastructureService {
  provision(plan: ProvisioningPlan): Promise<ProvisioningResult>;
  update(plan: ProvisioningPlan): Promise<ProvisioningResult>;
  decommission(target: ProvisioningTarget): Promise<void>;
}
