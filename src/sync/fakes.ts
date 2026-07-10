import type {Deployment, KeycloakDesiredState, ProvisioningTarget} from '../shared';

import type {InfrastructureLiveState, InfrastructureStateReader, KeycloakClient, KeycloakLiveState} from './index';

export class InMemoryKeycloakClient implements KeycloakClient {
  private liveStateByDeploymentId = new Map<string, KeycloakLiveState>();

  seed(deploymentId: string, state: KeycloakLiveState): void {
    this.liveStateByDeploymentId.set(deploymentId, state);
  }

  async readLiveState(deployment: Deployment): Promise<KeycloakLiveState> {
    return this.liveStateByDeploymentId.get(deployment.id) ?? {
      realmName: deployment.name,
      clients: [],
      roles: [],
      groups: [],
      userCount: 0,
    };
  }

  async applyDesiredState(
      deployment: Deployment,
      desiredState: KeycloakDesiredState): Promise<void> {
    this.liveStateByDeploymentId.set(deployment.id, {
      realmName: desiredState.realmName,
      clients: desiredState.clients.map((client) => client.clientId),
      roles: [...desiredState.roles],
      groups: [...desiredState.groups],
      userCount: desiredState.users.length,
    });
  }

  async verifyLiveState(
      deployment: Deployment,
      desiredState: KeycloakDesiredState): Promise<void> {
    const liveState = await this.readLiveState(deployment);
    if (liveState.realmName !== desiredState.realmName) {
      throw new Error(
          `Keycloak realm ${liveState.realmName} does not match desired realm ${desiredState.realmName}.`);
    }
  }
}

export class InMemoryInfrastructureStateReader implements
    InfrastructureStateReader {
  private liveStateByTarget = new Map<string, InfrastructureLiveState>();

  seed(target: ProvisioningTarget, state: InfrastructureLiveState): void {
    this.liveStateByTarget.set(targetKey(target), state);
  }

  async readLiveState(target: ProvisioningTarget):
      Promise<InfrastructureLiveState> {
    return this.liveStateByTarget.get(targetKey(target)) ?? {
      target,
      ingressHosts: [],
      dnsRecords: [],
      secrets: [],
    };
  }
}

function targetKey(target: ProvisioningTarget): string {
  return `${target.cloudProvider}:${target.accountId}:${target.projectId}:${
      target.environment}`;
}
