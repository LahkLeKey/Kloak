export type DeploymentId = string;
export type DeploymentVersionId = string;
export type CustomerId = string;
export type AuditEventId = string;
export type ReconciliationRunId = string;

export interface ProvisioningTarget {
  readonly cloudProvider: string;
  readonly accountId: string;
  readonly projectId: string;
  readonly environment: string;
}

export interface KeycloakDesiredState {
  readonly realmName: string;
  readonly clients: readonly KeycloakClientConfig[];
  readonly roles: readonly string[];
  readonly groups: readonly string[];
  readonly users: readonly KeycloakUserConfig[];
}

export interface KeycloakClientConfig {
  readonly clientId: string;
  readonly redirectUris: readonly string[];
  readonly secretRef?: string;
}

export interface KeycloakUserConfig {
  readonly username: string;
  readonly email?: string;
  readonly enabled: boolean;
  readonly roles: readonly string[];
}

export interface InfrastructureDesiredState {
  readonly ingressHosts: readonly string[];
  readonly dnsRecords: readonly DnsRecord[];
  readonly secrets: readonly SecretSpec[];
}

export interface DnsRecord {
  readonly name: string;
  readonly type: 'A' | 'AAAA' | 'CNAME' | 'TXT';
  readonly value: string;
}

export interface SecretSpec {
  readonly name: string;
  readonly source: 'generated' | 'managed' | 'external';
}

export interface DesiredStateSnapshot {
  readonly deploymentId: DeploymentId;
  readonly versionId: DeploymentVersionId;
  readonly keycloak: KeycloakDesiredState;
  readonly infrastructure: InfrastructureDesiredState;
}

export type DeploymentStatus =
  | 'draft'
  | 'provisioning'
  | 'healthy'
  | 'drifted'
  | 'repairing'
  | 'failed'
  | 'decommissioned';

export interface Deployment {
  readonly id: DeploymentId;
  readonly customerId: CustomerId;
  readonly name: string;
  readonly target: ProvisioningTarget;
  readonly currentVersionId?: DeploymentVersionId;
  readonly desiredVersionId?: DeploymentVersionId;
  readonly provisioningReferences?: ProvisioningReferences;
  readonly status: DeploymentStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DeploymentVersion {
  readonly id: DeploymentVersionId;
  readonly deploymentId: DeploymentId;
  readonly number: number;
  readonly createdBy: string;
  readonly notes?: string;
  readonly snapshot: DesiredStateSnapshot;
  readonly createdAt: string;
}

export type DriftSeverity = 'info' | 'warning' | 'critical';

export interface DriftFinding {
  readonly scope: 'keycloak' | 'infrastructure';
  readonly path: string;
  readonly expected: unknown;
  readonly actual: unknown;
  readonly severity: DriftSeverity;
}

export type ReconciliationStatus = 'running' | 'no-op' | 'repaired' | 'failed';

export interface ReconciliationRun {
  readonly id: ReconciliationRunId;
  readonly deploymentId: DeploymentId;
  readonly versionId: DeploymentVersionId;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly status: ReconciliationStatus;
  readonly findings: readonly DriftFinding[];
}

export interface AuditEvent {
  readonly id: AuditEventId;
  readonly deploymentId?: DeploymentId;
  readonly actor: string;
  readonly type: string;
  readonly payload: Record<string, unknown>;
  readonly at: string;
}

export type ProvisioningReferences = Record<string, string>;
