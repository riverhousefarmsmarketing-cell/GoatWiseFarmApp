-- Migration: 001_initial_schema
-- Date: 2026-02-15
-- Description: Complete GoatWise schema — all tables, RLS policies, and indexes.
--              Derived from codebase audit of src/types/database.ts, page interfaces,
--              and hook queries. This captures the baseline schema for a NEW Supabase project.
-- Depends on: Supabase Auth (auth.uid() must be available)
--
-- IMPORTANT: Run this in a NEW Supabase project's SQL Editor.
-- After running, regenerate types: npx supabase gen types typescript --project-id <id> > src/types/database.ts

-- ============================================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  farm_name TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================
-- 2. USER SETTINGS (farm-level preferences)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_name TEXT,
  farm_location TEXT,
  weight_unit TEXT DEFAULT 'lbs',
  milk_unit TEXT DEFAULT 'lbs',
  temperature_unit TEXT DEFAULT 'F',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- 3. HERDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.herds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.herds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own herds"
  ON public.herds FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own herds"
  ON public.herds FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own herds"
  ON public.herds FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own herds"
  ON public.herds FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 4. ANIMALS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.animals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  breed TEXT,
  sex TEXT NOT NULL CHECK (sex IN ('doe', 'buck', 'wether')),
  category TEXT NOT NULL CHECK (category IN (
    'milking_doe', 'dry_doe', 'bred_doe', 'doeling',
    'buck', 'buckling', 'wether', 'kid'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'deceased', 'culled')),
  birth_date DATE,
  purchase_date DATE,
  purchase_price NUMERIC,
  registration_number TEXT,
  microchip_id TEXT,
  tag_number TEXT,
  color_markings TEXT,
  sire_id UUID REFERENCES public.animals(id) ON DELETE SET NULL,
  dam_id UUID REFERENCES public.animals(id) ON DELETE SET NULL,
  herd_id UUID REFERENCES public.herds(id) ON DELETE SET NULL,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own animals"
  ON public.animals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own animals"
  ON public.animals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own animals"
  ON public.animals FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own animals"
  ON public.animals FOR DELETE USING (user_id = auth.uid());

CREATE INDEX idx_animals_user_id ON public.animals(user_id);
CREATE INDEX idx_animals_status ON public.animals(status);
CREATE INDEX idx_animals_category ON public.animals(category);
CREATE INDEX idx_animals_herd_id ON public.animals(herd_id);

-- ============================================================
-- 5. GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'custom',
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own groups"
  ON public.groups FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own groups"
  ON public.groups FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own groups"
  ON public.groups FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own groups"
  ON public.groups FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 6. ANIMAL_GROUPS (junction table)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.animal_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(animal_id, group_id)
);

ALTER TABLE public.animal_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own animal_groups"
  ON public.animal_groups FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own animal_groups"
  ON public.animal_groups FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own animal_groups"
  ON public.animal_groups FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 7. HEALTH RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'vaccination', 'deworming', 'treatment', 'vet_visit',
    'hoof_trim', 'injury', 'illness', 'other'
  )),
  date DATE NOT NULL,
  treatment TEXT,
  medication TEXT,
  dosage NUMERIC,
  dosage_unit TEXT,
  route TEXT,
  withdrawal_days INTEGER,
  cost NUMERIC,
  administered_by TEXT,
  follow_up_date DATE,
  follow_up_completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health_records"
  ON public.health_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own health_records"
  ON public.health_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own health_records"
  ON public.health_records FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own health_records"
  ON public.health_records FOR DELETE USING (user_id = auth.uid());

CREATE INDEX idx_health_records_animal_id ON public.health_records(animal_id);
CREATE INDEX idx_health_records_date ON public.health_records(date);

-- ============================================================
-- 8. INSPECTIONS (FAMACHA + body condition)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  famacha INTEGER CHECK (famacha BETWEEN 1 AND 5),
  body_condition_score NUMERIC,
  weight NUMERIC,
  weight_unit TEXT,
  temperature NUMERIC,
  temperature_unit TEXT,
  respiration INTEGER,
  heart_rate INTEGER,
  rumen_fill TEXT,
  appetite TEXT,
  attitude TEXT,
  coat_condition TEXT,
  action_required BOOLEAN DEFAULT FALSE,
  action_taken TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inspections"
  ON public.inspections FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own inspections"
  ON public.inspections FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own inspections"
  ON public.inspections FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own inspections"
  ON public.inspections FOR DELETE USING (user_id = auth.uid());

CREATE INDEX idx_inspections_animal_id ON public.inspections(animal_id);

