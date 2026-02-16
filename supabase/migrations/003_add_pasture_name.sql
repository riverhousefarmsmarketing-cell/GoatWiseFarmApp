-- Migration: 003_add_pasture_name
-- Date: 2026-02-16
-- Description: Add pasture_name to herds for location/pasture tracking
-- Depends on: 001_initial_schema

ALTER TABLE public.herds ADD COLUMN pasture_name TEXT;

-- Rollback:
-- ALTER TABLE public.herds DROP COLUMN pasture_name;
