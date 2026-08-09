-- 014_harden_security_definer_function_grants.sql
--
-- Security hardening flagged by the Supabase database linter
-- (lints 0028/0029): two SECURITY DEFINER functions in the public schema were
-- callable directly via the REST RPC endpoint (/rest/v1/rpc/<fn>) by the `anon`
-- and `authenticated` roles.
--
-- Both are trigger functions, not meant to be called directly:
--   * handle_new_user()  -- AFTER INSERT trigger on auth.users (creates a profile)
--   * rls_auto_enable()  -- event trigger that enables RLS on new public tables
--
-- Trigger execution does NOT check the caller's EXECUTE privilege, so revoking it
-- does not affect signup or the RLS auto-enable trigger -- it only removes the
-- ability to invoke these functions directly through the API. Safe and reversible.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
