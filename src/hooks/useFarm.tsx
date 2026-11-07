'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { FarmRole, isFarmManagerRole, setFarmSessionRole } from '@/lib/farmSession';

export interface MyFarm {
  farm_id: string;
  name: string;
  role: FarmRole;
  complimentary: boolean;
  is_current: boolean;
}

export interface FarmMember {
  user_id: string;
  role: FarmRole;
  email: string | null;
  display_name: string | null;
  joined_at: string;
}

interface FarmContextType {
  /** The farm the person is working in, or null if they belong to none. */
  farm: MyFarm | null;
  /** Every farm they belong to (for the farm switcher). */
  farms: MyFarm[];
  role: FarmRole | null;
  isOwner: boolean;
  /** Owner or manager. */
  isManager: boolean;
  loading: boolean;
  switchFarm: (farmId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export const farmKeys = {
  mine: ['my_farms'] as const,
  members: ['farm_members'] as const,
};

export function FarmProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: farms = [], isLoading, refetch } = useQuery<MyFarm[]>({
    queryKey: farmKeys.mine,
    queryFn: async () => {
      const { data, error } = await (getSupabaseClient() as any).rpc('get_my_farms');
      if (error) throw error;
      return (data ?? []) as MyFarm[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const farm = farms.find((f) => f.is_current) ?? farms[0] ?? null;
  const role = farm?.role ?? null;

  useEffect(() => {
    setFarmSessionRole(role);
  }, [role]);

  const switchFarm = async (farmId: string) => {
    const { error } = await (getSupabaseClient() as any).rpc('switch_farm', { p_farm_id: farmId });
    if (error) throw error;
    // Every cached list belongs to the old farm.
    queryClient.clear();
    await refetch();
  };

  const refresh = async () => {
    await refetch();
  };

  return (
    <FarmContext.Provider
      value={{
        farm,
        farms,
        role,
        isOwner: role === 'owner',
        isManager: isFarmManagerRole(role),
        loading: isLoading,
        switchFarm,
        refresh,
      }}
    >
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  const context = useContext(FarmContext);
  if (context === undefined) {
    throw new Error('useFarm must be used within a FarmProvider');
  }
  return context;
}

/** Everyone on the current farm, with display names. */
export function useFarmMembers() {
  const { farm } = useFarm();
  return useQuery<FarmMember[]>({
    queryKey: [...farmKeys.members, farm?.farm_id],
    queryFn: async () => {
      const { data, error } = await (getSupabaseClient() as any).rpc('get_farm_members');
      if (error) throw error;
      return (data ?? []) as FarmMember[];
    },
    enabled: !!farm,
  });
}

export function memberName(members: FarmMember[] | undefined, userId: string | null | undefined): string {
  if (!userId) return 'Someone';
  const m = members?.find((x) => x.user_id === userId);
  return m?.display_name || m?.email || 'Former team member';
}

export const ROLE_LABELS: Record<FarmRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  worker: 'Worker',
};
