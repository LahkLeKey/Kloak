import type {InfrastructureService, ProvisioningPlan, ProvisioningResult} from './index';

export class InMemoryInfrastructureService implements InfrastructureService {
  private readonly provisionedPlans: ProvisioningPlan[] = [];

  get plans(): readonly ProvisioningPlan[] {
    return this.provisionedPlans;
  }

  async provision(plan: ProvisioningPlan): Promise<ProvisioningResult> {
    this.provisionedPlans.push(plan);
    return {
      target: plan.target,
      externalReferences: {
        database: `${plan.target.accountId}/${plan.target.projectId}/database`,
        ingress: `${plan.target.accountId}/${plan.target.projectId}/ingress`,
      },
    };
  }

  async update(plan: ProvisioningPlan): Promise<ProvisioningResult> {
    return this.provision(plan);
  }

  async decommission(): Promise<void> {
    return;
  }
}
