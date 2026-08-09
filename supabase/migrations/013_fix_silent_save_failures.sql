-- 013_fix_silent_save_failures.sql
--
-- Fixes several places where the app wrote a value or column the schema did not
-- allow, so PostgREST/Postgres rejected the write and (with no error handling)
-- it failed silently. All changes here are ADDITIVE and non-destructive:
-- widening a CHECK to allow more values, or adding a nullable/defaulted column.
-- No existing row or existing code path is affected.

-- 1. Allow 'planned' as a breeding_records status.
--    The "Plan Breeding" tab on the Breeding page (src/app/dashboard/breeding/page.tsx)
--    inserts status='planned'; the old CHECK rejected it, so the planner tab could
--    never save and was always empty.
ALTER TABLE public.breeding_records DROP CONSTRAINT IF EXISTS breeding_records_status_check;
ALTER TABLE public.breeding_records ADD CONSTRAINT breeding_records_status_check
  CHECK (status IN ('bred', 'confirmed_pregnant', 'open', 'kidded', 'aborted', 'planned'));

-- 2. Give breeding_plans a status column.
--    The Breeding Planner page (src/app/dashboard/breeding-planner/page.tsx) filters
--    on plan.status and updates it to 'completed'/'cancelled', but the column never
--    existed -- so creating a plan failed and every status read was undefined.
ALTER TABLE public.breeding_plans ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planned';
ALTER TABLE public.breeding_plans DROP CONSTRAINT IF EXISTS breeding_plans_status_check;
ALTER TABLE public.breeding_plans ADD CONSTRAINT breeding_plans_status_check
  CHECK (status IN ('planned', 'completed', 'cancelled', 'missed'));

-- 3. Allow 'observation' as a health_records type.
--    The "Log as Observation" action in the Health "Something's wrong" flow
--    (src/app/dashboard/health/page.tsx) writes type='observation'.
ALTER TABLE public.health_records DROP CONSTRAINT IF EXISTS health_records_type_check;
ALTER TABLE public.health_records ADD CONSTRAINT health_records_type_check
  CHECK (type IN ('vaccination', 'deworming', 'treatment', 'vet_visit', 'hoof_trim', 'injury', 'illness', 'other', 'observation'));

-- 4. Link predation-incident photos to their event.
--    src/app/dashboard/guardians/page.tsx stored predation photos with
--    inspection_id = <predation_event id>, but inspection_id is a FK to
--    inspections(id), so every insert violated the FK and the photo row was
--    silently dropped (leaving an orphaned file in storage). Add a proper
--    nullable FK to predation_events and point the insert at it.
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS predation_event_id UUID
  REFERENCES public.predation_events(id) ON DELETE SET NULL;
