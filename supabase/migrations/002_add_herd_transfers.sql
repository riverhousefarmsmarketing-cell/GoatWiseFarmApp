-- Migration: 002_add_herd_transfers
-- Date: 2026-02-15
-- Description: Add herd_transfers table for tracking animal movements between herds.
--              Required by useHerds.ts transfer hooks.
-- Depends on: 001_initial_schema

CREATE TABLE IF NOT EXISTS public.herd_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  from_herd_id UUID REFERENCES public.herds(id) ON DELETE SET NULL,
  to_herd_id UUID NOT NULL REFERENCES public.herds(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  requested_date TIMESTAMPTZ DEFAULT NOW(),
  completed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.herd_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own herd_transfers"
  ON public.herd_transfers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own herd_transfers"
  ON public.herd_transfers FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own herd_transfers"
  ON public.herd_transfers FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own herd_transfers"
  ON public.herd_transfers FOR DELETE USING (user_id = auth.uid());

CREATE INDEX idx_herd_transfers_animal_id ON public.herd_transfers(animal_id);
CREATE INDEX idx_herd_transfers_status ON public.herd_transfers(status);

-- Rollback:
-- DROP TABLE IF EXISTS public.herd_transfers CASCADE;
