# End-to-end tests (Playwright)

Authenticated browser tests that drive the **real app against the real Supabase
project**. They cover the core farmer workflows and act as regression guards for
the bugs fixed during troubleshooting (empty breeding/milk dropdowns, silent
transaction saves, category-label vocabulary, auth redirects).

## What's covered

| Spec | Flow |
| --- | --- |
| `public.spec.ts` | Landing / login / signup render; early-access pricing |
| `auth.spec.ts` | Unauthenticated `/dashboard` → `/login`; authed session lands on dashboard |
| `animals.spec.ts` | Add a doe and a buck; they appear in the herd with friendly category labels |
| `breeding.spec.ts` | Record a breeding (doe + buck dropdowns populate); doe shows under Pregnant Does |
| `milk.spec.ts` | Log milk for a milking doe |
| `finances.spec.ts` | Add an expense; it appears in the Transactions list |

## Prerequisites

1. **Network access to Supabase.** These tests need the browser to reach your
   Supabase project. They will NOT run in a sandbox that blocks egress to
   `*.supabase.co` (e.g. the hosted Claude Code environment) — run them from a
   local machine or an allowlisted CI runner.

2. **A confirmed test account.** Create a throwaway user and confirm its email:
   - Sign up in the app (`/signup`), then confirm the email link, **or**
   - In the Supabase dashboard → Authentication → Users → "Add user" with
     "Auto Confirm User" checked.

   Use a dedicated account — the tests create real data (animals, a breeding, a
   milk record, a transaction) under it.

3. **App config.** A valid `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the tests start `npm run dev` for you unless
   you point them at a deployed URL — see below).

## Install

```bash
npm install            # picks up @playwright/test
npx playwright install chromium
```

## Run

Against a locally-started dev server (default):

```bash
E2E_EMAIL="test@yourfarm.example" E2E_PASSWORD="…" npm run e2e
```

Against an already-running or deployed instance:

```bash
E2E_BASE_URL="https://your-preview.vercel.app" \
E2E_EMAIL="…" E2E_PASSWORD="…" npm run e2e
```

Useful variants:

```bash
npm run e2e:headed     # watch it drive a real browser
npm run e2e:ui         # Playwright's interactive UI mode
npx playwright show-report
```

## Notes

- Tests run **serially** (`workers: 1`) because they share one account and assert
  on data they create.
- Names are timestamped (`unique()`), so reruns don't collide — but the account
  will accumulate test data over time. Periodically clear it via the app
  (Settings → Clear All Data) or delete/recreate the test user.
- Selectors target accessible labels/roles and native `<select>` values. If a
  form's copy changes, update the matching helper/spec.
- These specs were authored against the app's markup but could not be executed
  in the environment where they were written (Supabase egress was blocked there),
  so expect to smooth over minor selector details on the first real run.
