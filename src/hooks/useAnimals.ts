'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
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
    queryKey: animalKeys.list(options as any),
    queryFn: async () => {
      let query = (supabase
        .from('animals') as any)
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
      const { data, error } = await (supabase
        .from('animals') as any)
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
      const { data, error } = await (supabase
        .from('animals') as any)
        .select('status, category, sex');

      if (error) throw error;

      const animals = data as Pick<Animal, 'status' | 'category' | 'sex'>[];

      return {
        total: animals.length,
        active: animals.filter((a) => a.status === 'active').length,
        milkingDoes: animals.filter((a) => a.category === 'milking_doe').length,
        dryDoes: animals.filter((a) => a.category === 'dry_doe').length,
        bredDoes: animals.filter((a) => a.category === 'bred_doe').length,
        bucks: animals.filter((a) => a.category === 'buck').length,
        kids: animals.filter((a) => a.category === 'kid').length,
        does: animals.filter((a) => a.sex === 'doe').length,
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

      const { data, error } = await (supabase
        .from('animals') as any)
        .insert({ ...animal, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { data, error } = await (supabase
        .from('animals') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { error } = await (supabase
        .from('animals') as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: animalKeys.all });
    },
  });
}
