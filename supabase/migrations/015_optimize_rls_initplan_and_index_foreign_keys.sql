-- 015_optimize_rls_initplan_and_index_foreign_keys.sql
--
-- Performance hardening from the Supabase advisor. Two non-destructive changes;
-- neither alters what any policy permits or what any query returns.
--
-- 1) auth_rls_initplan (lint 0003): every RLS policy called auth.uid() per row.
--    Wrap it as (select auth.uid()) so Postgres evaluates it ONCE per query.
--    Semantically identical -- same permissions, same results, just faster at scale.
--
-- 2) unindexed_foreign_keys (lint 0001): add covering indexes on FK columns that
--    lacked one -- especially user_id, which every RLS policy filters on.

-- 1) Rewrite policies in place. Idempotent: skips anything already wrapped
--    (ILIKE guard) so re-running does not double-wrap.
DO $$
DECLARE
  r record;
  q text;
  c text;
  stmt text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    q := r.qual;
    c := r.with_check;

    IF q IS NOT NULL AND q ILIKE '%auth.uid()%' AND q NOT ILIKE '%select auth.uid()%' THEN
      q := replace(q, 'auth.uid()', '(select auth.uid())');
    ELSE
      q := r.qual;
    END IF;

    IF c IS NOT NULL AND c ILIKE '%auth.uid()%' AND c NOT ILIKE '%select auth.uid()%' THEN
      c := replace(c, 'auth.uid()', '(select auth.uid())');
    ELSE
      c := r.with_check;
    END IF;

    IF q IS NOT DISTINCT FROM r.qual AND c IS NOT DISTINCT FROM r.with_check THEN
      CONTINUE;  -- nothing to change for this policy
    END IF;

    stmt := format('ALTER POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    IF q IS NOT NULL THEN
      stmt := stmt || format(' USING (%s)', q);
    END IF;
    IF c IS NOT NULL THEN
      stmt := stmt || format(' WITH CHECK (%s)', c);
    END IF;
    EXECUTE stmt;
  END LOOP;
END $$;

-- 2) Covering indexes for the foreign keys the linter flagged as unindexed.
CREATE INDEX IF NOT EXISTS idx_animal_groups_group_id ON public.animal_groups (group_id);
CREATE INDEX IF NOT EXISTS idx_animal_groups_user_id ON public.animal_groups (user_id);
CREATE INDEX IF NOT EXISTS idx_animals_dam_id ON public.animals (dam_id);
CREATE INDEX IF NOT EXISTS idx_animals_sire_id ON public.animals (sire_id);
CREATE INDEX IF NOT EXISTS idx_breeding_plans_buck_id ON public.breeding_plans (buck_id);
CREATE INDEX IF NOT EXISTS idx_breeding_plans_doe_id ON public.breeding_plans (doe_id);
CREATE INDEX IF NOT EXISTS idx_breeding_plans_user_id ON public.breeding_plans (user_id);
CREATE INDEX IF NOT EXISTS idx_breeding_records_buck_id ON public.breeding_records (buck_id);
CREATE INDEX IF NOT EXISTS idx_breeding_records_user_id ON public.breeding_records (user_id);
CREATE INDEX IF NOT EXISTS idx_feed_inventory_feed_type_id ON public.feed_inventory (feed_type_id);
CREATE INDEX IF NOT EXISTS idx_feed_inventory_user_id ON public.feed_inventory (user_id);
CREATE INDEX IF NOT EXISTS idx_feed_schedules_herd_id ON public.feed_schedules (herd_id);
CREATE INDEX IF NOT EXISTS idx_feed_schedules_user_id ON public.feed_schedules (user_id);
CREATE INDEX IF NOT EXISTS idx_feed_types_user_id ON public.feed_types (user_id);
CREATE INDEX IF NOT EXISTS idx_feed_usage_user_id ON public.feed_usage (user_id);
CREATE INDEX IF NOT EXISTS idx_groups_user_id ON public.groups (user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_health_records_guardian_id ON public.guardian_health_records (guardian_id);
CREATE INDEX IF NOT EXISTS idx_guardian_health_records_user_id ON public.guardian_health_records (user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_vaccinations_guardian_id ON public.guardian_vaccinations (guardian_id);
CREATE INDEX IF NOT EXISTS idx_guardian_vaccinations_user_id ON public.guardian_vaccinations (user_id);
CREATE INDEX IF NOT EXISTS idx_guardians_herd_id ON public.guardians (herd_id);
CREATE INDEX IF NOT EXISTS idx_guardians_user_id ON public.guardians (user_id);
CREATE INDEX IF NOT EXISTS idx_health_records_user_id ON public.health_records (user_id);
CREATE INDEX IF NOT EXISTS idx_herd_transfers_animal_id ON public.herd_transfers (animal_id);
CREATE INDEX IF NOT EXISTS idx_herd_transfers_from_herd_id ON public.herd_transfers (from_herd_id);
CREATE INDEX IF NOT EXISTS idx_herd_transfers_to_herd_id ON public.herd_transfers (to_herd_id);
CREATE INDEX IF NOT EXISTS idx_herd_transfers_user_id ON public.herd_transfers (user_id);
CREATE INDEX IF NOT EXISTS idx_herds_user_id ON public.herds (user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON public.inspections (user_id);
CREATE INDEX IF NOT EXISTS idx_kid_records_animal_id ON public.kid_records (animal_id);
CREATE INDEX IF NOT EXISTS idx_kidding_records_breeding_record_id ON public.kidding_records (breeding_record_id);
CREATE INDEX IF NOT EXISTS idx_kidding_records_doe_id ON public.kidding_records (doe_id);
CREATE INDEX IF NOT EXISTS idx_kidding_records_user_id ON public.kidding_records (user_id);
CREATE INDEX IF NOT EXISTS idx_milk_records_user_id ON public.milk_records (user_id);
CREATE INDEX IF NOT EXISTS idx_paddock_moves_group_id ON public.paddock_moves (group_id);
CREATE INDEX IF NOT EXISTS idx_paddock_moves_paddock_id ON public.paddock_moves (paddock_id);
CREATE INDEX IF NOT EXISTS idx_paddock_moves_user_id ON public.paddock_moves (user_id);
CREATE INDEX IF NOT EXISTS idx_photos_health_record_id ON public.photos (health_record_id);
CREATE INDEX IF NOT EXISTS idx_photos_inspection_id ON public.photos (inspection_id);
CREATE INDEX IF NOT EXISTS idx_photos_predation_event_id ON public.photos (predation_event_id);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON public.photos (user_id);
CREATE INDEX IF NOT EXISTS idx_predation_events_guardian_id ON public.predation_events (guardian_id);
CREATE INDEX IF NOT EXISTS idx_predation_events_user_id ON public.predation_events (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_animal_id ON public.transactions (animal_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_weight_records_animal_id ON public.weight_records (animal_id);
CREATE INDEX IF NOT EXISTS idx_weight_records_user_id ON public.weight_records (user_id);
