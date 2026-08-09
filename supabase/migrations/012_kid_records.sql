-- Migration: 012_kid_records
-- Date: 2026-08-09
-- Description: Add the kid_records table backing the Kidding page's per-kid
--              detail feature. The UI was built and shipped but the migration
--              was never written, so every read threw and every save failed.
-- Depends on: 001_initial_schema (breeding_records, animals)
--
-- Column set is taken from the insert payload in
-- src/app/dashboard/kidding/page.tsx and the KidRecord interface there.
-- kidding_records already exists and is a different thing: it records the
-- dam's kidding event (number born, alive, difficulty). This is one row per
-- individual kid.

CREATE TABLE kid_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  breeding_record_id UUID NOT NULL REFERENCES breeding_records(id) ON DELETE CASCADE,
  -- Nullable and SET NULL: a kid record can be logged without creating an
  -- animal, and deleting the animal later should not erase the birth record.
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sex TEXT NOT NULL,
  birth_weight NUMERIC,
  birth_weight_unit TEXT NOT NULL DEFAULT 'lbs',
  birth_order INTEGER,
  presentation TEXT,
  vigor_score INTEGER,
  -- HTML <input type="time"> supplies HH:MM; the form maps '' to NULL.
  colostrum_time TIME,
  retained BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deliberately accepts the full animals.sex vocabulary rather than just the
-- doe/buck the form offers today. Migration 010 had to widen exactly this kind
-- of constraint once already for multi-species support; no reason to repeat it.
ALTER TABLE kid_records ADD CONSTRAINT kid_records_sex_check
  CHECK (sex IN ('doe','buck','wether','female','male','castrated'));

ALTER TABLE kid_records ADD CONSTRAINT kid_records_presentation_check
  CHECK (presentation IS NULL OR presentation IN
    ('normal','posterior','breech','transverse','head_back','leg_back'));

-- The UI exposes a 1-10 slider.
ALTER TABLE kid_records ADD CONSTRAINT kid_records_vigor_score_check
  CHECK (vigor_score IS NULL OR (vigor_score >= 1 AND vigor_score <= 10));

ALTER TABLE kid_records ADD CONSTRAINT kid_records_birth_weight_unit_check
  CHECK (birth_weight_unit IN ('lbs','kg','oz'));

ALTER TABLE kid_records ADD CONSTRAINT kid_records_birth_order_check
  CHECK (birth_order IS NULL OR birth_order >= 1);

-- The page lists a user's kids and groups them by breeding record.
CREATE INDEX kid_records_user_id_idx ON kid_records(user_id);
CREATE INDEX kid_records_breeding_record_id_idx ON kid_records(breeding_record_id);

-- RLS: kid_records
ALTER TABLE kid_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own kid records"
  ON kid_records FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own kid records"
  ON kid_records FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own kid records"
  ON kid_records FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own kid records"
  ON kid_records FOR DELETE
  USING (user_id = auth.uid());
