'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useFarm } from '@/hooks/useFarm';

const db = () => getSupabaseClient() as any;

export interface EmergencyInfo {
  farm_id: string;
  address: string | null;
  directions: string | null;
  medicine_location: string | null;
  supplies_location: string | null;
  notes: string | null;
  updated_at: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  alt_phone: string | null;
  notes: string | null;
  sort_order: number;
}

const keys = { info: ['farm_emergency_info'] as const, contacts: ['emergency_contacts'] as const };

export function useEmergencyInfo() {
  const { farm } = useFarm();
  return useQuery<EmergencyInfo | null>({
    queryKey: [...keys.info, farm?.farm_id],
    queryFn: async () => {
      const { data, error } = await db().from('farm_emergency_info').select('*').maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!farm,
  });
}

export function useEmergencyContacts() {
  const { farm } = useFarm();
  return useQuery<EmergencyContact[]>({
    queryKey: [...keys.contacts, farm?.farm_id],
    queryFn: async () => {
      const { data, error } = await db().from('emergency_contacts').select('*').order('sort_order').order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!farm,
  });
}

export function useSaveEmergencyInfo() {
  const queryClient = useQueryClient();
  const { farm } = useFarm();
  return useMutation({
    mutationFn: async (info: Omit<EmergencyInfo, 'farm_id' | 'updated_at'>) => {
      const clean = Object.fromEntries(Object.entries(info).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || null : v]));
      const { error } = await db()
        .from('farm_emergency_info')
        .upsert({ ...clean, farm_id: farm!.farm_id, updated_at: new Date().toISOString() }, { onConflict: 'farm_id' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.info }),
  });
}

export function useSaveContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (c: Partial<EmergencyContact> & { name: string }) => {
      const values = {
        name: c.name.trim(),
        role: c.role?.trim() || null,
        phone: c.phone?.trim() || null,
        alt_phone: c.alt_phone?.trim() || null,
        notes: c.notes?.trim() || null,
        sort_order: c.sort_order ?? 0,
      };
      const { error } = c.id
        ? await db().from('emergency_contacts').update({ ...values, updated_at: new Date().toISOString() }).eq('id', c.id)
        : await db().from('emergency_contacts').insert(values);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.contacts }),
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from('emergency_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.contacts }),
  });
}

/** tel: link with only the characters a phone dialer understands. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^0-9+*#,]/g, '')}`;
}
