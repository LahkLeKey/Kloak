import {expect, test} from '@playwright/test';

import {createDeployment, registerApp} from './helpers';

/**
 * E2E: Register external application workflow
 *
 * The primary workflow for kloak.net: an operator connects a domain or
 * SaaS application to a deployment so users can authenticate without
 * configuring separate OAuth tokens per domain.
 */

test.describe('Register external application', () => {
  test('operator can register a new app via the form', async ({page}) => {
    const dep = await createDeployment('register-app-test', 'acme');

    // Navigate to the register-app form via the "Register app" button
    await page.goto(`/deployments/${dep.id}`);
    await page.getByTestId('add-app-btn').click();

    await expect(page).toHaveURL(`/deployments/${dep.id}/apps/new`);
    await expect(page.getByRole('heading', {
      name: /Register external application/i
    })).toBeVisible();

    // Fill in the form
    await page.getByTestId('name-input').fill('Company Portal');
    await page.getByTestId('description-input')
        .fill('Internal employee portal with SSO');
    await page.getByTestId('origins-input').fill('https://portal.acme.com');
    await page.getByTestId('redirects-input')
        .fill('https://portal.acme.com/auth/callback');
    await page.getByTestId('scopes-input').fill('openid profile email');

    await page.getByTestId('submit-btn').click();

    // Should navigate back to deployment detail after success
    await expect(page).toHaveURL(`/deployments/${dep.id}`);

    // The new app should be visible
    await expect(page.getByText('Company Portal')).toBeVisible();
  });

  test('registered app shows pending status initially', async ({page}) => {
    const dep = await createDeployment('status-test', 'acme');

    await page.goto(`/deployments/${dep.id}/apps/new`);
    await page.getByTestId('name-input').fill('Pending App');
    await page.getByTestId('origins-input').fill('https://app.example.com');
    await page.getByTestId('redirects-input')
        .fill('https://app.example.com/callback');
    await page.getByTestId('submit-btn').click();

    await expect(page).toHaveURL(`/deployments/${dep.id}`);

    const appCard =
        page.getByTestId('app-card').filter({hasText: 'Pending App'});
    await expect(appCard.getByTestId('status-badge')).toHaveText('Pending');
  });

  test(
      'form validation requires name, origins, and redirects',
      async ({page}) => {
        const dep = await createDeployment('validation-test', 'acme');
        await page.goto(`/deployments/${dep.id}/apps/new`);

        // Try submitting without filling required fields
        await page.getByTestId('submit-btn').click();

        // Browser native validation should keep us on the form page
        await expect(page).toHaveURL(`/deployments/${dep.id}/apps/new`);
      });

  test(
      'operator can navigate back to deployment without submitting',
      async ({page}) => {
        const dep = await createDeployment('cancel-test', 'acme');

        await page.goto(`/deployments/${dep.id}/apps/new`);

        // Click breadcrumb link back to the deployment
        await page.getByRole('link', {name: 'Deployment'}).click();

        await expect(page).toHaveURL(`/deployments/${dep.id}`);
      });
});
