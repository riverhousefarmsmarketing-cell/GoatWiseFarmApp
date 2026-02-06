/**
 * Database Types
 * 
 * TypeScript definitions for Supabase tables.
 * These match the mobile app's Supabase schema.
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
      animals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          breed: string | null;
          sex: 'doe' | 'buck' | 'wether';
          category: 'milking_doe' | 'dry_doe' | 'bred_doe' | 'doeling' | 'buck' | 'buckling' | 'wether' | 'kid';
          status: 'active' | 'sold' | 'deceased' | 'culled';
          birth_date: string | null;
          purchase_date: string | null;
          purchase_price: number | null;
          registration_number: string | null;
          microchip_id: string | null;
          tag_number: string | null;
          color_markings: string | null;
          sire_id: string | null;
          dam_id: string | null;
          herd_id: string | null;
          photo_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          breed?: string | null;
          sex: 'doe' | 'buck' | 'wether';
          category: 'milking_doe' | 'dry_doe' | 'bred_doe' | 'doeling' | 'buck' | 'buckling' | 'wether' | 'kid';
          status?: 'active' | 'sold' | 'deceased' | 'culled';
          birth_date?: string | null;
          purchase_date?: string | null;
          purchase_price?: number | null;
          registration_number?: string | null;
          microchip_id?: string | null;
          tag_number?: string | null;
          color_markings?: string | null;
          sire_id?: string | null;
          dam_id?: string | null;
          herd_id?: string | null;
          photo_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          breed?: string | null;
          sex?: 'doe' | 'buck' | 'wether';
          category?: 'milking_doe' | 'dry_doe' | 'bred_doe' | 'doeling' | 'buck' | 'buckling' | 'wether' | 'kid';
          status?: 'active' | 'sold' | 'deceased' | 'culled';
          birth_date?: string | null;
          purchase_date?: string | null;
          purchase_price?: number | null;
          registration_number?: string | null;
          microchip_id?: string | null;
          tag_number?: string | null;
          color_markings?: string | null;
          sire_id?: string | null;
          dam_id?: string | null;
          herd_id?: string | null;
          photo_url?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      health_records: {
        Row: {
          id: string;
          user_id: string;
          animal_id: string;
          type: 'vaccination' | 'deworming' | 'treatment' | 'vet_visit' | 'hoof_trim' | 'injury' | 'illness' | 'other';
          date: string;
          treatment: string | null;
          medication: string | null;
          dosage: number | null;
          dosage_unit: string | null;
          route: string | null;
          withdrawal_days: number | null;
          cost: number | null;
          administered_by: string | null;
          follow_up_date: string | null;
          follow_up_completed: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          animal_id: string;
          type: 'vaccination' | 'deworming' | 'treatment' | 'vet_visit' | 'hoof_trim' | 'injury' | 'illness' | 'other';
          date: string;
          treatment?: string | null;
          medication?: string | null;
          dosage?: number | null;
          dosage_unit?: string | null;
          route?: string | null;
          withdrawal_days?: number | null;
          cost?: number | null;
          administered_by?: string | null;
          follow_up_date?: string | null;
          follow_up_completed?: boolean;
          notes?: string | null;
        };
        Update: {
          type?: 'vaccination' | 'deworming' | 'treatment' | 'vet_visit' | 'hoof_trim' | 'injury' | 'illness' | 'other';
          date?: string;
          treatment?: string | null;
          medication?: string | null;
          dosage?: number | null;
          dosage_unit?: string | null;
          route?: string | null;
          withdrawal_days?: number | null;
          cost?: number | null;
          administered_by?: string | null;
          follow_up_date?: string | null;
          follow_up_completed?: boolean;
          notes?: string | null;
          updated_at?: string;
        };
      };
      inspections: {
        Row: {
          id: string;
          user_id: string;
          animal_id: string;
          date: string;
          famacha: number | null;
          body_condition_score: number | null;
          weight: number | null;
          weight_unit: string | null;
          temperature: number | null;
          temperature_unit: string | null;
          respiration: number | null;
          heart_rate: number | null;
          rumen_fill: string | null;
          appetite: string | null;
          attitude: string | null;
          coat_condition: string | null;
          action_required: boolean;
          action_taken: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          animal_id: string;
          date: string;
          famacha?: number | null;
          body_condition_score?: number | null;
          weight?: number | null;
          weight_unit?: string | null;
          temperature?: number | null;
          temperature_unit?: string | null;
          respiration?: number | null;
          heart_rate?: number | null;
          rumen_fill?: string | null;
          appetite?: string | null;
          attitude?: string | null;
          coat_condition?: string | null;
          action_required?: boolean;
          action_taken?: string | null;
          notes?: string | null;
        };
        Update: {
          date?: string;
          famacha?: number | null;
          body_condition_score?: number | null;
          weight?: number | null;
          weight_unit?: string | null;
          temperature?: number | null;
          temperature_unit?: string | null;
          respiration?: number | null;
          heart_rate?: number | null;
          rumen_fill?: string | null;
          appetite?: string | null;
          attitude?: string | null;
          coat_condition?: string | null;
          action_required?: boolean;
          action_taken?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      breeding_records: {
        Row: {
          id: string;
          user_id: string;
          doe_id: string;
          buck_id: string | null;
          breeding_date: string;
          breeding_method: 'natural' | 'ai' | 'lap_ai';
          status: 'bred' | 'confirmed_pregnant' | 'open' | 'kidded' | 'aborted';
          due_date: string | null;
          actual_kidding_date: string | null;
          gestation_length: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          doe_id: string;
          buck_id?: string | null;
          breeding_date: string;
          breeding_method?: 'natural' | 'ai' | 'lap_ai';
          status?: 'bred' | 'confirmed_pregnant' | 'open' | 'kidded' | 'aborted';
          due_date?: string | null;
          actual_kidding_date?: string | null;
          gestation_length?: number | null;
          notes?: string | null;
        };
        Update: {
          doe_id?: string;
          buck_id?: string | null;
          breeding_date?: string;
          breeding_method?: 'natural' | 'ai' | 'lap_ai';
          status?: 'bred' | 'confirmed_pregnant' | 'open' | 'kidded' | 'aborted';
          due_date?: string | null;
          actual_kidding_date?: string | null;
          gestation_length?: number | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      milk_records: {
        Row: {
          id: string;
          user_id: string;
          animal_id: string;
          date: string;
          session: 'AM' | 'PM' | 'once_daily';
          amount: number;
          amount_unit: 'lbs' | 'kg' | 'liters' | 'gallons' | 'quarts';
          fat_percent: number | null;
          protein_percent: number | null;
          somatic_cell_count: number | null;
          discarded: boolean;
          discard_reason: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          animal_id: string;
          date: string;
          session: 'AM' | 'PM' | 'once_daily';
          amount: number;
          amount_unit?: 'lbs' | 'kg' | 'liters' | 'gallons' | 'quarts';
          fat_percent?: number | null;
          protein_percent?: number | null;
          somatic_cell_count?: number | null;
          discarded?: boolean;
          discard_reason?: string | null;
          notes?: string | null;
        };
        Update: {
          date?: string;
          session?: 'AM' | 'PM' | 'once_daily';
          amount?: number;
          amount_unit?: 'lbs' | 'kg' | 'liters' | 'gallons' | 'quarts';
          fat_percent?: number | null;
          protein_percent?: number | null;
          somatic_cell_count?: number | null;
          discarded?: boolean;
          discard_reason?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: 'income' | 'expense';
          category: string;
          amount: number;
          date: string;
          description: string | null;
          animal_id: string | null;
          vendor_id: string | null;
          payment_method: string | null;
          receipt_url: string | null;
          tax_deductible: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'income' | 'expense';
          category: string;
          amount: number;
          date: string;
          description?: string | null;
          animal_id?: string | null;
          vendor_id?: string | null;
          payment_method?: string | null;
          receipt_url?: string | null;
          tax_deductible?: boolean;
          notes?: string | null;
        };
        Update: {
          type?: 'income' | 'expense';
          category?: string;
          amount?: number;
          date?: string;
          description?: string | null;
          animal_id?: string | null;
          vendor_id?: string | null;
          payment_method?: string | null;
          receipt_url?: string | null;
          tax_deductible?: boolean;
          notes?: string | null;
          updated_at?: string;
        };
      };
      herds: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          location: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          location?: string | null;
          description?: string | null;
        };
        Update: {
          name?: string;
          location?: string | null;
          description?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}

// Convenience types
export type Animal = Database['public']['Tables']['animals']['Row'];
export type AnimalInsert = Database['public']['Tables']['animals']['Insert'];
export type AnimalUpdate = Database['public']['Tables']['animals']['Update'];

export type HealthRecord = Database['public']['Tables']['health_records']['Row'];
export type HealthRecordInsert = Database['public']['Tables']['health_records']['Insert'];

export type Inspection = Database['public']['Tables']['inspections']['Row'];
export type InspectionInsert = Database['public']['Tables']['inspections']['Insert'];

export type BreedingRecord = Database['public']['Tables']['breeding_records']['Row'];
export type BreedingRecordInsert = Database['public']['Tables']['breeding_records']['Insert'];

export type MilkRecord = Database['public']['Tables']['milk_records']['Row'];
export type MilkRecordInsert = Database['public']['Tables']['milk_records']['Insert'];

export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];

export type Herd = Database['public']['Tables']['herds']['Row'];
export type HerdInsert = Database['public']['Tables']['herds']['Insert'];

export type Profile = Database['public']['Tables']['profiles']['Row'];
