import {expect, test} from '@playwright/test';

/**
 * Shared test fixtures and helpers for Kloak e2e tests.
 *
 * These helpers hit the real API server (localhost:3000) to set up
 * state before navigating through the UI.
 */

export interface CreatedDeployment {
  id: string;
  name: string;
  customerId: string;
}

export interface CreatedApp {
  id: string;
  name: string;
  deploymentId: string;
}

const API = 'http://localhost:3000';

export async function createDeployment(
    name: string,
    customerId = 'test-customer',
    ): Promise<CreatedDeployment> {
  const res = await fetch(`${API}/deployments`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      customerId,
      name,
      target: {
        cloudProvider: 'aws',
        accountId: '123456789012',
        projectId: 'kloak-e2e',
        environment: 'test',
      },
    }),
  });
  if (!res.ok) throw new Error(`Failed to create deployment: ${res.status}`);
  return res.json() as Promise<CreatedDeployment>;
}

export async function registerApp(
    deploymentId: string,
    name: string,
    domain: string,
    ): Promise<CreatedApp> {
  const res = await fetch(`${API}/deployments/${deploymentId}/apps`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      name,
      description: `E2E test app for ${domain}`,
      allowedOrigins: [`https://${domain}`],
      redirectUris: [`https://${domain}/auth/callback`],
      scopes: ['openid', 'profile', 'email'],
    }),
  });
  if (!res.ok) throw new Error(`Failed to register app: ${res.status}`);
  return res.json() as Promise<CreatedApp>;
}

export {expect, test};
