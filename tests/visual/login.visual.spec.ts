import { expect, test } from '@playwright/test';

test.describe('Visual snapshots', () => {
  test('login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Accede con tu cuenta' })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
    });
  });
});
