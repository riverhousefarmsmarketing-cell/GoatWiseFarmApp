'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Wheat, Pause, Play, X, MapPin } from 'lucide-react';
import { KIND_ICON } from '@/components/farm/careIcons';
import { useFarm } from '@/hooks/useFarm';
import { useGroups } from '@/hooks/useGroups';
import { useHerds } from '@/hooks/useHerds';
import { usePaddocks, useActivePaddockMoves } from '@/hooks/useGrazing';
import {
  CarePlanInput, CarePlanRow, KIND_LABELS, useCarePlans, useDeleteCarePlan, useSaveCarePlan, useSetCarePlanActive,
} from '@/hooks/useCare';
import { CareKind, DAY_NAMES, describeSchedule, isInSeason, localISODate } from '@/lib/chores';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner, Modal, Select } from '@/components/ui';


type Target = { type: 'group' | 'paddock' | 'herd'; id: string; name: string; extra?: string };

const EMPTY: CarePlanInput = {
  kind: 'feeding', target: 'group', target_id: '', title: '', amount: '', unit: '', times: ['07:00'],
  days_of_week: [], seasonal: false, season_start: '11-01', season_end: '03-31', active: true, notes: '',
};

const MONTH_OPTIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => ({
  value: String(i + 1).padStart(2, '0'), label: m,
}));
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1).padStart(2, '0'), label: String(i + 1) }));

function MonthDayPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [m, d] = value.split('-');
  return (
    <div>
      <p className="block text-sm font-medium text-[#384E42] mb-1">{label}</p>
      <div className="flex gap-2">
        <Select aria-label={`${label} month`} value={m} onChange={(e) => onChange(`${e.target.value}-${d}`)} options={MONTH_OPTIONS} />
        <Select aria-label={`${label} day`} value={d} onChange={(e) => onChange(`${m}-${e.target.value}`)} options={DAY_OPTIONS} />
      </div>
    </div>
  );
}

