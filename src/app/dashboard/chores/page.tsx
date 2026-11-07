'use client';

import { useState } from 'react';
import Link from 'next/link';
import { addDays, format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, ListChecks, Undo2, Printer } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFarm, useFarmMembers, memberName } from '@/hooks/useFarm';
import { useTickChore, useUntickChore } from '@/hooks/useCare';
import { useChoresForDay, useTargetLabeler } from '@/hooks/useTodaysChores';
import { KIND_ICON } from '@/components/farm/careIcons';
import { formatSlot, isLate, localISODate } from '@/lib/chores';
import { Badge, Button, Card, EmptyState, LoadingSpinner } from '@/components/ui';
import { usePeople, useMyPerson, personName } from '@/hooks/usePeople';
import { DoneByDialog } from '@/components/farm/DoneByDialog';

export default function ChoresPage() {
  const today = localISODate();
  const [date, setDate] = useState(today);
  const { user } = useAuth();
  const { isManager } = useFarm();
  const { data: members } = useFarmMembers();
  const { chores, instructions, loading, hasPlans } = useChoresForDay(date);
  const labelFor = useTargetLabeler();
  const tick = useTickChore();
  const untick = useUntickChore();

  const myPersonFor = (userId: string | null) => people.find((pp) => pp.user_id === userId)?.id;
  const done = chores.filter((c) => c.completion).length;
  const slots = Array.from(new Set(chores.map((c) => c.slot)));
  const shift = (n: number) => setDate(format(addDays(parseISO(date), n), 'yyyy-MM-dd'));

  const { data: people = [] } = usePeople();
  const { data: myPerson } = useMyPerson();
  const [ticking, setTicking] = useState<{ planId: string; slot: string; title: string } | null>(null);
  const onTick = (planId: string, slot: string, title: string) => setTicking({ planId, slot, title });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chores</h1>
          <p className="text-gray-500">
            Feeding and watering from the <Link href="/dashboard/care-plans" className="underline">care plans</Link>. Tick each one off when it&apos;s done.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" aria-label="Previous day" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Date"
            className="rounded-lg border border-[#DDD8D4] px-2 py-1.5 text-sm" />
          <Button variant="outline" size="sm" aria-label="Next day" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
          {date !== today && <Button variant="ghost" size="sm" onClick={() => setDate(today)}>Today</Button>}
          <Link href={`/print/day?date=${date}`} target="_blank"><Button variant="outline" size="sm" leftIcon={<Printer className="h-4 w-4" />}>Print</Button></Link>
        </div>
      </div>

      {loading ? (
        <div className="p-8 flex justify-center"><LoadingSpinner /></div>
      ) : !hasPlans ? (
        <Card>
          <EmptyState icon={<ListChecks className="h-10 w-10" />} title="No chores yet"
            description={isManager ? 'Set up feeding and watering in Care Plans and they will show up here every day.' : 'Chores show up here once the owner sets up care plans.'}
            action={isManager ? <Link href="/dashboard/care-plans"><Button>Set up care plans</Button></Link> : undefined} />
        </Card>
      ) : (
        <>
          {instructions.length > 0 && (
            <Card className="border-[#5E1840]/30 bg-[#F4E4EE]/40">
              <h2 className="font-semibold text-[#5E1840] mb-2">Special instructions</h2>
              <ul className="space-y-1.5">
                {instructions.map((p) => {
                  const t = labelFor(p);
                  return (
                    <li key={p.id} className="text-sm text-gray-900 flex gap-2">
                      <span className="mt-0.5">{KIND_ICON.instruction}</span>
                      <span><span className="font-medium">{t.name}:</span> <span className="whitespace-pre-wrap">{p.title}</span></span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden" role="progressbar" aria-valuenow={done} aria-valuemax={chores.length} aria-label="Chores done">
              <div className="h-full bg-[#105040]" style={{ width: `${chores.length ? (done / chores.length) * 100 : 0}%` }} />
            </div>
            <p className="text-sm text-gray-700 whitespace-nowrap">{done} of {chores.length} done</p>
          </div>

          {chores.length === 0 ? (
            <Card><p className="text-sm text-gray-500">No feeding or watering scheduled for {format(parseISO(date), 'EEEE, MMM d')}.</p></Card>
          ) : (
            slots.map((slot) => (
              <Card key={slot || 'any'} padding="none">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">{formatSlot(slot)}</h2>
                </div>
                <ul className="divide-y divide-gray-50">
                  {chores.filter((c) => c.slot === slot).map((c) => {
                    const t = labelFor(c.plan);
                    const late = isLate(c, date);
                    const waitingToSend = !!(c.completion as any)?.pending;
                    const canUndo = c.completion && !waitingToSend && (c.completion.user_id === user?.id || isManager);
                    return (
                      <li key={c.key} className="px-5 py-3 flex items-start gap-3">
                        <button
                          className={`mt-0.5 flex-shrink-0 ${c.completion ? 'text-[#105040]' : 'text-gray-300 hover:text-[#105040]'}`}
                          aria-label={c.completion ? `${c.plan.title} done` : `Mark ${c.plan.title} done`}
                          disabled={!!c.completion || tick.isPending}
                          onClick={() => onTick(c.plan.id, c.slot, c.plan.title)}
                        >
                          {c.completion ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${c.completion ? 'text-gray-500' : 'text-gray-900'}`}>
                            <span className="inline-block align-middle mr-1">{KIND_ICON[c.plan.kind]}</span>
                            <span className="font-medium">{c.plan.title}</span>
                            {c.plan.amount !== null && <> — {c.plan.amount} {c.plan.unit}</>}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t.name}{t.where ? ` · ${t.where}` : ''}
                            {c.plan.notes ? ` · ${c.plan.notes}` : ''}
                          </p>
                          {c.completion && (
                            <p className="text-xs text-[#105040] mt-0.5">
                              Done by {(c.completion as any).person_id && (c.completion as any).person_id !== myPersonFor(c.completion.user_id)
                                ? `${personName(people, (c.completion as any).person_id)} (entered by ${memberName(members, c.completion.user_id)})`
                                : memberName(members, c.completion.user_id)} at {format(new Date(c.completion.done_at), 'h:mm a')}
                              {waitingToSend && ' · waiting for signal to send'}
                              {c.completion.note ? ` — “${c.completion.note}”` : ''}
                            </p>
                          )}
                        </div>
                        {late && <Badge variant="danger">Late</Badge>}
                        {canUndo && (
                          <button className="p-1 text-gray-400 hover:text-gray-700" title="Undo" aria-label={`Undo ${c.plan.title}`}
                            onClick={() => untick.mutate(c.completion!.id, { onError: (e: any) => alert(e.message) })}>
                            <Undo2 className="h-4 w-4" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))
          )}
        </>
      )}
      <DoneByDialog
        open={!!ticking}
        title={ticking ? `"${ticking.title}" done` : ''}
        busy={tick.isPending}
        onClose={() => setTicking(null)}
        onConfirm={({ personId, note }) => {
          if (!ticking) return;
          tick.mutate({ care_plan_id: ticking.planId, chore_date: date, slot: ticking.slot, note, person_id: personId && personId !== myPerson?.id ? personId : null } as any,
            { onSuccess: () => setTicking(null), onError: (e: any) => alert(e.message) });
        }}
      />
    </div>
  );
}
