import {expect, test} from '@playwright/test';

import {createDeployment, registerApp} from './helpers';

/**
 * E2E: Manage external app lifecycle (activate / suspend / revoke)
 *
 * Operators control app credentials through status transitions.
 * Active apps can authenticate users; suspended apps are temporarily
 * blocked; revoked apps have credentials destroyed.
 */

test.describe('Manage app status', () => {
  test('pending app shows Activate button', async ({page}) => {
    const dep = await createDeployment('app-lifecycle', 'acme');
    await registerApp(dep.id, 'Lifecycle App', 'lifecycle.acme.com');

    await page.goto(`/deployments/${dep.id}`);

    const appCard =
        page.getByTestId('app-card').filter({hasText: 'Lifecycle App'});
    await expect(appCard.getByTestId('activate-btn')).toBeVisible();
    await expect(appCard.getByTestId('suspend-btn')).not.toBeVisible();
  });

  test('activating a pending app transitions it to active', async ({page}) => {
    const dep = await createDeployment('activate-test', 'acme');
    await registerApp(dep.id, 'App to Activate', 'activate.acme.com');

    await page.goto(`/deployments/${dep.id}`);

    const appCard =
        page.getByTestId('app-card').filter({hasText: 'App to Activate'});
    await appCard.getByTestId('activate-btn').click();

    await expect(appCard.getByTestId('status-badge')).toHaveText('Active');
    await expect(appCard.getByTestId('suspend-btn')).toBeVisible();
    await expect(appCard.getByTestId('activate-btn')).not.toBeVisible();
  });

  test(
      'suspending an active app transitions it to suspended',
      async ({page}) => {
        const dep = await createDeployment('suspend-test', 'acme');
        const app =
            await registerApp(dep.id, 'App to Suspend', 'suspend.acme.com');

        // Activate via API first
        await fetch(`http://localhost:3000/apps/${app.id}/status`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({status: 'active'}),
        });

        await page.goto(`/deployments/${dep.id}`);

        const appCard =
            page.getByTestId('app-card').filter({hasText: 'App to Suspend'});
        await appCard.getByTestId('suspend-btn').click();

        await expect(appCard.getByTestId('status-badge'))
            .toHaveText('Suspended');
      });

  test(
      'revoking an active app removes activate and suspend buttons',
      async ({page}) => {
        const dep = await createDeployment('revoke-test', 'acme');
        const app =
            await registerApp(dep.id, 'App to Revoke', 'revoke.acme.com');

        // Activate via API first
        await fetch(`http://localhost:3000/apps/${app.id}/status`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({status: 'active'}),
        });

        await page.goto(`/deployments/${dep.id}`);

        const appCard =
            page.getByTestId('app-card').filter({hasText: 'App to Revoke'});
        await appCard.getByTestId('revoke-btn').click();

        await expect(appCard.getByTestId('status-badge')).toHaveText('Revoked');
        await expect(appCard.getByTestId('activate-btn')).not.toBeVisible();
        await expect(appCard.getByTestId('suspend-btn')).not.toBeVisible();
        await expect(appCard.getByTestId('revoke-btn')).not.toBeVisible();
      });
});
