-- Migration: 006_add_feed_usage
-- Date: 2026-02-16
-- Description: Add feed_usage table for tracking consumption per herd, enabling cost-per-herd reporting
-- Depends on: 001_initial_schema

CREATE TABLE IF NOT EXISTS public.feed_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feed_type_id UUID NOT NULL REFERENCES public.feed_types(id) ON DELETE CASCADE,
  herd_id UUID NOT NULL REFERENCES public.herds(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feed_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feed_usage"
  ON public.feed_usage FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own feed_usage"
  ON public.feed_usage FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own feed_usage"
  ON public.feed_usage FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own feed_usage"
  ON public.feed_usage FOR DELETE USING (user_id = auth.uid());

CREATE INDEX idx_feed_usage_herd ON feed_usage(herd_id);
CREATE INDEX idx_feed_usage_feed_type ON feed_usage(feed_type_id);
CREATE INDEX idx_feed_usage_date ON feed_usage(date);

-- Rollback:
-- DROP TABLE IF EXISTS public.feed_usage CASCADE;
