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

// ─── External App / Multi-Domain Auth ────────────────────────────────────────

export type ExternalAppId = string;
export type AuthFlowId = string;

/**
 * An ExternalApp represents a third-party domain or application that delegates
 * authentication to Kloak. Instead of configuring OAuth separately for every
 * domain, operators register the app once and Kloak provisions the Keycloak
 * client and issues credentials centrally.
 */
export interface ExternalApp {
  readonly id: ExternalAppId;
  readonly deploymentId: DeploymentId;
  readonly name: string;
  readonly description?: string;
  /** The origin domains this app is allowed to redirect to after authentication */
  readonly allowedOrigins: readonly string[];
  /** OAuth redirect URIs for this application */
  readonly redirectUris: readonly string[];
  /** Scopes this app is permitted to request */
  readonly scopes: readonly string[];
  readonly clientId: string;
  /** Reference to the secret stored in Secrets Manager */
  readonly clientSecretRef?: string;
  readonly status: ExternalAppStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type ExternalAppStatus =
  | 'pending' // registered, Keycloak client not yet created
  | 'active' // Keycloak client provisioned, credentials issued
  | 'suspended' // temporarily disabled, client still exists
  | 'revoked'; // credentials revoked, client removed

/**
 * An AuthFlow describes how a specific domain initiates and completes
 * authentication for users. Maps external domains to ExternalApps.
 */
export interface AuthFlow {
  readonly id: AuthFlowId;
  readonly deploymentId: DeploymentId;
  readonly externalAppId: ExternalAppId;
  readonly domain: string;
  readonly flowType: AuthFlowType;
  readonly postLoginRedirectUri: string;
  readonly postLogoutRedirectUri?: string;
  readonly idpHint?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type AuthFlowType =
  | 'authorization_code'
  | 'authorization_code_pkce'
  | 'client_credentials'
  | 'device_code';

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
