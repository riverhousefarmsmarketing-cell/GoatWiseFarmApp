/**
 * GoatWise Database Types
 *
 * Generated from supabase/migrations/001_initial_schema.sql
 * All 22 tables with Row, Insert, and Update types.
 *
 * To regenerate from live DB:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 *
 * Last manual sync: 2026-02-15
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          farm_name: string | null;
          phone: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          farm_name?: string | null;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          farm_name?: string | null;
          phone?: string | null;
          address?: string | null;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: { id: string; user_id: string; farm_name: string | null; farm_location: string | null; weight_unit: string; milk_unit: string; temperature_unit: string; created_at: string; updated_at: string; };
        Insert: { id?: string; user_id: string; farm_name?: string | null; farm_location?: string | null; weight_unit?: string; milk_unit?: string; temperature_unit?: string; created_at?: string; updated_at?: string; };
        Update: { farm_name?: string | null; farm_location?: string | null; weight_unit?: string; milk_unit?: string; temperature_unit?: string; updated_at?: string; };
      };
      herds: {
        Row: { id: string; user_id: string; name: string; location: string | null; pasture_name: string | null; description: string | null; color: string; created_at: string; updated_at: string; };
        Insert: { id?: string; user_id: string; name: string; location?: string | null; pasture_name?: string | null; description?: string | null; color?: string; created_at?: string; updated_at?: string; };
        Update: { name?: string; location?: string | null; pasture_name?: string | null; description?: string | null; color?: string; updated_at?: string; };
      };
      animals: {
        Row: { id: string; user_id: string; name: string; breed: string | null; sex: string; category: string; status: string; birth_date: string | null; purchase_date: string | null; purchase_price: number | null; registration_number: string | null; microchip_id: string | null; tag_number: string | null; color_markings: string | null; sire_id: string | null; dam_id: string | null; herd_id: string | null; photo_url: string | null; notes: string | null; created_at: string; updated_at: string; };
        Insert: { id?: string; user_id: string; name: string; breed?: string | null; sex: string; category: string; status?: string; birth_date?: string | null; purchase_date?: string | null; purchase_price?: number | null; registration_number?: string | null; microchip_id?: string | null; tag_number?: string | null; color_markings?: string | null; sire_id?: string | null; dam_id?: string | null; herd_id?: string | null; photo_url?: string | null; notes?: string | null; created_at?: string; updated_at?: string; };
        Update: { name?: string; breed?: string | null; sex?: string; category?: string; status?: string; birth_date?: string | null; purchase_date?: string | null; purchase_price?: number | null; registration_number?: string | null; microchip_id?: string | null; tag_number?: string | null; color_markings?: string | null; sire_id?: string | null; dam_id?: string | null; herd_id?: string | null; photo_url?: string | null; notes?: string | null; updated_at?: string; };
      };
      groups: {
        Row: { id: string; user_id: string; name: string; type: string; description: string | null; color: string; created_at: string; updated_at: string; };
        Insert: { id?: string; user_id: string; name: string; type?: string; description?: string | null; color?: string; created_at?: string; updated_at?: string; };
        Update: { name?: string; type?: string; description?: string | null; color?: string; updated_at?: string; };
      };
      animal_groups: {
        Row: { id: string; animal_id: string; group_id: string; user_id: string; created_at: string; };
        Insert: { id?: string; animal_id: string; group_id: string; user_id: string; created_at?: string; };
        Update: { animal_id?: string; group_id?: string; };
      };
      health_records: {
        Row: { id: string; user_id: string; animal_id: string; type: string; date: string; treatment: string | null; medication: string | null; dosage: number | null; dosage_unit: string | null; route: string | null; withdrawal_days: number | null; cost: number | null; administered_by: string | null; follow_up_date: string | null; follow_up_completed: boolean; notes: string | null; created_at: string; updated_at: string; };
        Insert: { id?: string; user_id: string; animal_id: string; type: string; date: string; treatment?: string | null; medication?: string | null; dosage?: number | null; dosage_unit?: string | null; route?: string | null; withdrawal_days?: number | null; cost?: number | null; administered_by?: string | null; follow_up_date?: string | null; follow_up_completed?: boolean; notes?: string | null; created_at?: string; updated_at?: string; };
        Update: { animal_id?: string; type?: string; date?: string; treatment?: string | null; medication?: string | null; dosage?: number | null; dosage_unit?: string | null; route?: string | null; withdrawal_days?: number | null; cost?: number | null; administered_by?: string | null; follow_up_date?: string | null; follow_up_completed?: boolean; notes?: string | null; updated_at?: string; };
      };
      inspections: {
        Row: { id: string; user_id: string; animal_id: string; date: string; famacha: number | null; body_condition_score: number | null; weight: number | null; weight_unit: string | null; temperature: number | null; temperature_unit: string | null; respiration: number | null; heart_rate: number | null; rumen_fill: string | null; appetite: string | null; attitude: string | null; coat_condition: string | null; action_required: boolean; action_taken: string | null; notes: string | null; created_at: string; updated_at: string; };
        Insert: { id?: string; user_id: string; animal_id: string; date: string; famacha?: number | null; body_condition_score?: number | null; weight?: number | null; weight_unit?: string | null; temperature?: number | null; temperature_unit?: string | null; respiration?: number | null; heart_rate?: number | null; rumen_fill?: string | null; appetite?: string | null; attitude?: string | null; coat_condition?: string | null; action_required?: boolean; action_taken?: string | null; notes?: string | null; created_at?: string; updated_at?: string; };
        Update: { animal_id?: string; date?: string; famacha?: number | null; body_condition_score?: number | null; weight?: number | null; weight_unit?: string | null; temperature?: number | null; temperature_unit?: string | null; respiration?: number | null; heart_rate?: number | null; rumen_fill?: string | null; appetite?: string | null; attitude?: string | null; coat_condition?: string | null; action_required?: boolean; action_taken?: string | null; notes?: string | null; updated_at?: string; };
      };
      breeding_records: {
        Row: { id: string; user_id: string; doe_id: string; buck_id: string | null; breeding_date: string; breeding_method: string; status: string; due_date: string | null; actual_kidding_date: string | null; gestation_length: number | null; kidding_date: string | null; number_of_kids: number | null; kidding_notes: string | null; labor_duration: string | null; assistance_required: boolean; assistance_notes: string | null; notes: string | null; created_at: string; updated_at: string; };
        Insert: { id?: string; user_id: string; doe_id: string; buck_id?: string | null; breeding_date: string; breeding_method?: string; status?: string; due_date?: string | null; actual_kidding_date?: string | null; gestation_length?: number | null; kidding_date?: string | null; number_of_kids?: number | null; kidding_notes?: string | null; labor_duration?: string | null; assistance_required?: boolean; assistance_notes?: string | null; notes?: string | null; created_at?: string; updated_at?: string; };
        Update: { doe_id?: string; buck_id?: string | null; breeding_date?: string; breeding_method?: string; status?: string; due_date?: string | null; actual_kidding_date?: string | null; gestation_length?: number | null; kidding_date?: string | null; number_of_kids?: number | null; kidding_notes?: string | null; labor_duration?: string | null; assistance_required?: boolean; assistance_notes?: string | null; notes?: string | null; updated_at?: string; };
      };
      kidding_records: {
        Row: { id: string; user_id: string; doe_id: string; breeding_record_id: string | null; kidding_date: string; number_born: number | null; number_alive: number | null; number_does: number | null; number_bucks: number | null; difficulty: string | null; notes: string | null; created_at: string; updated_at: string; };
        Insert: { id?: string; user_id: string; doe_id: string; breeding_record_id?: string | null; kidding_date: string; number_born?: number | null; number_alive?: number | null; number_does?: number | null; number_bucks?: number | null; difficulty?: string | null; notes?: string | null; created_at?: string; updated_at?: string; };
        Update: { doe_id?: string; breeding_record_id?: string | null; kidding_date?: string; number_born?: number | null; number_alive?: number | null; number_does?: number | null; number_bucks?: number | null; difficulty?: string | null; notes?: string | null; updated_at?: string; };
      };
      milk_records: {
        Row: { id: string; user_id: string; animal_id: string; date: string; session: string; amount: number; amount_unit: string; fat_percent: number | null; protein_percent: number | null; somatic_cell_count: number | null; discarded: boolean; discard_reason: string | null; notes: string | null; created_at: string; updated_at: string; };
        Insert: { id?: string; user_id: string; animal_id: string; date: string; session: string; amount: number; amount_unit?: string; fat_percent?: number | null; protein_percent?: number | null; somatic_cell_count?: number | null; discarded?: boolean; discard_reason?: string | null; notes?: string | null; created_at?: string; updated_at?: string; };
        Update: { animal_id?: string; date?: string; session?: string; amount?: number; amount_unit?: string; fat_percent?: number | null; protein_percent?: number | null; somatic_cell_count?: number | null; discarded?: boolean; discard_reason?: string | null; notes?: string | null; updated_at?: string; };
      };
      weight_records: {
        Row: { id: string; user_id: string; animal_id: string; date: string; weight: number; weight_unit: string; notes: string | null; created_at: string; };
        Insert: { id?: string; user_id: string; animal_id: string; date: string; weight: number; weight_unit?: string; notes?: string | null; created_at?: string; };
        Update: { animal_id?: string; date?: string; weight?: number; weight_unit?: string; notes?: string | null; };
      };
      transactions: {
        Row: { id: string; user_id: string; type: string; category: string; amount: number; date: string; description: string | null; animal_id: string | null; vendor_id: string | null; payment_method: string | null; receipt_url: string | null; tax_deductible: boolean; notes: string | null; created_at: string; updated_at: string; };
        Insert: { id?: string; user_id: string; type: string; category: string; amount: number; date: string; description?: string | null; animal_id?: string | null; vendor_id?: string | null; payment_method?: string | null; receipt_url?: string | null; tax_deductible?: boolean; notes?: string | null; created_at?: string; updated_at?: string; };
        Update: { type?: string; category?: string; amount?: number; date?: string; description?: string | null; animal_id?: string | null; vendor_id?: string | null; payment_method?: string | null; receipt_url?: string | null; tax_deductible?: boolean; notes?: string | null; updated_at?: string; };
      };
      feed_types: {
        Row: { id: string; user_id: string; name: string; category: string; unit: string; cost_per_unit: number | null; supplier: string | null; reorder_point: number | null; notes: string | null; created_at: string; };
        Insert: { id?: string; user_id: string; name: string; category: string; unit: string; cost_per_unit?: number | null; supplier?: string | null; reorder_point?: number | null; notes?: string | null; created_at?: string; };
        Update: { name?: string; category?: string; unit?: string; cost_per_unit?: number | null; supplier?: string | null; reorder_point?: number | null; notes?: string | null; };
      };
      feed_inventory: {
        Row: { id: string; user_id: string; feed_type_id: string; quantity: number; purchase_date: string | null; expiration_date: string | null; lot_number: string | null; notes: string | null; created_at: string; };
        Insert: { id?: string; user_id: string; feed_type_id: string; quantity?: number; purchase_date?: string | null; expiration_date?: string | null; lot_number?: string | null; notes?: string | null; created_at?: string; };
        Update: { feed_type_id?: string; quantity?: number; purchase_date?: string | null; expiration_date?: string | null; lot_number?: string | null; notes?: string | null; };
      };
      feed_schedules: {
        Row: { id: string; user_id: string; herd_id: string; feed_type: string; quantity_per_feeding: number; unit: string; feeding_times: Json; start_date: string; end_date: string | null; status: string; notes: string | null; created_at: string; updated_at: string; };
        Insert: { id?: string; user_id: string; herd_id: string; feed_type: string; quantity_per_feeding: number; unit: string; feeding_times?: Json; start_date: string; end_date?: string | null; status?: string; notes?: string | null; created_at?: string; updated_at?: string; };
        Update: { herd_id?: string; feed_type?: string; quantity_per_feeding?: number; unit?: string; feeding_times?: Json; start_date?: string; end_date?: string | null; status?: string; notes?: string | null; updated_at?: string; };
      };
      breeding_plans: {
        Row: { id: string; user_id: string; name: string | null; doe_id: string; buck_id: string | null; planned_breeding_date: string | null; gestation_days: number; notes: string | null; created_at: string; updated_at: string; };
        Insert: { id?: string; user_id: string; name?: string | null; doe_id: string; buck_id?: string | null; planned_breeding_date?: string | null; gestation_days?: number; notes?: string | null; created_at?: string; updated_at?: string; };
        Update: { name?: string | null; doe_id?: string; buck_id?: string | null; planned_breeding_date?: string | null; gestation_days?: number; notes?: string | null; updated_at?: string; };
      };
      guardians: {
        Row: { id: string; user_id: string; name: string; type: string; breed: string | null; sex: string; birth_date: string | null; acquired_date: string | null; status: string; training_status: string; herd_id: string | null; weight: number | null; effectiveness_rating: number | null; notes: string | null; photo_url: string | null; created_at: string; updated_at: string; };
        Insert: { id?: string; user_id: string; name: string; type?: string; breed?: string | null; sex?: string; birth_date?: string | null; acquired_date?: string | null; status?: string; training_status?: string; herd_id?: string | null; weight?: number | null; effectiveness_rating?: number | null; notes?: string | null; photo_url?: string | null; created_at?: string; updated_at?: string; };
        Update: { name?: string; type?: string; breed?: string | null; sex?: string; birth_date?: string | null; acquired_date?: string | null; status?: string; training_status?: string; herd_id?: string | null; weight?: number | null; effectiveness_rating?: number | null; notes?: string | null; photo_url?: string | null; updated_at?: string; };
      };
      guardian_health_records: {
        Row: { id: string; user_id: string; guardian_id: string; type: string; date: string; description: string | null; medication: string | null; dosage: string | null; vet_name: string | null; follow_up_date: string | null; cost: number | null; notes: string | null; created_at: string; };
        Insert: { id?: string; user_id: string; guardian_id: string; type?: string; date: string; description?: string | null; medication?: string | null; dosage?: string | null; vet_name?: string | null; follow_up_date?: string | null; cost?: number | null; notes?: string | null; created_at?: string; };
        Update: { guardian_id?: string; type?: string; date?: string; description?: string | null; medication?: string | null; dosage?: string | null; vet_name?: string | null; follow_up_date?: string | null; cost?: number | null; notes?: string | null; };
      };
      guardian_vaccinations: {
        Row: { id: string; user_id: string; guardian_id: string; vaccine_name: string; date_given: string; next_due_date: string | null; administered_by: string | null; notes: string | null; created_at: string; };
        Insert: { id?: string; user_id: string; guardian_id: string; vaccine_name: string; date_given: string; next_due_date?: string | null; administered_by?: string | null; notes?: string | null; created_at?: string; };
        Update: { guardian_id?: string; vaccine_name?: string; date_given?: string; next_due_date?: string | null; administered_by?: string | null; notes?: string | null; };
      };
      predation_events: {
        Row: { id: string; user_id: string; date: string; predator_type: string | null; outcome: string; location: string | null; description: string | null; animals_lost: number; animals_injured: number; guardian_id: string | null; notes: string | null; created_at: string; };
        Insert: { id?: string; user_id: string; date: string; predator_type?: string | null; outcome?: string; location?: string | null; description?: string | null; animals_lost?: number; animals_injured?: number; guardian_id?: string | null; notes?: string | null; created_at?: string; };
        Update: { date?: string; predator_type?: string | null; outcome?: string; location?: string | null; description?: string | null; animals_lost?: number; animals_injured?: number; guardian_id?: string | null; notes?: string | null; };
      };
      photos: {
        Row: { id: string; user_id: string; animal_id: string | null; health_record_id: string | null; inspection_id: string | null; category: string; filename: string; url: string; caption: string | null; date_taken: string; created_at: string; };
        Insert: { id?: string; user_id: string; animal_id?: string | null; health_record_id?: string | null; inspection_id?: string | null; category?: string; filename: string; url: string; caption?: string | null; date_taken?: string; created_at?: string; };
        Update: { animal_id?: string | null; health_record_id?: string | null; inspection_id?: string | null; category?: string; filename?: string; url?: string; caption?: string | null; date_taken?: string; };
      };
    };
    Views: { [_ in never]: never; };
    Functions: { [_ in never]: never; };
    Enums: { [_ in never]: never; };
  };
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type UserSettings = Database['public']['Tables']['user_settings']['Row'];
export type UserSettingsInsert = Database['public']['Tables']['user_settings']['Insert'];
export type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update'];
export type Herd = Database['public']['Tables']['herds']['Row'];
export type HerdInsert = Database['public']['Tables']['herds']['Insert'];
export type HerdUpdate = Database['public']['Tables']['herds']['Update'];
export type Animal = Database['public']['Tables']['animals']['Row'];
export type AnimalInsert = Database['public']['Tables']['animals']['Insert'];
export type AnimalUpdate = Database['public']['Tables']['animals']['Update'];
export type Group = Database['public']['Tables']['groups']['Row'];
export type GroupInsert = Database['public']['Tables']['groups']['Insert'];
export type GroupUpdate = Database['public']['Tables']['groups']['Update'];
export type AnimalGroup = Database['public']['Tables']['animal_groups']['Row'];
export type AnimalGroupInsert = Database['public']['Tables']['animal_groups']['Insert'];
export type HealthRecord = Database['public']['Tables']['health_records']['Row'];
export type HealthRecordInsert = Database['public']['Tables']['health_records']['Insert'];
export type HealthRecordUpdate = Database['public']['Tables']['health_records']['Update'];
export type Inspection = Database['public']['Tables']['inspections']['Row'];
export type InspectionInsert = Database['public']['Tables']['inspections']['Insert'];
export type InspectionUpdate = Database['public']['Tables']['inspections']['Update'];
export type BreedingRecord = Database['public']['Tables']['breeding_records']['Row'];
export type BreedingRecordInsert = Database['public']['Tables']['breeding_records']['Insert'];
export type BreedingRecordUpdate = Database['public']['Tables']['breeding_records']['Update'];
export type KiddingRecord = Database['public']['Tables']['kidding_records']['Row'];
export type KiddingRecordInsert = Database['public']['Tables']['kidding_records']['Insert'];
export type KiddingRecordUpdate = Database['public']['Tables']['kidding_records']['Update'];
export type MilkRecord = Database['public']['Tables']['milk_records']['Row'];
export type MilkRecordInsert = Database['public']['Tables']['milk_records']['Insert'];
export type MilkRecordUpdate = Database['public']['Tables']['milk_records']['Update'];
export type WeightRecord = Database['public']['Tables']['weight_records']['Row'];
export type WeightRecordInsert = Database['public']['Tables']['weight_records']['Insert'];
export type WeightRecordUpdate = Database['public']['Tables']['weight_records']['Update'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update'];
export type FeedType = Database['public']['Tables']['feed_types']['Row'];
export type FeedTypeInsert = Database['public']['Tables']['feed_types']['Insert'];
export type FeedTypeUpdate = Database['public']['Tables']['feed_types']['Update'];
export type FeedInventoryRecord = Database['public']['Tables']['feed_inventory']['Row'];
export type FeedInventoryInsert = Database['public']['Tables']['feed_inventory']['Insert'];
export type FeedInventoryUpdate = Database['public']['Tables']['feed_inventory']['Update'];
export type FeedSchedule = Database['public']['Tables']['feed_schedules']['Row'];
export type FeedScheduleInsert = Database['public']['Tables']['feed_schedules']['Insert'];
export type FeedScheduleUpdate = Database['public']['Tables']['feed_schedules']['Update'];
export type BreedingPlan = Database['public']['Tables']['breeding_plans']['Row'];
export type BreedingPlanInsert = Database['public']['Tables']['breeding_plans']['Insert'];
export type BreedingPlanUpdate = Database['public']['Tables']['breeding_plans']['Update'];
export type Guardian = Database['public']['Tables']['guardians']['Row'];
export type GuardianInsert = Database['public']['Tables']['guardians']['Insert'];
export type GuardianUpdate = Database['public']['Tables']['guardians']['Update'];
export type GuardianHealthRecord = Database['public']['Tables']['guardian_health_records']['Row'];
export type GuardianHealthRecordInsert = Database['public']['Tables']['guardian_health_records']['Insert'];
export type GuardianHealthRecordUpdate = Database['public']['Tables']['guardian_health_records']['Update'];
export type GuardianVaccination = Database['public']['Tables']['guardian_vaccinations']['Row'];
export type GuardianVaccinationInsert = Database['public']['Tables']['guardian_vaccinations']['Insert'];
export type GuardianVaccinationUpdate = Database['public']['Tables']['guardian_vaccinations']['Update'];
export type PredationEvent = Database['public']['Tables']['predation_events']['Row'];
export type PredationEventInsert = Database['public']['Tables']['predation_events']['Insert'];
export type PredationEventUpdate = Database['public']['Tables']['predation_events']['Update'];
export type Photo = Database['public']['Tables']['photos']['Row'];
export type PhotoInsert = Database['public']['Tables']['photos']['Insert'];
export type PhotoUpdate = Database['public']['Tables']['photos']['Update'];
