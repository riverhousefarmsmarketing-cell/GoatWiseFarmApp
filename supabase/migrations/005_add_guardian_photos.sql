-- Migration: 005_add_guardian_photos
-- Date: 2026-02-16
-- Description: Add guardian_id to photos table for guardian animal photo uploads
-- Depends on: 001_initial_schema

ALTER TABLE photos ADD COLUMN guardian_id UUID REFERENCES guardians(id) ON DELETE CASCADE;

-- Index for querying photos by guardian
CREATE INDEX idx_photos_guardian_id ON photos(guardian_id);
