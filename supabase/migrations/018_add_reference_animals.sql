-- Migration: 018_add_reference_animals
-- Description: Support "reference animals" — outside bucks/does that a farmer
--   records as a breeding sire/dam but does NOT own (e.g. another farm's buck,
--   or an AI sire). They appear in sire/dam pickers and flow into kids' pedigree
--   and registration/pedigree certificates, but must be EXCLUDED from herd
--   counts, rosters, health/milk/weight tracking, and reports so they don't
--   skew totals.
--
-- Data model: reference animals are ordinary rows in `animals` (same user_id,
-- same RLS), distinguished only by is_reference = true. No new table, so the
-- existing sire_id/dam_id foreign keys and pedigree logic work unchanged.

ALTER TABLE public.animals
  ADD COLUMN IF NOT EXISTS is_reference boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.animals.is_reference IS
  'True for outside/reference animals (e.g. an external buck used only as a sire) '
  'that are not part of the herd. Excluded from herd counts, rosters, health/milk/'
  'weight, and reports; included in sire/dam pickers and pedigree.';

-- Most reads roster or aggregate owned animals only (is_reference = false).
-- A partial index keeps those user-scoped "owned only" scans fast.
CREATE INDEX IF NOT EXISTS idx_animals_user_owned
  ON public.animals (user_id)
  WHERE is_reference = false;
