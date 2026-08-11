-- Widen the animals.sex and animals.category CHECK constraints to allow the
-- species-neutral vocabulary the app writes (female/male/castrated, and the
-- *_female / young_* / young categories), alongside the original goat words.
--
-- Background: the live database was already widened directly, but the migration
-- meant to record that change (010_update_category_sex_constraints.sql) was left
-- EMPTY, so a fresh build from migrations would rebuild the original narrow
-- constraints from 001 and reject every Add-Animal insert. This migration makes
-- the repo reproduce the live schema.
--
-- Safe to (re)apply anywhere: the new sets are a superset of the old, so no
-- existing row can violate them. DROP IF EXISTS + ADD keeps it idempotent.

ALTER TABLE animals DROP CONSTRAINT IF EXISTS animals_sex_check;
ALTER TABLE animals ADD CONSTRAINT animals_sex_check
  CHECK (sex = ANY (ARRAY[
    'doe', 'buck', 'wether',        -- original goat vocabulary
    'female', 'male', 'castrated'   -- species-neutral vocabulary
  ]::text[]));

ALTER TABLE animals DROP CONSTRAINT IF EXISTS animals_category_check;
ALTER TABLE animals ADD CONSTRAINT animals_category_check
  CHECK (category = ANY (ARRAY[
    -- original goat vocabulary
    'milking_doe', 'dry_doe', 'bred_doe', 'doeling', 'buck', 'buckling', 'wether', 'kid',
    -- species-neutral vocabulary
    'milking_female', 'dry_female', 'bred_female', 'young_female', 'male', 'young_male', 'castrated', 'young'
  ]::text[]));
