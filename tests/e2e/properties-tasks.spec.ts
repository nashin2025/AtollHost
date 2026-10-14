import { expect, test } from '@playwright/test';
import { signIn } from './fixtures';

test.describe('properties and tasks', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('the properties page shows the seeded property', async ({ page }) => {
    await page.goto('/properties');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Lagoon Villa' }),
    ).toBeVisible();
    await expect(page.getByText('Thulusdhoo, Kaafu')).toBeVisible();
  });

  test('a task can be created and appears in the list', async ({ page }) => {
    await page.goto('/tasks');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Tasks' }),
    ).toBeVisible();

    const title = `E2E task ${Date.now()}`;
    await page.getByRole('button', { name: 'New task' }).click();
    await page.getByLabel('Title').fill(title);
    await page.getByRole('button', { name: 'Create task' }).click();

    await expect(page.getByText(title)).toBeVisible();
  });
});
