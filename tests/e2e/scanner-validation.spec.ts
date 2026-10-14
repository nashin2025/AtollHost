import { expect, test } from '@playwright/test';
import { signIn } from './fixtures';

test.describe('scanner validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('an http target is rejected inline instead of failing a scan', async ({ page }) => {
    await page.goto('/scanner');
    await page.getByRole('button', { name: 'Start scan' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Target URL').fill('http://example.com');
    await dialog.getByRole('button', { name: 'Start scan' }).click();

    await expect(
      page.getByText(
        'Enter a full target address starting with https://, for example https://your-property.com.',
      ),
    ).toBeVisible();
    // The dialog stays open and no scan was started.
    await expect(dialog).toBeVisible();
  });
});
