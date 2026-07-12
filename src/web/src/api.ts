// ── Shared domain types (mirrors src/shared/models.ts) ───────────────────────

export type DeploymentId = string;
export type ExternalAppId = string;
export type AuthFlowId = string;

export interface Deployment {
  id: DeploymentId;
  customerId: string;
  name: string;
  status:
    | 'draft'
    | 'provisioning'
    | 'healthy'
    | 'drifted'
    | 'repairing'
    | 'failed'
    | 'decommissioned';
  createdAt: string;
  updatedAt: string;
}

export interface ExternalApp {
  id: ExternalAppId;
  deploymentId: DeploymentId;
  name: string;
  description?: string;
  allowedOrigins: string[];
  redirectUris: string[];
  scopes: string[];
  clientId: string;
  clientSecretRef?: string;
  status: 'pending' | 'active' | 'suspended' | 'revoked';
  createdAt: string;
  updatedAt: string;
}

export interface AuthFlow {
  id: AuthFlowId;
  deploymentId: DeploymentId;
  externalAppId: ExternalAppId;
  domain: string;
  flowType: 'authorization_code' | 'authorization_code_pkce' | 'client_credentials' | 'device_code';
  postLoginRedirectUri: string;
  postLogoutRedirectUri?: string;
  idpHint?: string;
  createdAt: string;
  updatedAt: string;
}

// ── API client ────────────────────────────────────────────────────────────────

const BASE = '/api';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Deployments
  listDeployments: () => request<Deployment[]>('GET', '/deployments'),
  getDeployment: (id: DeploymentId) => request<Deployment>('GET', `/deployments/${id}`),

  // External apps
  registerApp: (
    deploymentId: DeploymentId,
    data: Omit<
      ExternalApp,
      'id' | 'deploymentId' | 'clientId' | 'status' | 'createdAt' | 'updatedAt'
    >
  ) => request<ExternalApp>('POST', `/deployments/${deploymentId}/apps`, data),
  listApps: (deploymentId: DeploymentId) =>
    request<ExternalApp[]>('GET', `/deployments/${deploymentId}/apps`),
  getApp: (appId: ExternalAppId) => request<ExternalApp>('GET', `/apps/${appId}`),
  updateAppStatus: (appId: ExternalAppId, status: ExternalApp['status']) =>
    request<ExternalApp>('PUT', `/apps/${appId}/status`, { status }),

  // Auth flows
  createFlow: (
    deploymentId: DeploymentId,
    data: Omit<AuthFlow, 'id' | 'deploymentId' | 'createdAt' | 'updatedAt'>
  ) => request<AuthFlow>('POST', `/deployments/${deploymentId}/flows`, data),
  listFlows: (deploymentId: DeploymentId) =>
    request<AuthFlow[]>('GET', `/deployments/${deploymentId}/flows`),
  getFlow: (flowId: AuthFlowId) => request<AuthFlow>('GET', `/flows/${flowId}`),
};
