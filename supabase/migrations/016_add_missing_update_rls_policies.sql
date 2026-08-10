-- 016_add_missing_update_rls_policies.sql
--
-- photos and guardian_vaccinations had SELECT/INSERT/DELETE row-level security
-- policies but no UPDATE policy. With RLS enabled, an UPDATE with no matching
-- policy affects ZERO rows and returns no error -- so the app's photo
-- caption/category edit and guardian-vaccination edit features appeared to save
-- (the modal closed with no error) while nothing actually changed.
--
-- Add the standard user-scoped UPDATE policy used across the rest of the schema,
-- written with the wrapped (select auth.uid()) form so it matches the
-- initplan optimization from migration 015. Idempotent via DROP ... IF EXISTS.

DROP POLICY IF EXISTS "Users can update own photos" ON public.photos;
CREATE POLICY "Users can update own photos"
  ON public.photos FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own guardian_vaccinations" ON public.guardian_vaccinations;
CREATE POLICY "Users can update own guardian_vaccinations"
  ON public.guardian_vaccinations FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
