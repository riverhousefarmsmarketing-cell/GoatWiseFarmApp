'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient, mutationFrom } from '@/lib/supabase';
import { categoryIs, isFemale } from '@/lib/animalVocab';
import type { Animal, AnimalInsert, AnimalUpdate } from '@/types/database';

// ==========================================
// QUERY KEYS
// ==========================================

export const animalKeys = {
  all: ['animals'] as const,
  lists: () => [...animalKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...animalKeys.lists(), filters] as const,
  details: () => [...animalKeys.all, 'detail'] as const,
  detail: (id: string) => [...animalKeys.details(), id] as const,
  stats: () => [...animalKeys.all, 'stats'] as const,
};

// ==========================================
// HOOKS
// ==========================================

interface UseAnimalsOptions {
  status?: string;
  category?: string;
  herdId?: string;
  search?: string;
}

export function useAnimals(options: UseAnimalsOptions = {}) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: animalKeys.list(options as Record<string, unknown>),
    queryFn: async () => {
      let query = supabase.from('animals')
        .select('*')
        .order('name');

      if (options.status && options.status !== 'all') {
        query = query.eq('status', options.status);
      }
      if (options.category && options.category !== 'all') {
        query = query.eq('category', options.category);
      }
      if (options.herdId && options.herdId !== 'all') {
        query = query.eq('herd_id', options.herdId);
      }
      if (options.search) {
        query = query.ilike('name', `%${options.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Animal[];
    },
  });
}

export function useAnimal(id: string) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: animalKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('animals')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Animal;
    },
    enabled: !!id,
  });
}

export function useAnimalStats() {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: animalKeys.stats(),
    queryFn: async () => {
      const { data, error } = await supabase.from('animals')
        .select('status, category, sex');

      if (error) throw error;

      const animals = data as Pick<Animal, 'status' | 'category' | 'sex'>[];

      const activeAnimals = animals.filter((a) => a.status === 'active');
      return {
        total: animals.length,
        active: activeAnimals.length,
        milkingDoes: activeAnimals.filter((a) => categoryIs(a, 'milking_female')).length,
        dryDoes: activeAnimals.filter((a) => categoryIs(a, 'dry_female')).length,
        bredDoes: activeAnimals.filter((a) => categoryIs(a, 'bred_female')).length,
        bucks: activeAnimals.filter((a) => categoryIs(a, 'male')).length,
        bucklings: activeAnimals.filter((a) => categoryIs(a, 'young_male')).length,
        doelings: activeAnimals.filter((a) => categoryIs(a, 'young_female')).length,
        kids: activeAnimals.filter((a) => categoryIs(a, 'young')).length,
        does: activeAnimals.filter((a) => isFemale(a)).length,
      };
    },
  });
}

export function useCreateAnimal() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (animal: Omit<AnimalInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await mutationFrom('animals')
        .insert({ ...animal, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Animal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: animalKeys.all });
    },
  });
}

export function useUpdateAnimal() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AnimalUpdate & { id: string }) => {
      const { data, error } = await mutationFrom('animals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Animal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: animalKeys.all });
      queryClient.setQueryData(animalKeys.detail(data.id), data);
    },
  });
}

export function useDeleteAnimal() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete related records first to prevent orphans
      await supabase.from('milk_records').delete().eq('animal_id', id);
      await supabase.from('health_records').delete().eq('animal_id', id);
      await supabase.from('weight_records').delete().eq('animal_id', id);
      await supabase.from('inspections').delete().eq('animal_id', id);
      // Breeding records reference both doe and buck
      await supabase.from('breeding_records').delete().eq('doe_id', id);
      await supabase.from('breeding_records').delete().eq('buck_id', id);

      // Then delete the animal
      const { error } = await supabase.from('animals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: animalKeys.all });
    },
  });
}
