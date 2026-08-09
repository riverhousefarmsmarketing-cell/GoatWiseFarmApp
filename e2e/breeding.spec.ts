import { test, expect } from '@playwright/test';
import { createGoat, unique } from './helpers';

test.describe('breeding', () => {
  test('record a breeding and see the doe under Pregnant Does', async ({ page }) => {
    // A breeding needs a doe and a buck. Create both (validates that the
    // species-neutral vocabulary animals actually appear in the dropdowns —
    // the exact bug Cole hit).
    const doe = await createGoat(page, { name: unique('E2E Doe'), sex: 'female', category: 'milking_female' });
    const buck = await createGoat(page, { name: unique('E2E Buck'), sex: 'male', category: 'male' });

    await page.goto('/dashboard/breeding');
    await page.getByRole('button', { name: 'Record Breeding' }).click();

    // Dropdowns must be populated (regression guard for the empty-dropdown bug).
    const doeSelect = page.getByLabel('Doe');
    const buckSelect = page.getByLabel('Buck');
    await expect(doeSelect).toBeVisible();
    await doeSelect.selectOption({ label: doe.name });
    await buckSelect.selectOption({ label: buck.name });

    // Breeding Date and Gestation default to sensible values; just save.
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // The doe should now appear on the Pregnant Does tab (the default tab).
    await expect(page.getByText(doe.name).first()).toBeVisible();
  });
});
