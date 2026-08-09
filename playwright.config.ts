import { defineConfig, devices } from '@playwright/test';

// Path where global-setup saves the logged-in session (cookies). Reused by every
// test so we authenticate once. Gitignored.
export const STORAGE_STATE = 'e2e/.auth/state.json';

/**
 * Authenticated end-to-end tests for GoatWise.
 *
 * These exercise the REAL app against a REAL Supabase project, so they require:
 *   - A running app (started automatically via `webServer` unless E2E_BASE_URL is set)
 *   - A confirmed test account, provided via E2E_EMAIL / E2E_PASSWORD env vars
 *
 * See e2e/README.md for full setup. Quick start:
 *   npx playwright install chromium
 *   E2E_EMAIL=you@example.com E2E_PASSWORD=... npm run e2e
 */
export default defineConfig({
  testDir: './e2e',
  // The authed tests share one account and assert on data they create, so run
  // them serially rather than in parallel to avoid cross-test interference.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    storageState: STORAGE_STATE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // When E2E_BASE_URL is not set, start the local dev server. Requires a valid
  // .env.local (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY). Reuses an already-running
  // server if present.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
