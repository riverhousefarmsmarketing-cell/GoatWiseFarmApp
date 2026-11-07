'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { useFarm } from '@/hooks/useFarm';
import { useCarePlans, CarePlanRow } from '@/hooks/useCare';
import { useTargetLabeler } from '@/hooks/useTodaysChores';
import { appliesOn, formatSlot, instructionsFor, localISODate } from '@/lib/chores';
import { addDaysISO } from '@/lib/healthSchedule';
import { weekOf } from '@/lib/pay';
import { Box, PrintToolbar, SectionTitle, SheetHeader } from '@/components/farm/PrintBits';
import { LoadingPage } from '@/components/ui';

function WeekSheet() {
  const params = useSearchParams();
  const [start, setStart] = useState(params.get('start') || weekOf(localISODate()).from);
  const { farm } = useFarm();
  const { data: plans = [], isLoading } = useCarePlans();
  const labelFor = useTargetLabeler();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysISO(start, i)), [start]);

  // One row per plan and time; a box on each day it applies.
  const rows = useMemo(() => {
    const out: { key: string; plan: CarePlanRow; slot: string }[] = [];
    for (const p of plans) {
      if (p.kind === 'instruction' || !days.some((d) => appliesOn(p, d))) continue;
      for (const slot of p.times.length ? [...p.times].sort() : ['']) out.push({ key: `${p.id}|${slot}`, plan: p, slot });
    }
    return out.sort((a, b) => (a.slot || '99').localeCompare(b.slot || '99') || a.plan.title.localeCompare(b.plan.title));
  }, [plans, days]);
  const instructions = useMemo(() => {
    const seen = new Map<string, CarePlanRow>();
    days.forEach((d) => instructionsFor(plans, d).forEach((p) => seen.set(p.id, p as CarePlanRow)));
    return Array.from(seen.values());
  }, [plans, days]);

  if (isLoading) return <LoadingPage />;

  return (
    <>
      <PrintToolbar back="/dashboard/chores">
        <label className="text-sm flex items-center gap-1">Week starting
          <input type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        </label>
        <span className="text-xs text-gray-500">Tip: print in landscape for more room.</span>
      </PrintToolbar>
      <div className="max-w-[10.5in] mx-auto p-6">
        <SheetHeader farm={farm?.name} title={`Weekly chores — ${format(parseISO(days[0]), 'MMM d')} to ${format(parseISO(days[6]), 'MMM d, yyyy')}`}
          subtitle="Tick the box and add your initials when done. Grey boxes: not that day." />
        {instructions.length > 0 && (
          <>
            <SectionTitle>Special instructions</SectionTitle>
            <ul className="list-disc pl-5 text-sm space-y-0.5 mb-2">
              {instructions.map((p) => <li key={p.id}><b>{labelFor(p).name}:</b> {p.title}</li>)}
            </ul>
          </>
        )}
        {rows.length === 0 ? <p className="text-sm">No chores scheduled this week.</p> : (
          <table>
            <thead>
              <tr>
                <th>Time</th><th>Job</th>
                {days.map((d) => <th key={d} className="text-center w-[3.2rem]">{format(parseISO(d), 'EEE')}<br />{format(parseISO(d), 'M/d')}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ key, plan, slot }) => {
                const t = labelFor(plan);
                return (
                  <tr key={key}>
                    <td className="whitespace-nowrap text-sm">{formatSlot(slot)}</td>
                    <td className="text-sm"><b>{plan.title}</b>{plan.amount != null ? ` — ${plan.amount} ${plan.unit ?? ''}` : ''}<div className="text-xs">{t.name}{t.where ? ` · ${t.where}` : ''}</div></td>
                    {days.map((d) => (
                      <td key={d} className="text-center">
                        {appliesOn(plan, d) ? <Box /> : <span className="inline-block w-4 h-4 bg-gray-300 rounded-sm align-middle" aria-hidden />}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export default function PrintWeekPage() {
  return <Suspense fallback={<LoadingPage />}><WeekSheet /></Suspense>;
}
