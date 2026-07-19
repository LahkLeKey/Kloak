import type { InfrastructureService, ProvisioningPlan, ProvisioningResult } from './index';

export class InMemoryInfrastructureService implements InfrastructureService {
  private readonly provisionedPlans: ProvisioningPlan[] = [];

  get plans(): readonly ProvisioningPlan[] {
    return this.provisionedPlans;
  }

  async provision(plan: ProvisioningPlan): Promise<ProvisioningResult> {
    this.provisionedPlans.push(plan);
    return {
      target: plan.target,
      externalReferences: buildExternalReferences(plan),
    };
  }

  async update(plan: ProvisioningPlan): Promise<ProvisioningResult> {
    return this.provision(plan);
  }

  async decommission(_: ProvisioningTarget): Promise<void> {
    return;
  }
}

function buildExternalReferences(plan: ProvisioningPlan) {
  const externalReferences: Record<string, string> = {};

  if (plan.createDatabase) {
    externalReferences.database = `${plan.target.accountId}/${plan.target.projectId}/database`;
  }

  if (plan.createIngress) {
    externalReferences.ingress = `${plan.target.accountId}/${plan.target.projectId}/ingress`;
  }

  if (plan.createDns) {
    externalReferences.dns = `${plan.target.accountId}/${plan.target.projectId}/dns`;
  }

  if (plan.createSecrets) {
    externalReferences.secrets = `${plan.target.accountId}/${plan.target.projectId}/secrets`;
  }

  return externalReferences;
}
