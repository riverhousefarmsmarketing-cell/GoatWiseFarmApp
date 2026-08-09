import { chromium, type FullConfig } from '@playwright/test';
import { STORAGE_STATE } from '../playwright.config';
import fs from 'fs';
import path from 'path';

/**
 * Logs in once with the E2E test account and saves the session (cookies) to
 * STORAGE_STATE so every test starts authenticated. Auth is cookie-based
 * (@supabase/ssr writes to document.cookie), so a saved storageState is enough.
 */
export default async function globalSetup(config: FullConfig) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error(
      '\n[e2e] Missing credentials. Set E2E_EMAIL and E2E_PASSWORD to a CONFIRMED ' +
        'test account before running the authenticated suite.\n' +
        'See e2e/README.md for how to create one.\n'
    );
  }

  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  // The dev server (webServer) may still be compiling on first run; retry the
  // initial navigation until it responds.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 10_000 });
      lastErr = undefined;
      break;
    } catch (e) {
      lastErr = e;
      await page.waitForTimeout(2_000);
    }
  }
  if (lastErr) {
    await browser.close();
    throw new Error(`[e2e] App did not become reachable at ${baseURL}: ${String(lastErr)}`);
  }

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // On success the login page pushes to /dashboard. If it doesn't, surface the
  // on-screen error (bad creds / unconfirmed email) instead of a vague timeout.
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
  } catch {
    const err = await page.locator('.bg-red-50').first().textContent().catch(() => null);
    await browser.close();
    throw new Error(
      `[e2e] Login did not reach /dashboard. On-screen error: ${err ?? '(none)'}. ` +
        'Check E2E_EMAIL/E2E_PASSWORD and that the account is email-confirmed.'
    );
  }

  await page.context().storageState({ path: STORAGE_STATE });
  await browser.close();
}
