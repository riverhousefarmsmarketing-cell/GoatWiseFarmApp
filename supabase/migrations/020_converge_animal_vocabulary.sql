-- 020: Converge animal sex/category onto the species-neutral vocabulary.
--
-- The app standardized on neutral values (female/male/castrated,
-- milking_female/...) but legacy goat-word rows (doe/buck/milking_doe/
-- doeling/...) remained in the data, and migration 017 widened the CHECK
-- constraints to allow BOTH. The result: the same animal type was stored two
-- ways, so any report/stat/filter that groups by the raw value under-counted
-- (e.g. "milking does" split across milking_doe and milking_female).
--
-- This migration backfills every legacy row to its neutral equivalent, then
-- narrows the constraints so only neutral values can be written going forward.
-- All write paths emit neutral as of the accompanying app change: the Add
-- Animal form already did; the CSV import now normalizes via toCanonicalSex/
-- toCanonicalCategory; and the sample-data loader was updated.

-- 1) Backfill sex
update animals set sex = 'female'    where sex = 'doe';
update animals set sex = 'male'      where sex = 'buck';
update animals set sex = 'castrated' where sex = 'wether';

-- 2) Backfill category
update animals set category = 'milking_female' where category = 'milking_doe';
update animals set category = 'dry_female'     where category = 'dry_doe';
update animals set category = 'bred_female'    where category = 'bred_doe';
update animals set category = 'young_female'   where category = 'doeling';
update animals set category = 'male'           where category = 'buck';
update animals set category = 'young_male'     where category = 'buckling';
update animals set category = 'castrated'      where category = 'wether';
update animals set category = 'young'          where category = 'kid';

-- 3) Narrow the constraints to the neutral set only (goat words no longer valid).
alter table animals drop constraint if exists animals_sex_check;
alter table animals add constraint animals_sex_check
  check (sex = any (array['female'::text, 'male'::text, 'castrated'::text]));

alter table animals drop constraint if exists animals_category_check;
alter table animals add constraint animals_category_check
  check (category = any (array[
    'milking_female'::text, 'dry_female'::text, 'bred_female'::text,
    'young_female'::text, 'male'::text, 'young_male'::text,
    'castrated'::text, 'young'::text
  ]));
