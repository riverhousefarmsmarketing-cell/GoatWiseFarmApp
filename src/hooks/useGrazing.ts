import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient, mutationFrom } from '@/lib/supabase';
import { useAuth } from './useAuth';

// ============================================================
// TYPES
// ============================================================

export interface Paddock {
  id: string;
  user_id: string;
  name: string;
  acres: number | null;
  notes: string | null;
  created_at: string;
}

export interface PaddockMove {
  id: string;
  user_id: string;
  group_id: string;
  paddock_id: string;
  moved_in_at: string;
  moved_out_at: string | null;
  notes: string | null;
  created_at: string;
  // Joined fields
  paddocks?: { name: string; acres: number | null };
  groups?: { name: string; color: string };
}

export type ParasiteRisk = 'green' | 'yellow' | 'red';

export function getParasiteRisk(movedInAt: string): { risk: ParasiteRisk; daysIn: number } {
  const today = new Date();
  const moveIn = new Date(movedInAt);
  const daysIn = Math.floor((today.getTime() - moveIn.getTime()) / (1000 * 60 * 60 * 24));
  const risk: ParasiteRisk = daysIn >= 4 ? 'red' : daysIn === 3 ? 'yellow' : 'green';
  return { risk, daysIn };
}

export function getSafeReturnDate(movedOutAt: string): string {
  const d = new Date(movedOutAt);
  d.setDate(d.getDate() + 40);
  return d.toISOString().split('T')[0];
}

export function getDaysResting(movedOutAt: string): number {
  const today = new Date();
  const moveOut = new Date(movedOutAt);
  return Math.floor((today.getTime() - moveOut.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================================
// PADDOCK HOOKS
// ============================================================

export function usePaddocks() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  return useQuery({
    queryKey: ['paddocks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paddocks')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Paddock[];
    },
    enabled: !!user,
  });
}

export function useCreatePaddock() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (paddock: { name: string; acres?: number | null; notes?: string | null }) => {
      const { data, error } = await mutationFrom('paddocks')
        .insert([{ ...paddock, user_id: user?.id }])
        .select()
        .single();
      if (error) throw error;
      return data as Paddock;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paddocks'] }),
  });
}

export function useUpdatePaddock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Paddock> }) => {
      const { data, error } = await mutationFrom('paddocks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Paddock;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paddocks'] }),
  });
}

export function useDeletePaddock() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('paddocks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paddocks'] }),
  });
}

// ============================================================
// PADDOCK MOVE HOOKS
// ============================================================

export function usePaddockMoves() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  return useQuery({
    queryKey: ['paddock_moves'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paddock_moves')
        .select('*, paddocks(name, acres), groups(name, color)')
        .order('moved_in_at', { ascending: false });
      if (error) throw error;
      return data as PaddockMove[];
    },
    enabled: !!user,
  });
}

// Active moves only (moved_out_at IS NULL)
export function useActivePaddockMoves() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  return useQuery({
    queryKey: ['paddock_moves', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paddock_moves')
        .select('*, paddocks(name, acres), groups(name, color)')
        .is('moved_out_at', null)
        .order('moved_in_at', { ascending: false });
      if (error) throw error;
      return data as PaddockMove[];
    },
    enabled: !!user,
  });
}

// Moves for a specific group
export function useGroupPaddockMoves(groupId: string | null) {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  return useQuery({
    queryKey: ['paddock_moves', 'group', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paddock_moves')
        .select('*, paddocks(name, acres), groups(name, color)')
        .eq('group_id', groupId!)
        .order('moved_in_at', { ascending: false });
      if (error) throw error;
      return data as PaddockMove[];
    },
    enabled: !!user && !!groupId,
  });
}

export function useCreatePaddockMove() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (move: {
      group_id: string;
      paddock_id: string;
      moved_in_at: string;
      notes?: string | null;
    }) => {
      const { data, error } = await mutationFrom('paddock_moves')
        .insert([{ ...move, user_id: user?.id }])
        .select()
        .single();
      if (error) throw error;
      return data as PaddockMove;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paddock_moves'] });
    },
  });
}

export function useUpdatePaddockMove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PaddockMove> }) => {
      const { data, error } = await mutationFrom('paddock_moves')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as PaddockMove;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paddock_moves'] });
    },
  });
}

export function useDeletePaddockMove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await mutationFrom('paddock_moves').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paddock_moves'] });
    },
  });
}

export function useRecordMoveOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      moveId,
      movedOutAt,
      nextPaddockId,
      groupId,
      userId,
      notes,
    }: {
      moveId: string;
      movedOutAt: string;
      nextPaddockId?: string | null;
      groupId?: string;
      userId?: string;
      notes?: string | null;
    }) => {
      // Close current move
      const { error } = await mutationFrom('paddock_moves')
        .update({ moved_out_at: movedOutAt })
        .eq('id', moveId);
      if (error) throw error;

      // Optionally open new move
      if (nextPaddockId && groupId && userId) {
        const { error: err2 } = await mutationFrom('paddock_moves')
          .insert([{
            group_id: groupId,
            paddock_id: nextPaddockId,
            moved_in_at: movedOutAt,
            user_id: userId,
            notes: notes || null,
          }]);
        if (err2) throw err2;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paddock_moves'] });
    },
  });
}
