// Supabase database types.
//
// GENERATED from the live schema via `supabase gen types` (MCP
// generate_typescript_types). Do NOT hand-edit the generated block below; to
// refresh it, regenerate and replace. The convenience aliases at the bottom are
// maintained by hand and may be extended.
//
// Replacing the former hand-written types lets the typed Supabase client infer
// real Insert/Update payloads, so the old `any` mutation escape hatch is gone.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      animal_groups: {
        Row: {
          animal_id: string
          created_at: string | null
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          animal_id: string
          created_at?: string | null
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          animal_id?: string
          created_at?: string | null
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "animal_groups_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          born_on_farm: boolean | null
          breed: string | null
          castration_date: string | null
          category: string
          color: string | null
          color_markings: string | null
          created_at: string | null
          dam_id: string | null
          date_of_birth: string | null
          disbudded: boolean | null
          disbudded_date: string | null
          genetic_traits: Json | null
          group_ids: string[] | null
          health_status: string | null
          herd_id: string | null
          id: string
          is_reference: boolean
          markings: string | null
          microchip_id: string | null
          name: string
          notes: string | null
          pedigree_generations: number | null
          pedigreed: boolean | null
          photo_url: string | null
          polled: boolean | null
          purchase_cost: number | null
          purchase_date: string | null
          purchase_source: string | null
          registration_number: string | null
          registry_name: string | null
          registry_number: string | null
          secondary_breed: string | null
          sex: string
          sire_id: string | null
          species: string
          status: string
          tag_number: string | null
          tattoo: string | null
          updated_at: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          born_on_farm?: boolean | null
          breed?: string | null
          castration_date?: string | null
          category: string
          color?: string | null
          color_markings?: string | null
          created_at?: string | null
          dam_id?: string | null
          date_of_birth?: string | null
          disbudded?: boolean | null
          disbudded_date?: string | null
          genetic_traits?: Json | null
          group_ids?: string[] | null
          health_status?: string | null
          herd_id?: string | null
          id?: string
          is_reference?: boolean
          markings?: string | null
          microchip_id?: string | null
          name: string
          notes?: string | null
          pedigree_generations?: number | null
          pedigreed?: boolean | null
          photo_url?: string | null
          polled?: boolean | null
          purchase_cost?: number | null
          purchase_date?: string | null
          purchase_source?: string | null
          registration_number?: string | null
          registry_name?: string | null
          registry_number?: string | null
          secondary_breed?: string | null
          sex: string
          sire_id?: string | null
          species?: string
          status?: string
          tag_number?: string | null
          tattoo?: string | null
          updated_at?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          born_on_farm?: boolean | null
          breed?: string | null
          castration_date?: string | null
          category?: string
          color?: string | null
          color_markings?: string | null
          created_at?: string | null
          dam_id?: string | null
          date_of_birth?: string | null
          disbudded?: boolean | null
          disbudded_date?: string | null
          genetic_traits?: Json | null
          group_ids?: string[] | null
          health_status?: string | null
          herd_id?: string | null
          id?: string
          is_reference?: boolean
          markings?: string | null
          microchip_id?: string | null
          name?: string
          notes?: string | null
          pedigree_generations?: number | null
          pedigreed?: boolean | null
          photo_url?: string | null
          polled?: boolean | null
          purchase_cost?: number | null
          purchase_date?: string | null
          purchase_source?: string | null
          registration_number?: string | null
          registry_name?: string | null
          registry_number?: string | null
          secondary_breed?: string | null
          sex?: string
          sire_id?: string | null
          species?: string
          status?: string
          tag_number?: string | null
          tattoo?: string | null
          updated_at?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "animals_dam_id_fkey"
            columns: ["dam_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_herd_id_fkey"
            columns: ["herd_id"]
            isOneToOne: false
            referencedRelation: "herds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_sire_id_fkey"
            columns: ["sire_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      breeding_plans: {
        Row: {
          buck_id: string | null
          created_at: string | null
          doe_id: string
          gestation_days: number | null
          id: string
          name: string | null
          notes: string | null
          planned_breeding_date: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          buck_id?: string | null
          created_at?: string | null
          doe_id: string
          gestation_days?: number | null
          id?: string
          name?: string | null
          notes?: string | null
          planned_breeding_date?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          buck_id?: string | null
          created_at?: string | null
          doe_id?: string
          gestation_days?: number | null
          id?: string
          name?: string | null
          notes?: string | null
          planned_breeding_date?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breeding_plans_buck_id_fkey"
            columns: ["buck_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_plans_doe_id_fkey"
            columns: ["doe_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      breeding_records: {
        Row: {
          actual_kidding_date: string | null
          assistance_notes: string | null
          assistance_required: boolean | null
          breeding_date: string
          breeding_method: string | null
          buck_id: string | null
          created_at: string | null
          doe_id: string
          due_date: string | null
          gestation_length: number | null
          id: string
          kidding_date: string | null
          kidding_notes: string | null
          labor_duration: string | null
          notes: string | null
          number_of_kids: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_kidding_date?: string | null
          assistance_notes?: string | null
          assistance_required?: boolean | null
          breeding_date: string
          breeding_method?: string | null
          buck_id?: string | null
          created_at?: string | null
          doe_id: string
          due_date?: string | null
          gestation_length?: number | null
          id?: string
          kidding_date?: string | null
          kidding_notes?: string | null
          labor_duration?: string | null
          notes?: string | null
          number_of_kids?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_kidding_date?: string | null
          assistance_notes?: string | null
          assistance_required?: boolean | null
          breeding_date?: string
          breeding_method?: string | null
          buck_id?: string | null
          created_at?: string | null
          doe_id?: string
          due_date?: string | null
          gestation_length?: number | null
          id?: string
          kidding_date?: string | null
          kidding_notes?: string | null
          labor_duration?: string | null
          notes?: string | null
          number_of_kids?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breeding_records_buck_id_fkey"
            columns: ["buck_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_records_doe_id_fkey"
            columns: ["doe_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_inventory: {
        Row: {
          created_at: string | null
          expiration_date: string | null
          feed_type_id: string
          id: string
          lot_number: string | null
          notes: string | null
          purchase_date: string | null
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expiration_date?: string | null
          feed_type_id: string
          id?: string
          lot_number?: string | null
          notes?: string | null
          purchase_date?: string | null
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          expiration_date?: string | null
          feed_type_id?: string
          id?: string
          lot_number?: string | null
          notes?: string | null
          purchase_date?: string | null
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_inventory_feed_type_id_fkey"
            columns: ["feed_type_id"]
            isOneToOne: false
            referencedRelation: "feed_types"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_schedules: {
        Row: {
          created_at: string | null
          end_date: string | null
          feed_type: string
          feeding_times: Json | null
          herd_id: string
          id: string
          notes: string | null
          quantity_per_feeding: number
          start_date: string
          status: string | null
          unit: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          feed_type: string
          feeding_times?: Json | null
          herd_id: string
          id?: string
          notes?: string | null
          quantity_per_feeding: number
          start_date: string
          status?: string | null
          unit: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          feed_type?: string
          feeding_times?: Json | null
          herd_id?: string
          id?: string
          notes?: string | null
          quantity_per_feeding?: number
          start_date?: string
          status?: string | null
          unit?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_schedules_herd_id_fkey"
            columns: ["herd_id"]
            isOneToOne: false
            referencedRelation: "herds"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_types: {
        Row: {
          category: string
          cost_per_unit: number | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          reorder_point: number | null
          supplier: string | null
          unit: string
          user_id: string
        }
        Insert: {
          category: string
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          reorder_point?: number | null
          supplier?: string | null
          unit: string
          user_id: string
        }
        Update: {
          category?: string
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          reorder_point?: number | null
          supplier?: string | null
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_usage: {
        Row: {
          created_at: string | null
          date: string
          feed_type_id: string
          herd_id: string
          id: string
          notes: string | null
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          feed_type_id: string
          herd_id: string
          id?: string
          notes?: string | null
          quantity: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          feed_type_id?: string
          herd_id?: string
          id?: string
          notes?: string | null
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_usage_feed_type_id_fkey"
            columns: ["feed_type_id"]
            isOneToOne: false
            referencedRelation: "feed_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_usage_herd_id_fkey"
            columns: ["herd_id"]
            isOneToOne: false
            referencedRelation: "herds"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          page_url: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          page_url?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          page_url?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      guardian_health_records: {
        Row: {
          cost: number | null
          created_at: string | null
          date: string
          description: string | null
          dosage: string | null
          follow_up_date: string | null
          guardian_id: string
          id: string
          medication: string | null
          notes: string | null
          type: string
          user_id: string
          vet_name: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          date: string
          description?: string | null
          dosage?: string | null
          follow_up_date?: string | null
          guardian_id: string
          id?: string
          medication?: string | null
          notes?: string | null
          type?: string
          user_id: string
          vet_name?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          date?: string
          description?: string | null
          dosage?: string | null
          follow_up_date?: string | null
          guardian_id?: string
          id?: string
          medication?: string | null
          notes?: string | null
          type?: string
          user_id?: string
          vet_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_health_records_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_vaccinations: {
        Row: {
          administered_by: string | null
          created_at: string | null
          date_given: string
          guardian_id: string
          id: string
          next_due_date: string | null
          notes: string | null
          user_id: string
          vaccine_name: string
        }
        Insert: {
          administered_by?: string | null
          created_at?: string | null
          date_given: string
          guardian_id: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          user_id: string
          vaccine_name: string
        }
        Update: {
          administered_by?: string | null
          created_at?: string | null
          date_given?: string
          guardian_id?: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          user_id?: string
          vaccine_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_vaccinations_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          acquired_date: string | null
          birth_date: string | null
          breed: string | null
          created_at: string | null
          effectiveness_rating: number | null
          herd_id: string | null
          id: string
          name: string
          notes: string | null
          photo_url: string | null
          sex: string | null
          status: string | null
          training_status: string | null
          type: string
          updated_at: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          acquired_date?: string | null
          birth_date?: string | null
          breed?: string | null
          created_at?: string | null
          effectiveness_rating?: number | null
          herd_id?: string | null
          id?: string
          name: string
          notes?: string | null
          photo_url?: string | null
          sex?: string | null
          status?: string | null
          training_status?: string | null
          type?: string
          updated_at?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          acquired_date?: string | null
          birth_date?: string | null
          breed?: string | null
          created_at?: string | null
          effectiveness_rating?: number | null
          herd_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          photo_url?: string | null
          sex?: string | null
          status?: string | null
          training_status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "guardians_herd_id_fkey"
            columns: ["herd_id"]
            isOneToOne: false
            referencedRelation: "herds"
            referencedColumns: ["id"]
          },
        ]
      }
      health_records: {
        Row: {
          administered_by: string | null
          animal_id: string
          cost: number | null
          created_at: string | null
          date: string
          dosage: number | null
          dosage_unit: string | null
          follow_up_completed: boolean | null
          follow_up_date: string | null
          id: string
          medication: string | null
          notes: string | null
          route: string | null
          treatment: string | null
          type: string
          updated_at: string | null
          user_id: string
          withdrawal_days: number | null
        }
        Insert: {
          administered_by?: string | null
          animal_id: string
          cost?: number | null
          created_at?: string | null
          date: string
          dosage?: number | null
          dosage_unit?: string | null
          follow_up_completed?: boolean | null
          follow_up_date?: string | null
          id?: string
          medication?: string | null
          notes?: string | null
          route?: string | null
          treatment?: string | null
          type: string
          updated_at?: string | null
          user_id: string
          withdrawal_days?: number | null
        }
        Update: {
          administered_by?: string | null
          animal_id?: string
          cost?: number | null
          created_at?: string | null
          date?: string
          dosage?: number | null
          dosage_unit?: string | null
          follow_up_completed?: boolean | null
          follow_up_date?: string | null
          id?: string
          medication?: string | null
          notes?: string | null
          route?: string | null
          treatment?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
          withdrawal_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      herd_transfers: {
        Row: {
          animal_id: string
          completed_date: string | null
          created_at: string | null
          from_herd_id: string | null
          id: string
          reason: string | null
          requested_date: string | null
          status: string | null
          to_herd_id: string
          user_id: string
        }
        Insert: {
          animal_id: string
          completed_date?: string | null
          created_at?: string | null
          from_herd_id?: string | null
          id?: string
          reason?: string | null
          requested_date?: string | null
          status?: string | null
          to_herd_id: string
          user_id: string
        }
        Update: {
          animal_id?: string
          completed_date?: string | null
          created_at?: string | null
          from_herd_id?: string | null
          id?: string
          reason?: string | null
          requested_date?: string | null
          status?: string | null
          to_herd_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "herd_transfers_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "herd_transfers_from_herd_id_fkey"
            columns: ["from_herd_id"]
            isOneToOne: false
            referencedRelation: "herds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "herd_transfers_to_herd_id_fkey"
            columns: ["to_herd_id"]
            isOneToOne: false
            referencedRelation: "herds"
            referencedColumns: ["id"]
          },
        ]
      }
      herds: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          name: string
          pasture_name: string | null
          species: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name: string
          pasture_name?: string | null
          species?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          pasture_name?: string | null
          species?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      inspections: {
        Row: {
          action_required: boolean | null
          action_taken: string | null
          animal_id: string
          appetite: string | null
          attitude: string | null
          body_condition_score: number | null
          coat_condition: string | null
          created_at: string | null
          date: string
          famacha: number | null
          heart_rate: number | null
          id: string
          notes: string | null
          respiration: number | null
          rumen_fill: string | null
          temperature: number | null
          temperature_unit: string | null
          updated_at: string | null
          user_id: string
          weight: number | null
          weight_unit: string | null
        }
        Insert: {
          action_required?: boolean | null
          action_taken?: string | null
          animal_id: string
          appetite?: string | null
          attitude?: string | null
          body_condition_score?: number | null
          coat_condition?: string | null
          created_at?: string | null
          date: string
          famacha?: number | null
          heart_rate?: number | null
          id?: string
          notes?: string | null
          respiration?: number | null
          rumen_fill?: string | null
          temperature?: number | null
          temperature_unit?: string | null
          updated_at?: string | null
          user_id: string
          weight?: number | null
          weight_unit?: string | null
        }
        Update: {
          action_required?: boolean | null
          action_taken?: string | null
          animal_id?: string
          appetite?: string | null
          attitude?: string | null
          body_condition_score?: number | null
          coat_condition?: string | null
          created_at?: string | null
          date?: string
          famacha?: number | null
          heart_rate?: number | null
          id?: string
          notes?: string | null
          respiration?: number | null
          rumen_fill?: string | null
          temperature?: number | null
          temperature_unit?: string | null
          updated_at?: string | null
          user_id?: string
          weight?: number | null
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      kid_records: {
        Row: {
          animal_id: string | null
          birth_order: number | null
          birth_weight: number | null
          birth_weight_unit: string
          breeding_record_id: string
          colostrum_time: string | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          presentation: string | null
          retained: boolean
          sex: string
          updated_at: string | null
          user_id: string
          vigor_score: number | null
        }
        Insert: {
          animal_id?: string | null
          birth_order?: number | null
          birth_weight?: number | null
          birth_weight_unit?: string
          breeding_record_id: string
          colostrum_time?: string | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          presentation?: string | null
          retained?: boolean
          sex: string
          updated_at?: string | null
          user_id: string
          vigor_score?: number | null
        }
        Update: {
          animal_id?: string | null
          birth_order?: number | null
          birth_weight?: number | null
          birth_weight_unit?: string
          breeding_record_id?: string
          colostrum_time?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          presentation?: string | null
          retained?: boolean
          sex?: string
          updated_at?: string | null
          user_id?: string
          vigor_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kid_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kid_records_breeding_record_id_fkey"
            columns: ["breeding_record_id"]
            isOneToOne: false
            referencedRelation: "breeding_records"
            referencedColumns: ["id"]
          },
        ]
      }
      kidding_records: {
        Row: {
          breeding_record_id: string | null
          created_at: string | null
          difficulty: string | null
          doe_id: string
          id: string
          kidding_date: string
          notes: string | null
          number_alive: number | null
          number_born: number | null
          number_bucks: number | null
          number_does: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          breeding_record_id?: string | null
          created_at?: string | null
          difficulty?: string | null
          doe_id: string
          id?: string
          kidding_date: string
          notes?: string | null
          number_alive?: number | null
          number_born?: number | null
          number_bucks?: number | null
          number_does?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          breeding_record_id?: string | null
          created_at?: string | null
          difficulty?: string | null
          doe_id?: string
          id?: string
          kidding_date?: string
          notes?: string | null
          number_alive?: number | null
          number_born?: number | null
          number_bucks?: number | null
          number_does?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kidding_records_breeding_record_id_fkey"
            columns: ["breeding_record_id"]
            isOneToOne: false
            referencedRelation: "breeding_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kidding_records_doe_id_fkey"
            columns: ["doe_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      milk_records: {
        Row: {
          amount: number
          amount_unit: string | null
          animal_id: string
          created_at: string | null
          date: string
          discard_reason: string | null
          discarded: boolean | null
          fat_percent: number | null
          id: string
          notes: string | null
          protein_percent: number | null
          session: string
          somatic_cell_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          amount_unit?: string | null
          animal_id: string
          created_at?: string | null
          date: string
          discard_reason?: string | null
          discarded?: boolean | null
          fat_percent?: number | null
          id?: string
          notes?: string | null
          protein_percent?: number | null
          session: string
          somatic_cell_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          amount_unit?: string | null
          animal_id?: string
          created_at?: string | null
          date?: string
          discard_reason?: string | null
          discarded?: boolean | null
          fat_percent?: number | null
          id?: string
          notes?: string | null
          protein_percent?: number | null
          session?: string
          somatic_cell_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milk_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      paddock_moves: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          moved_in_at: string
          moved_out_at: string | null
          notes: string | null
          paddock_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          moved_in_at: string
          moved_out_at?: string | null
          notes?: string | null
          paddock_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          moved_in_at?: string
          moved_out_at?: string | null
          notes?: string | null
          paddock_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paddock_moves_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paddock_moves_paddock_id_fkey"
            columns: ["paddock_id"]
            isOneToOne: false
            referencedRelation: "paddocks"
            referencedColumns: ["id"]
          },
        ]
      }
      paddocks: {
        Row: {
          acres: number | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          user_id: string
        }
        Insert: {
          acres?: number | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          user_id: string
        }
        Update: {
          acres?: number | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          animal_id: string | null
          caption: string | null
          category: string | null
          created_at: string | null
          date_taken: string | null
          filename: string
          guardian_id: string | null
          health_record_id: string | null
          id: string
          inspection_id: string | null
          predation_event_id: string | null
          url: string
          user_id: string
        }
        Insert: {
          animal_id?: string | null
          caption?: string | null
          category?: string | null
          created_at?: string | null
          date_taken?: string | null
          filename: string
          guardian_id?: string | null
          health_record_id?: string | null
          id?: string
          inspection_id?: string | null
          predation_event_id?: string | null
          url: string
          user_id: string
        }
        Update: {
          animal_id?: string | null
          caption?: string | null
          category?: string | null
          created_at?: string | null
          date_taken?: string | null
          filename?: string
          guardian_id?: string | null
          health_record_id?: string | null
          id?: string
          inspection_id?: string | null
          predation_event_id?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_health_record_id_fkey"
            columns: ["health_record_id"]
            isOneToOne: false
            referencedRelation: "health_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_predation_event_id_fkey"
            columns: ["predation_event_id"]
            isOneToOne: false
            referencedRelation: "predation_events"
            referencedColumns: ["id"]
          },
        ]
      }
      predation_events: {
        Row: {
          animals_injured: number | null
          animals_lost: number | null
          created_at: string | null
          date: string
          description: string | null
          guardian_id: string | null
          id: string
          location: string | null
          notes: string | null
          outcome: string | null
          predator_type: string | null
          user_id: string
        }
        Insert: {
          animals_injured?: number | null
          animals_lost?: number | null
          created_at?: string | null
          date: string
          description?: string | null
          guardian_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          outcome?: string | null
          predator_type?: string | null
          user_id: string
        }
        Update: {
          animals_injured?: number | null
          animals_lost?: number | null
          created_at?: string | null
          date?: string
          description?: string | null
          guardian_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          outcome?: string | null
          predator_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predation_events_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          comped: boolean
          created_at: string | null
          display_name: string | null
          email: string
          farm_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          comped?: boolean
          created_at?: string | null
          display_name?: string | null
          email: string
          farm_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          comped?: boolean
          created_at?: string | null
          display_name?: string | null
          email?: string
          farm_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          animal_id: string | null
          category: string
          created_at: string | null
          date: string
          description: string | null
          id: string
          notes: string | null
          payment_method: string | null
          receipt_url: string | null
          tax_deductible: boolean | null
          type: string
          updated_at: string | null
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          amount: number
          animal_id?: string | null
          category: string
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          tax_deductible?: boolean | null
          type: string
          updated_at?: string | null
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          animal_id?: string | null
          category?: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          tax_deductible?: boolean | null
          type?: string
          updated_at?: string | null
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string | null
          enabled_species: string[]
          farm_location: string | null
          farm_name: string | null
          id: string
          milk_unit: string | null
          temperature_unit: string | null
          updated_at: string | null
          user_id: string
          weight_unit: string | null
        }
        Insert: {
          created_at?: string | null
          enabled_species?: string[]
          farm_location?: string | null
          farm_name?: string | null
          id?: string
          milk_unit?: string | null
          temperature_unit?: string | null
          updated_at?: string | null
          user_id: string
          weight_unit?: string | null
        }
        Update: {
          created_at?: string | null
          enabled_species?: string[]
          farm_location?: string | null
          farm_name?: string | null
          id?: string
          milk_unit?: string | null
          temperature_unit?: string | null
          updated_at?: string | null
          user_id?: string
          weight_unit?: string | null
        }
        Relationships: []
      }
      weight_records: {
        Row: {
          animal_id: string
          created_at: string | null
          date: string
          id: string
          notes: string | null
          user_id: string
          weight: number
          weight_unit: string | null
        }
        Insert: {
          animal_id: string
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          user_id: string
          weight: number
          weight_unit?: string | null
        }
        Update: {
          animal_id?: string
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          user_id?: string
          weight?: number
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weight_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// ==========================================
// CONVENIENCE ALIASES (hand-maintained)
// ==========================================

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
