import { test, expect } from '@playwright/test';
import { createGoat, unique } from './helpers';

test.describe('milk', () => {
  test('log a milk record for a milking doe', async ({ page }) => {
    // Milk logging offers only milking does; create one first.
    const milker = await createGoat(page, { name: unique('E2E Milker'), sex: 'female', category: 'milking_female' });

    await page.goto('/dashboard/milk');
    await page.getByRole('button', { name: 'Record Milking' }).click();

    // The milking doe must be selectable (guards the milk-dropdown vocabulary fix).
    const animalSelect = page.getByLabel('Animal');
    await expect(animalSelect).toBeVisible();
    await animalSelect.selectOption({ label: milker.name });
    await page.getByLabel('Session').selectOption('AM');
    await page.getByPlaceholder('e.g., 4.5').fill('4.5');
    await page.getByRole('button', { name: 'Save Record' }).click();

    // Today's milk list should now include this doe.
    await expect(page.getByText(milker.name).first()).toBeVisible();
  });
});
