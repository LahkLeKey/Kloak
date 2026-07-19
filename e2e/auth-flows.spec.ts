import {expect, test} from '@playwright/test';

import {createDeployment, registerApp} from './helpers';

/**
 * E2E: Auth flow management
 *
 * Verifies that operators can see domain-to-app auth flow mappings.
 * Auth flows are the core of kloak.net's value: one app registration
 * covers multiple domains without separate OAuth token setup per domain.
 */

test.describe('Auth flows', () => {
  test('empty state shown when no auth flows exist', async ({page}) => {
    const dep = await createDeployment('flows-empty', 'acme');
    await page.goto(`/deployments/${dep.id}`);

    await expect(page.getByText('No auth flows configured')).toBeVisible();
  });

  test(
      'auth flow row appears after creating a flow via API', async ({page}) => {
        const dep = await createDeployment('flows-test', 'acme');
        const app =
            await registerApp(dep.id, 'Portal', 'portal.flows.acme.com');

        // Create flow via API (flow creation UI is a future story)
        await fetch(`http://localhost:3000/deployments/${dep.id}/flows`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            externalAppId: app.id,
            domain: 'portal.flows.acme.com',
            flowType: 'authorization_code_pkce',
            postLoginRedirectUri: 'https://portal.flows.acme.com/dashboard',
          }),
        });

        await page.goto(`/deployments/${dep.id}`);

        const flowRow = page.getByTestId('auth-flow-row');
        await expect(flowRow).toBeVisible();
        await expect(flowRow.getByText('portal.flows.acme.com')).toBeVisible();
        await expect(flowRow.getByText('Auth Code + PKCE')).toBeVisible();
      });

  test('flow row shows the app name it belongs to', async ({page}) => {
    const dep = await createDeployment('flows-app-name', 'acme');
    const app = await registerApp(dep.id, 'My Named App', 'named.acme.com');

    await fetch(`http://localhost:3000/deployments/${dep.id}/flows`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        externalAppId: app.id,
        domain: 'named.acme.com',
        flowType: 'authorization_code',
        postLoginRedirectUri: 'https://named.acme.com/home',
      }),
    });

    await page.goto(`/deployments/${dep.id}`);

    const flowRow = page.getByTestId('auth-flow-row');
    await expect(flowRow.getByText('My Named App')).toBeVisible();
  });

  test('multiple flows are all displayed', async ({page}) => {
    const dep = await createDeployment('multi-flows', 'acme');
    const app1 = await registerApp(dep.id, 'App Alpha', 'alpha.acme.com');
    const app2 = await registerApp(dep.id, 'App Beta', 'beta.acme.com');

    const createFlow = (appId: string, domain: string) =>
        fetch(`http://localhost:3000/deployments/${dep.id}/flows`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            externalAppId: appId,
            domain,
            flowType: 'authorization_code_pkce',
            postLoginRedirectUri: `https://${domain}/home`,
          }),
        });

    await createFlow(app1.id, 'alpha.acme.com');
    await createFlow(app2.id, 'beta.acme.com');

    await page.goto(`/deployments/${dep.id}`);

    const rows = page.getByTestId('auth-flow-row');
    await expect(rows).toHaveCount(2);
  });
});
