-- Migration: 004_fix_breeding_status_data
-- Date: 2026-02-16
-- Description: Fix breeding record status values and clean up orphaned data
-- Bug: Pregnancy count shows 0 on Dashboard/Kidding/Reports but correct on Breeding page
-- Root cause: Some records may have status='confirmed' instead of 'confirmed_pregnant'

-- Fix 1: Update any breeding records with wrong status value
UPDATE public.breeding_records
SET status = 'confirmed_pregnant'
WHERE status = 'confirmed';

-- Fix 2: Clean up orphaned milk records (Juniper phantom animal bug)
-- This deletes milk_records whose animal_id doesn't exist in the animals table
DELETE FROM public.milk_records
WHERE animal_id NOT IN (SELECT id FROM public.animals);

-- Fix 3: Clean up orphaned health records (same pattern)
DELETE FROM public.health_records
WHERE animal_id NOT IN (SELECT id FROM public.animals);

-- Verify: Run these after the migration to confirm counts match
-- SELECT status, COUNT(*) FROM breeding_records GROUP BY status;
-- SELECT COUNT(*) FROM milk_records WHERE animal_id NOT IN (SELECT id FROM animals);

-- Rollback:
-- UPDATE public.breeding_records SET status = 'confirmed' WHERE status = 'confirmed_pregnant';
-- (orphaned record cleanup cannot be rolled back)
