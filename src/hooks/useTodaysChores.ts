'use client';

import { useMemo } from 'react';
import { useActivePaddockMoves } from '@/hooks/useGrazing';
import { useCarePlans, useChoreCompletions, CarePlanRow } from '@/hooks/useCare';
import { Chore, choresForDay, instructionsFor } from '@/lib/chores';

/** Where a plan applies, in words: "Milking does · in North Pasture". */
export function useTargetLabeler() {
  const { data: activeMoves = [] } = useActivePaddockMoves();
  return useMemo(() => {
    const groupPaddock = new Map<string, string>();
    const paddockGroups = new Map<string, string[]>();
    for (const mv of activeMoves) {
      if (mv.group_id && mv.paddocks?.name) groupPaddock.set(mv.group_id, mv.paddocks.name);
      if (mv.groups?.name) paddockGroups.set(mv.paddock_id, [...(paddockGroups.get(mv.paddock_id) ?? []), mv.groups.name]);
    }
    return (p: CarePlanRow): { name: string; where: string | null } => {
      if (p.group_id) {
        const pad = groupPaddock.get(p.group_id);
        return { name: p.groups?.name ?? 'Group', where: pad ? `in ${pad}` : null };
      }
      if (p.paddock_id) {
        const gs = paddockGroups.get(p.paddock_id);
        return { name: p.paddocks?.name ?? 'Pasture', where: gs?.length ? `grazing: ${gs.join(', ')}` : null };
      }
      return { name: p.herds?.name ?? 'Herd', where: null };
    };
  }, [activeMoves]);
}

export function useChoresForDay(isoDate: string) {
  const { data: plans = [], isLoading: plansLoading } = useCarePlans();
  const { data: completions = [], isLoading: doneLoading } = useChoreCompletions(isoDate);
  const chores = useMemo(() => choresForDay(plans, completions, isoDate), [plans, completions, isoDate]);
  const instructions = useMemo(() => instructionsFor(plans, isoDate) as CarePlanRow[], [plans, isoDate]);
  return {
    chores: chores as (Chore & { plan: CarePlanRow })[],
    instructions,
    loading: plansLoading || doneLoading,
    hasPlans: plans.length > 0,
  };
}
