import { type Page, expect } from '@playwright/test';

/** Unique, human-readable label so tests never collide on names. */
export function unique(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export type GoatSpec = {
  name: string;
  /** DB sex value. Add Animal writes the species-neutral vocabulary. */
  sex?: 'female' | 'male' | 'castrated';
  /** DB category value (must be valid for `sex`). */
  category?:
    | 'milking_female'
    | 'dry_female'
    | 'bred_female'
    | 'young_female'
    | 'male'
    | 'young_male'
    | 'castrated'
    | 'young';
};

/**
 * Creates an animal through the Add Animal form and returns its id + name.
 * Uses the current species-neutral vocabulary (female/male, *_female, etc.).
 */
export async function createGoat(
  page: Page,
  spec: GoatSpec
): Promise<{ id: string; name: string }> {
  const { name, sex = 'female', category = 'milking_female' } = spec;

  await page.goto('/dashboard/add-animal');
  await page.getByPlaceholder('e.g., Daisy').fill(name);
  // Native <select>s — set by the underlying DB value.
  await page.getByLabel('Sex').selectOption(sex);
  await page.getByLabel('Category').selectOption(category);
  await page.getByRole('button', { name: 'Save Animal' }).click();

  // On success the form redirects to the new animal's detail page.
  await page.waitForURL(/\/dashboard\/herd\/[0-9a-fA-F-]+/, { timeout: 20_000 });
  const id = page.url().split('/').pop() as string;
  await expect(page.getByText(name).first()).toBeVisible();
  return { id, name };
}
