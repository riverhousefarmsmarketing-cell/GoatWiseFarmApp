import { test, expect } from '@playwright/test';
import { unique } from './helpers';

test.describe('finances', () => {
  test('add an expense transaction and see it in the list', async ({ page }) => {
    const description = unique('E2E Feed purchase');

    await page.goto('/dashboard/finances');
    await page.getByRole('button', { name: 'Add Transaction' }).click();

    // Modal defaults to Expense. Fill the required fields.
    await page.getByLabel('Category').selectOption({ label: 'Feed & Hay' });
    await page.getByLabel(/^Amount/).fill('42.50');
    await page.getByLabel('Description').fill(description);
    await page.getByRole('button', { name: 'Save Transaction' }).click();

    // View the Transactions tab and confirm it saved (regression guard for the
    // silent transaction-save failure Cole hit).
    await page.getByRole('button', { name: 'Transactions', exact: true }).click();
    await expect(page.getByText(description).first()).toBeVisible();
  });
});
