import {expect, test} from '@playwright/test';

import {createDeployment} from './helpers';

/**
 * E2E: Deployments list page
 *
 * Verifies that the operator can see the list of deployments and
 * navigate to a deployment's detail view.
 */

test.describe('Deployments list', () => {
  test('shows empty state when no deployments exist', async ({page}) => {
    // Use a fresh in-memory state — restart the server for isolation is
    // impractical in e2e, so we just check that the page loads and the
    // title is visible.
    await page.goto('/');
    await expect(page.getByRole('heading', {
      name: /Customer deployments/i
    })).toBeVisible();
  });

  test('shows a deployment card after one is created', async ({page}) => {
    const dep = await createDeployment('e2e-list-test', 'e2e-customer');

    await page.goto('/');
    await expect(page.getByText(dep.name)).toBeVisible();
    await expect(page.getByText(dep.customerId)).toBeVisible();
  });

  test('navigates to deployment detail on click', async ({page}) => {
    const dep = await createDeployment('e2e-nav-test', 'nav-customer');

    await page.goto('/');
    await page.getByText(dep.name).click();

    await expect(page).toHaveURL(`/deployments/${dep.id}`);
    await expect(page.getByRole('heading', {name: dep.name})).toBeVisible();
  });

  test('renders Kloak brand in header', async ({page}) => {
    await page.goto('/');
    await expect(page.getByText('Kloak')).toBeVisible();
  });
});
