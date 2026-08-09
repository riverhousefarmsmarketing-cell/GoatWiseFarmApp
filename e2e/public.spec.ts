import { test, expect } from '@playwright/test';

// Public pages don't require auth; the shared storageState is harmless here.
test.describe('public pages', () => {
  test('landing page renders and shows early-access pricing', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/GoatWise/);
    // Pricing was changed to free-during-early-access.
    await expect(page.getByRole('heading', { name: /Free while we make it great/i })).toBeVisible();
    await expect(page.getByText(/Early access/i).first()).toBeVisible();
  });

  test('login page renders its form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('signup page renders', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('button', { name: /sign up|create/i }).first()).toBeVisible();
  });
});
