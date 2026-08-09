import { test, expect } from '@playwright/test';

test.describe('authentication', () => {
  // Run these WITHOUT the saved session.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('unauthenticated dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated deep dashboard route redirects to login', async ({ page }) => {
    await page.goto('/dashboard/finances');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('authenticated session', () => {
  // Uses the saved session from global-setup.
  test('lands on the dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    // Sidebar/nav should be present for a logged-in user.
    await expect(page.getByRole('link', { name: /herd/i }).first()).toBeVisible();
  });
});
