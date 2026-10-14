import { expect, test } from '@playwright/test';
import { signIn } from './fixtures';

test.describe('sign in and overview', () => {
  test('unauthenticated visitors are sent to sign in', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Sign in' }),
    ).toBeVisible();
  });

  test('signing in shows the overview with live counts', async ({ page }) => {
    await signIn(page);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Overview' }),
    ).toBeVisible();
    for (const metric of [
      'Properties',
      'Open enquiries',
      'Unread enquiries',
      'Overdue tasks',
      'Pending approvals',
      'Integration health',
    ]) {
      await expect(
        page.getByRole('heading', { level: 3, name: metric }),
      ).toBeVisible();
    }
    await expect(page.getByText('Across your organizations')).toBeVisible();
  });
});
