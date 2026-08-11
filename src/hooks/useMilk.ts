'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient, mutationFrom } from '@/lib/supabase';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import type { MilkRecord, MilkRecordInsert } from '@/types/database';

// ==========================================
// QUERY KEYS
// ==========================================

export const milkKeys = {
  all: ['milk'] as const,
  lists: () => [...milkKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...milkKeys.lists(), filters] as const,
  today: () => [...milkKeys.all, 'today'] as const,
  stats: (days: number) => [...milkKeys.all, 'stats', days] as const,
  byAnimal: (animalId: string) => [...milkKeys.all, 'animal', animalId] as const,
};

// ==========================================
// UNIT NORMALIZATION
// ==========================================

// All production stats are shown in lbs, but amount_unit may be kg/liters/
// gallons/quarts (the CSV import can introduce them). Normalize to lbs before
// summing so totals/averages/rankings don't add incomparable units. Volume
// conversions use milk's approximate density (~8.6 lb/US gal).
const MILK_TO_LBS: Record<string, number> = {
  lbs: 1,
  kg: 2.20462,
  liters: 2.27,
  gallons: 8.6,
  quarts: 2.15,
};

export function milkAmountToLbs(amount: number | null | undefined, unit?: string | null): number {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return n * (MILK_TO_LBS[unit || 'lbs'] ?? 1);
}

// ==========================================
// HOOKS
// ==========================================

export function useTodaysMilk() {
  const supabase = getSupabaseClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    // Include the date so "Today's Records" refetches when the day rolls over.
    queryKey: [...milkKeys.today(), today],
    queryFn: async () => {
      const { data, error } = await supabase.from('milk_records')
        .select('*, animals(name)')
        .eq('date', today)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (MilkRecord & { animals?: { name: string } | null })[];
    },
  });
}

export function useMilkStats(days: number = 7) {
  const supabase = getSupabaseClient();
  // days-1: an inclusive `.gte` window is `days` calendar days counting today
  // (subDays(now, days) spanned days+1, so a "7-day" stat covered 8 days).
  const startDate = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');

  return useQuery({
    queryKey: milkKeys.stats(days),
    queryFn: async () => {
      const { data, error } = await supabase.from('milk_records')
        .select('date, amount, amount_unit, discarded')
        .gte('date', startDate)
        .order('date');

      if (error) throw error;

      const records = data as MilkRecord[];

      // Group by date (normalized to lbs)
      const byDate = records.reduce((acc, record) => {
        if (!acc[record.date]) {
          acc[record.date] = { total: 0, discarded: 0 };
        }
        const lbs = milkAmountToLbs(record.amount, record.amount_unit);
        if (record.discarded) {
          acc[record.date].discarded += lbs;
        } else {
          acc[record.date].total += lbs;
        }
        return acc;
      }, {} as Record<string, { total: number; discarded: number }>);

      // Calculate totals (normalized to lbs)
      const totalAmount = records
        .filter((r) => !r.discarded)
        .reduce((sum, r) => sum + milkAmountToLbs(r.amount, r.amount_unit), 0);

      const discardedAmount = records
        .filter((r) => r.discarded)
        .reduce((sum, r) => sum + milkAmountToLbs(r.amount, r.amount_unit), 0);

      const dailyAverage = totalAmount / days;

      return {
        byDate,
        totalAmount,
        discardedAmount,
        dailyAverage,
        recordCount: records.length,
      };
    },
  });
}

export function useMilkByAnimal(animalId: string, days: number = 30) {
  const supabase = getSupabaseClient();
  // days-1: an inclusive `.gte` window is `days` calendar days counting today
  // (subDays(now, days) spanned days+1, so a "7-day" stat covered 8 days).
  const startDate = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');

  return useQuery({
    queryKey: [...milkKeys.byAnimal(animalId), days],
    queryFn: async () => {
      const { data, error } = await supabase.from('milk_records')
        .select('*')
        .eq('animal_id', animalId)
        .gte('date', startDate)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as MilkRecord[];
    },
    enabled: !!animalId,
  });
}

export function useTopProducers(days: number = 7) {
  const supabase = getSupabaseClient();
  // days-1: an inclusive `.gte` window is `days` calendar days counting today
  // (subDays(now, days) spanned days+1, so a "7-day" stat covered 8 days).
  const startDate = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['milk', 'top-producers', days],
    queryFn: async () => {
      const { data, error } = await supabase.from('milk_records')
        .select('animal_id, amount, amount_unit, animals(name)')
        .gte('date', startDate)
        .eq('discarded', false);

      if (error) throw error;

      // Group by animal (normalized to lbs)
      const byAnimal = (data as (MilkRecord & { animals: { name: string } | null })[]).reduce((acc: Record<string, { animalId: string; name: string; total: number }>, record) => {
        if (!acc[record.animal_id]) {
          acc[record.animal_id] = {
            animalId: record.animal_id,
            name: record.animals?.name || 'Unknown',
            total: 0,
          };
        }
        acc[record.animal_id].total += milkAmountToLbs(record.amount, record.amount_unit);
        return acc;
      }, {} as Record<string, { animalId: string; name: string; total: number }>);

      return Object.values(byAnimal)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    },
  });
}

export function useCreateMilkRecord() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (record: Omit<MilkRecordInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await mutationFrom('milk_records')
        .insert({ ...record, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as MilkRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: milkKeys.all });
    },
  });
}

export function useUpdateMilkRecord() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MilkRecordInsert> & { id: string }) => {
      const { error } = await mutationFrom('milk_records')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: milkKeys.all });
    },
  });
}

export function useDeleteMilkRecord() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('milk_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: milkKeys.all });
    },
    onError: (e: any) => {
      alert(`Could not delete the milk record: ${e?.message || 'please try again.'}`);
    },
  });
}