-- ============================================================
-- 9. BREEDING RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.breeding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doe_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  buck_id UUID REFERENCES public.animals(id) ON DELETE SET NULL,
  breeding_date DATE NOT NULL,
  breeding_method TEXT DEFAULT 'natural' CHECK (breeding_method IN ('natural', 'ai', 'lap_ai', 'hand_breeding')),
  status TEXT DEFAULT 'bred' CHECK (status IN (
    'bred', 'confirmed_pregnant', 'open', 'kidded', 'aborted'
  )),
  due_date DATE,
  actual_kidding_date DATE,
  gestation_length INTEGER,
  kidding_date DATE,
  number_of_kids INTEGER,
  kidding_notes TEXT,
  labor_duration TEXT,
  assistance_required BOOLEAN DEFAULT FALSE,
  assistance_notes TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.breeding_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own breeding_records"
  ON public.breeding_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own breeding_records"
  ON public.breeding_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own breeding_records"
  ON public.breeding_records FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own breeding_records"
  ON public.breeding_records FOR DELETE USING (user_id = auth.uid());

CREATE INDEX idx_breeding_records_doe_id ON public.breeding_records(doe_id);
CREATE INDEX idx_breeding_records_status ON public.breeding_records(status);

-- ============================================================
-- 10. KIDDING RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kidding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doe_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  breeding_record_id UUID REFERENCES public.breeding_records(id) ON DELETE SET NULL,
  kidding_date DATE NOT NULL,
  number_born INTEGER,
  number_alive INTEGER,
  number_does INTEGER,
  number_bucks INTEGER,
  difficulty TEXT CHECK (difficulty IN ('easy', 'moderate', 'difficult', 'veterinary')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.kidding_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own kidding_records"
  ON public.kidding_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own kidding_records"
  ON public.kidding_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own kidding_records"
  ON public.kidding_records FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own kidding_records"
  ON public.kidding_records FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 11. MILK RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.milk_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  session TEXT NOT NULL CHECK (session IN ('AM', 'PM', 'once_daily')),
  amount NUMERIC NOT NULL,
  amount_unit TEXT DEFAULT 'lbs' CHECK (amount_unit IN ('lbs', 'kg', 'liters', 'gallons', 'quarts')),
  fat_percent NUMERIC,
  protein_percent NUMERIC,
  somatic_cell_count INTEGER,
  discarded BOOLEAN DEFAULT FALSE,
  discard_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.milk_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own milk_records"
  ON public.milk_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own milk_records"
  ON public.milk_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own milk_records"
  ON public.milk_records FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own milk_records"
  ON public.milk_records FOR DELETE USING (user_id = auth.uid());

CREATE INDEX idx_milk_records_animal_id ON public.milk_records(animal_id);
CREATE INDEX idx_milk_records_date ON public.milk_records(date);

-- ============================================================
-- 12. WEIGHT RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weight_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight NUMERIC NOT NULL,
  weight_unit TEXT DEFAULT 'lbs',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.weight_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weight_records"
  ON public.weight_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own weight_records"
  ON public.weight_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own weight_records"
  ON public.weight_records FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own weight_records"
  ON public.weight_records FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 13. TRANSACTIONS (Financial — Schedule F aligned)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  animal_id UUID REFERENCES public.animals(id) ON DELETE SET NULL,
  vendor_id TEXT,
  payment_method TEXT,
  receipt_url TEXT,
  tax_deductible BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own transactions"
  ON public.transactions FOR DELETE USING (user_id = auth.uid());

CREATE INDEX idx_transactions_date ON public.transactions(date);
CREATE INDEX idx_transactions_type ON public.transactions(type);

-- ============================================================
-- 14. FEED TYPES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feed_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  cost_per_unit NUMERIC,
  supplier TEXT,
  reorder_point NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feed_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feed_types"
  ON public.feed_types FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own feed_types"
  ON public.feed_types FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own feed_types"
  ON public.feed_types FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own feed_types"
  ON public.feed_types FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 15. FEED INVENTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feed_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feed_type_id UUID NOT NULL REFERENCES public.feed_types(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  purchase_date DATE,
  expiration_date DATE,
  lot_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feed_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feed_inventory"
  ON public.feed_inventory FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own feed_inventory"
  ON public.feed_inventory FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own feed_inventory"
  ON public.feed_inventory FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own feed_inventory"
  ON public.feed_inventory FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 16. FEED SCHEDULES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feed_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  herd_id UUID NOT NULL REFERENCES public.herds(id) ON DELETE CASCADE,
  feed_type TEXT NOT NULL,
  quantity_per_feeding NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  feeding_times JSONB DEFAULT '[]'::JSONB,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feed_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feed_schedules"
  ON public.feed_schedules FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own feed_schedules"
  ON public.feed_schedules FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own feed_schedules"
  ON public.feed_schedules FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own feed_schedules"
  ON public.feed_schedules FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 17. BREEDING PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.breeding_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  doe_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  buck_id UUID REFERENCES public.animals(id) ON DELETE SET NULL,
  planned_breeding_date DATE,
  gestation_days INTEGER DEFAULT 150,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.breeding_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own breeding_plans"
  ON public.breeding_plans FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own breeding_plans"
  ON public.breeding_plans FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own breeding_plans"
  ON public.breeding_plans FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own breeding_plans"
  ON public.breeding_plans FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 18. GUARDIANS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'lgd',
  breed TEXT,
  sex TEXT DEFAULT 'male',
  birth_date DATE,
  acquired_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'retired', 'deceased', 'sold')),
  training_status TEXT DEFAULT 'in_training' CHECK (training_status IN (
    'in_training', 'fully_trained', 'needs_supervision', 'not_recommended'
  )),
  herd_id UUID REFERENCES public.herds(id) ON DELETE SET NULL,
  weight NUMERIC,
  effectiveness_rating INTEGER CHECK (effectiveness_rating BETWEEN 1 AND 5),
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own guardians"
  ON public.guardians FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own guardians"
  ON public.guardians FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own guardians"
  ON public.guardians FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own guardians"
  ON public.guardians FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 19. GUARDIAN HEALTH RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.guardian_health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'vaccination',
  date DATE NOT NULL,
  description TEXT,
  medication TEXT,
  dosage TEXT,
  vet_name TEXT,
  follow_up_date DATE,
  cost NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.guardian_health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own guardian_health_records"
  ON public.guardian_health_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own guardian_health_records"
  ON public.guardian_health_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own guardian_health_records"
  ON public.guardian_health_records FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own guardian_health_records"
  ON public.guardian_health_records FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 20. GUARDIAN VACCINATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.guardian_vaccinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  date_given DATE NOT NULL,
  next_due_date DATE,
  administered_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.guardian_vaccinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own guardian_vaccinations"
  ON public.guardian_vaccinations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own guardian_vaccinations"
  ON public.guardian_vaccinations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own guardian_vaccinations"
  ON public.guardian_vaccinations FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 21. PREDATION EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.predation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  predator_type TEXT,
  outcome TEXT DEFAULT 'deterred' CHECK (outcome IN ('deterred', 'partial', 'kill')),
  location TEXT,
  description TEXT,
  animals_lost INTEGER DEFAULT 0,
  animals_injured INTEGER DEFAULT 0,
  guardian_id UUID REFERENCES public.guardians(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.predation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own predation_events"
  ON public.predation_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own predation_events"
  ON public.predation_events FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own predation_events"
  ON public.predation_events FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own predation_events"
  ON public.predation_events FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 22. PHOTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  animal_id UUID REFERENCES public.animals(id) ON DELETE CASCADE,
  health_record_id UUID REFERENCES public.health_records(id) ON DELETE SET NULL,
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE SET NULL,
  category TEXT DEFAULT 'general',
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  date_taken DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own photos"
  ON public.photos FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own photos"
  ON public.photos FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own photos"
  ON public.photos FOR DELETE USING (user_id = auth.uid());

CREATE INDEX idx_photos_animal_id ON public.photos(animal_id);

-- ============================================================
-- STORAGE BUCKET (for photo uploads)
-- ============================================================
-- Note: Storage buckets are typically created via the Supabase Dashboard.
-- If you need to create programmatically:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Rollback (for reference — do NOT run unless reverting)
-- ============================================================
-- DROP TABLE IF EXISTS public.photos CASCADE;
-- DROP TABLE IF EXISTS public.predation_events CASCADE;
-- DROP TABLE IF EXISTS public.guardian_vaccinations CASCADE;
-- DROP TABLE IF EXISTS public.guardian_health_records CASCADE;
-- DROP TABLE IF EXISTS public.guardians CASCADE;
-- DROP TABLE IF EXISTS public.breeding_plans CASCADE;
-- DROP TABLE IF EXISTS public.feed_schedules CASCADE;
-- DROP TABLE IF EXISTS public.feed_inventory CASCADE;
-- DROP TABLE IF EXISTS public.feed_types CASCADE;
-- DROP TABLE IF EXISTS public.transactions CASCADE;
-- DROP TABLE IF EXISTS public.weight_records CASCADE;
-- DROP TABLE IF EXISTS public.milk_records CASCADE;
-- DROP TABLE IF EXISTS public.kidding_records CASCADE;
-- DROP TABLE IF EXISTS public.breeding_records CASCADE;
-- DROP TABLE IF EXISTS public.inspections CASCADE;
-- DROP TABLE IF EXISTS public.health_records CASCADE;
-- DROP TABLE IF EXISTS public.animal_groups CASCADE;
-- DROP TABLE IF EXISTS public.groups CASCADE;
-- DROP TABLE IF EXISTS public.animals CASCADE;
-- DROP TABLE IF EXISTS public.herds CASCADE;
-- DROP TABLE IF EXISTS public.user_settings CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
