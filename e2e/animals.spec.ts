import { test, expect } from '@playwright/test';
import { createGoat, unique } from './helpers';

test.describe('animals', () => {
  test('add an animal and see it in the herd list', async ({ page }) => {
    const name = unique('E2E Doe');
    await createGoat(page, { name, sex: 'female', category: 'milking_female' });

    // The herd list should show the new animal.
    await page.goto('/dashboard/herd');
    await expect(page.getByText(name).first()).toBeVisible();

    // And its category should render as a friendly label, not the raw value
    // (guards the vocabulary fix — should never show "milking_female").
    await expect(page.getByText('milking_female')).toHaveCount(0);
  });

  test('add a buck (male) and see it in the herd list', async ({ page }) => {
    const name = unique('E2E Buck');
    await createGoat(page, { name, sex: 'male', category: 'male' });

    await page.goto('/dashboard/herd');
    await expect(page.getByText(name).first()).toBeVisible();
  });
});
