-- Migration: 008_rotational_grazing
-- Date: 2026-03-20
-- Description: Add paddocks and paddock_moves tables for rotational grazing module
-- Depends on: 007_herds_species

-- Paddocks: named, reusable grazing locations
CREATE TABLE paddocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  acres NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique paddock names per user
CREATE UNIQUE INDEX paddocks_user_name_idx ON paddocks(user_id, name);

-- Paddock moves: one record per group entering a paddock
CREATE TABLE paddock_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE SET NULL,
  paddock_id UUID NOT NULL REFERENCES paddocks(id) ON DELETE RESTRICT,
  moved_in_at DATE NOT NULL,
  moved_out_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: paddocks
ALTER TABLE paddocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own paddocks"
  ON paddocks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own paddocks"
  ON paddocks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own paddocks"
  ON paddocks FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own paddocks"
  ON paddocks FOR DELETE
  USING (user_id = auth.uid());

-- RLS: paddock_moves
ALTER TABLE paddock_moves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own paddock moves"
  ON paddock_moves FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own paddock moves"
  ON paddock_moves FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own paddock moves"
  ON paddock_moves FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own paddock moves"
  ON paddock_moves FOR DELETE
  USING (user_id = auth.uid());

-- Rollback:
-- DROP TABLE IF EXISTS paddock_moves;
-- DROP TABLE IF EXISTS paddocks;