export default function CarePlansPage() {
  const today = localISODate();
  const { isManager } = useFarm();
  const { data: plans = [], isLoading } = useCarePlans();
  const { data: groups = [] } = useGroups();
  const { data: paddocks = [] } = usePaddocks();
  const { data: herds = [] } = useHerds();
  const { data: activeMoves = [] } = useActivePaddockMoves();
  const savePlan = useSaveCarePlan();
  const setActive = useSetCarePlanActive();
  const deletePlan = useDeleteCarePlan();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CarePlanInput>(EMPTY);
  const [formError, setFormError] = useState('');

  const groupPaddock = useMemo(() => {
    const m = new Map<string, string>();
    activeMoves.forEach((mv) => mv.group_id && mv.paddocks?.name && m.set(mv.group_id, mv.paddocks.name));
    return m;
  }, [activeMoves]);
  const paddockGroups = useMemo(() => {
    const m = new Map<string, string[]>();
    activeMoves.forEach((mv) => {
      if (!mv.groups?.name) return;
      m.set(mv.paddock_id, [...(m.get(mv.paddock_id) ?? []), mv.groups.name]);
    });
    return m;
  }, [activeMoves]);

  const sections: { title: string; type: Target['type']; targets: Target[]; empty: React.ReactNode }[] = [
    {
      title: 'Groups',
      type: 'group',
      targets: (groups as any[]).map((g) => ({ type: 'group', id: g.id, name: g.name, extra: groupPaddock.get(g.id) ? `Now in ${groupPaddock.get(g.id)}` : undefined })),
      empty: <>No groups yet. <Link href="/dashboard/groups" className="underline">Create groups</Link> to give each its own plan.</>,
    },
    {
      title: 'Pastures',
      type: 'paddock',
      targets: paddocks.map((p) => ({ type: 'paddock', id: p.id, name: p.name, extra: paddockGroups.get(p.id)?.length ? `Grazing now: ${paddockGroups.get(p.id)!.join(', ')}` : undefined })),
      empty: <>No pastures yet. <Link href="/dashboard/grazing" className="underline">Add pastures</Link> on the Grazing page.</>,
    },
    {
      title: 'Herds',
      type: 'herd',
      targets: (herds as any[]).map((h) => ({ type: 'herd', id: h.id, name: h.name })),
      empty: <>No herds yet.</>,
    },
  ];

  const plansFor = (t: Target) =>
    plans.filter((p) => (t.type === 'group' ? p.group_id : t.type === 'paddock' ? p.paddock_id : p.herd_id) === t.id);

  const openNew = (t?: Target, kind: CareKind = 'feeding') => {
    setForm({ ...EMPTY, kind, times: kind === 'instruction' ? [] : ['07:00'], target: t?.type ?? 'group', target_id: t?.id ?? '' });
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (p: CarePlanRow) => {
    setForm({
      id: p.id,
      kind: p.kind,
      target: p.group_id ? 'group' : p.paddock_id ? 'paddock' : 'herd',
      target_id: (p.group_id ?? p.paddock_id ?? p.herd_id)!,
      title: p.title,
      amount: p.amount === null ? '' : String(p.amount),
      unit: p.unit ?? '',
      times: [...p.times],
      days_of_week: p.days_of_week ?? [],
      seasonal: !!p.season_start,
      season_start: p.season_start ?? '11-01',
      season_end: p.season_end ?? '03-31',
      active: p.active,
      notes: p.notes ?? '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const submit = () => {
    if (!form.target_id) return setFormError('Choose who or where this plan is for.');
    if (!form.title.trim()) return setFormError(form.kind === 'instruction' ? 'Write the instruction.' : 'Say what to feed or do.');
    if (form.seasonal && form.season_start === form.season_end) return setFormError('The season needs different start and end dates.');
    savePlan.mutate(form, { onSuccess: () => setFormOpen(false), onError: (e: any) => setFormError(e.message) });
  };

  const targetOptions =
    form.target === 'group'
      ? (groups as any[]).map((g) => ({ value: g.id, label: g.name }))
      : form.target === 'paddock'
        ? paddocks.map((p) => ({ value: p.id, label: p.name }))
        : (herds as any[]).map((h) => ({ value: h.id, label: h.name }));

  if (isLoading) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Care Plans</h1>
          <p className="text-gray-500">
            Feeding, watering and special instructions for each group, pasture or herd. Group plans follow the group when it moves;
            pasture plans stay with the pasture. Feeding and watering times show up on <Link href="/dashboard/chores" className="underline">Today&apos;s Chores</Link>.
          </p>
        </div>
        {isManager && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openNew()}>New plan</Button>
        )}
      </div>

      {!isManager && (
        <p className="text-sm text-gray-500">The owner and managers set up care plans. You can tick off chores on Today&apos;s Chores.</p>
      )}

      {sections.map((sec) => (
        <section key={sec.type} className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">{sec.title}</h2>
          {sec.targets.length === 0 ? (
            <Card><p className="text-sm text-gray-500">{sec.empty}</p></Card>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {sec.targets.map((t) => {
                const list = plansFor(t);
                return (
                  <Card key={t.id} padding="none">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{t.name}</h3>
                        {t.extra && (
                          <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> {t.extra}</p>
                        )}
                      </div>
                      {isManager && (
                        <Button size="sm" variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => openNew(t)}>Add</Button>
                      )}
                    </div>
                    {list.length === 0 ? (
                      <p className="px-5 py-3 text-sm text-gray-500">No plan yet.</p>
                    ) : (
                      <ul className="divide-y divide-gray-50">
                        {list.map((p) => {
                          const inSeason = isInSeason(p, today);
                          return (
                            <li key={p.id} className={`px-5 py-3 flex items-start gap-3 ${!p.active || !inSeason ? 'opacity-60' : ''}`}>
                              <span className="mt-0.5">{KIND_ICON[p.kind]}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900">
                                  <span className="font-medium">{p.title}</span>
                                  {p.amount !== null && <span className="text-gray-600"> — {p.amount} {p.unit}</span>}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {KIND_LABELS[p.kind]} · {describeSchedule(p)}
                                </p>
                                {p.notes && <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">{p.notes}</p>}
                                <div className="flex gap-1 mt-1">
                                  {!p.active && <Badge>Paused</Badge>}
                                  {p.active && !inSeason && <Badge>Out of season</Badge>}
                                </div>
                              </div>
                              {isManager && (
                                <div className="flex gap-0.5 flex-shrink-0">
                                  <button className="p-1.5 text-gray-400 hover:text-gray-700" title={p.active ? 'Pause' : 'Resume'}
                                    onClick={() => setActive.mutate({ id: p.id, active: !p.active }, { onError: (e: any) => alert(e.message) })}>
                                    {p.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                  </button>
                                  <button className="p-1.5 text-gray-400 hover:text-gray-700" title="Edit" onClick={() => openEdit(p)}>
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button className="p-1.5 text-gray-400 hover:text-red-700" title="Delete"
                                    onClick={() => confirm(`Delete "${p.title}" for ${t.name}?`) && deletePlan.mutate(p.id, { onError: (e: any) => alert(e.message) })}>
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      ))}

      {plans.length === 0 && isManager && (
        <Card>
          <EmptyState icon={<Wheat className="h-10 w-10" />} title="No care plans yet"
            description="Start with what each group eats and when, then add watering and anything special." />
        </Card>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={form.id ? 'Edit care plan' : 'New care plan'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button loading={savePlan.isPending} onClick={submit}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{formError}</div>}

          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Type">
            {(['feeding', 'watering', 'instruction'] as CareKind[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={form.kind === k}
                onClick={() => setForm({ ...form, kind: k, times: k === 'instruction' ? [] : form.times.length ? form.times : ['07:00'] })}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${form.kind === k ? 'border-[#105040] bg-[#B8DCC8]/30 font-medium' : 'border-[#DDD8D4]'}`}>
                {KIND_ICON[k]} {k === 'instruction' ? 'Instruction' : KIND_LABELS[k]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="For a" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value as CarePlanInput['target'], target_id: '' })}
              options={[{ value: 'group', label: 'Group' }, { value: 'paddock', label: 'Pasture' }, { value: 'herd', label: 'Herd' }]} />
            <Select label={form.target === 'paddock' ? 'Pasture' : form.target === 'group' ? 'Group' : 'Herd'} value={form.target_id}
              onChange={(e) => setForm({ ...form, target_id: e.target.value })}
              options={[{ value: '', label: 'Choose…' }, ...targetOptions]} />
          </div>

          {form.kind === 'instruction' ? (
            <div className="space-y-1">
              <label htmlFor="plan-title" className="block text-sm font-medium text-[#384E42]">Instruction<span className="text-[#9B1C1C] ml-1">*</span></label>
              <textarea id="plan-title" rows={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. No alfalfa for the bucks. Daisy gets her grain separately."
                className="w-full rounded-lg border border-[#DDD8D4] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#105040]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <Input label={form.kind === 'feeding' ? 'What to feed' : 'What to do'} value={form.title} required
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={form.kind === 'feeding' ? 'e.g. Alfalfa hay' : 'e.g. Check and fill troughs'} />
              </div>
              <Input label="Amount" type="number" min="0" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <Input label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder={form.kind === 'feeding' ? 'flakes' : 'gal'} />
            </div>
          )}

          {form.kind !== 'instruction' && (
            <div>
              <p className="block text-sm font-medium text-[#384E42] mb-1">Times</p>
              <div className="flex flex-wrap gap-2 items-center">
                {form.times.map((t, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input type="time" value={t} aria-label={`Time ${i + 1}`}
                      onChange={(e) => setForm({ ...form, times: form.times.map((x, j) => (j === i ? e.target.value : x)) })}
                      className="rounded-lg border border-[#DDD8D4] px-2 py-1.5 text-sm" />
                    <button type="button" className="p-1 text-gray-400 hover:text-gray-700" aria-label="Remove time"
                      onClick={() => setForm({ ...form, times: form.times.filter((_, j) => j !== i) })}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button type="button" size="sm" variant="ghost" leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setForm({ ...form, times: [...form.times, '12:00'] })}>Add time</Button>
              </div>
              {form.times.length === 0 && <p className="text-xs text-gray-500 mt-1">No set time: it shows as one &ldquo;any time&rdquo; chore each day.</p>}
            </div>
          )}

          <div>
            <p className="block text-sm font-medium text-[#384E42] mb-1">Days</p>
            <div className="flex flex-wrap gap-1">
              {DAY_NAMES.map((d, i) => {
                const on = form.days_of_week.length === 0 || form.days_of_week.includes(i);
                return (
                  <button key={d} type="button" aria-pressed={on}
                    onClick={() => {
                      const current = form.days_of_week.length === 0 ? [0, 1, 2, 3, 4, 5, 6] : form.days_of_week;
                      const next = current.includes(i) ? current.filter((x) => x !== i) : [...current, i];
                      setForm({ ...form, days_of_week: next.length === 7 ? [] : next });
                    }}
                    className={`w-11 py-1.5 rounded-md text-sm border ${on ? 'bg-[#105040] text-white border-[#105040]' : 'border-[#DDD8D4] text-gray-600'}`}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.seasonal} onChange={(e) => setForm({ ...form, seasonal: e.target.checked })} className="rounded" />
              Only part of the year (seasonal)
            </label>
            {form.seasonal && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MonthDayPicker label="From" value={form.season_start} onChange={(v) => setForm({ ...form, season_start: v })} />
                <MonthDayPicker label="Until" value={form.season_end} onChange={(v) => setForm({ ...form, season_end: v })} />
                <p className="sm:col-span-2 text-xs text-gray-500">Repeats every year. A range like Nov 1 – Mar 31 runs through the winter.</p>
              </div>
            )}
          </div>

          {form.kind !== 'instruction' && (
            <Input label="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Use the green buckets" />
          )}

          {form.id && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="rounded" />
              Active (untick to pause without deleting)
            </label>
          )}
        </div>
      </Modal>
    </div>
  );
}
