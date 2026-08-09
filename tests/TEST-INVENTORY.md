# GoatWise Test Inventory

## Status: 1 automated suite

Run with `npm test`.

## Automated

| ID | Description | File | Notes |
|----|-------------|------|-------|
| test-rls-1 | Cross-farm data isolation (RLS) | `tests/rls-isolation.test.ts` | Provisions two throwaway users via the admin API, asserts neither can read/update/delete/plant the other's rows, then deletes them. Skips unless `SUPABASE_SERVICE_ROLE_KEY` is set. |

### Running test-rls-1

Needs three env vars; the service role key must come from CI secrets and never
be committed:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Without them the suite skips with a warning rather than failing, so unconfigured
machines stay green.

## Planned Tests Not Yet Automated

| Planned ID | Description | Priority | Blocked By |
|------------|-------------|----------|------------|
| test-1 | Fresh user creates animal and views profile | High | Need Playwright setup |
| test-auth-1 | Forgot password → reset link → sign in with new password | High | Need Playwright + mail capture |
| test-breed-1 | Breeding record to kidding to auto-create animal | High | Need E2E harness |
| test-famacha-1 | FAMACHA triggers correct Decision Layer alert | Medium | Decision Layer deployed |
| test-sync-1 | Pregnancy count matches across all pages | High | Known data sync bug |
| test-sample-1 | "Load Sample Data" is idempotent and does not duplicate herds | Medium | Loader currently fails partway through |
