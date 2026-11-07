'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { CalendarCheck, Plus, Pencil, Trash2, Settings2 } from 'lucide-react';
import { useFarm } from '@/hooks/useFarm';
import { useGroups } from '@/hooks/useGroups';
import { useHerds } from '@/hooks/useHerds';
import {
  animalLabel, useDeleteProtocol, useHealthProtocols, useMedicineLots, useMedicines, useProtocolRecords,
  useRecordScheduled, useSaveProtocol, useScheduleAnimals,
} from '@/hooks/useAnimalHealth';
import { DueItem, HealthProtocol, ScheduleKind, computeDue, describeProtocol } from '@/lib/healthSchedule';
import { localISODate } from '@/lib/chores';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner, Modal, Select } from '@/components/ui';

const HEALTH_TYPES = [
  { value: 'vaccination', label: 'Vaccination' }, { value: 'deworming', label: 'Deworming' }, { value: 'hoof_trim', label: 'Hoof trim' },
  { value: 'observation', label: 'Check (e.g. FAMACHA)' }, { value: 'vet_visit', label: 'Vet visit' }, { value: 'treatment', label: 'Treatment' },
  { value: 'other', label: 'Other' },
];
const SEX_OPTIONS = [{ value: 'doe', label: 'Does' }, { value: 'buck', label: 'Bucks' }, { value: 'wether', label: 'Wethers' }];
const CATEGORY_OPTIONS = [
  { value: 'milking_doe', label: 'Milking does' }, { value: 'dry_doe', label: 'Dry does' }, { value: 'bred_doe', label: 'Bred does' },
  { value: 'doeling', label: 'Doelings' }, { value: 'buck', label: 'Bucks' }, { value: 'buckling', label: 'Bucklings' },
  { value: 'wether', label: 'Wethers' }, { value: 'kid', label: 'Kids' },
];

type RuleForm = {
  id?: string; name: string; health_type: string; medicine_id: string; default_dose: string; default_dose_unit: string; route: string;
  schedule_kind: ScheduleKind; interval_days: string; age_days: string; yearly_month: string; yearly_day: string; min_age_days: string;
  sexes: string[]; categories: string[]; herd_id: string; group_id: string; seasonal: boolean; season_start: string; season_end: string;
  lead_days: string; baseline_date: string; active: boolean; notes: string;
};

const EMPTY_RULE: RuleForm = {
  name: '', health_type: 'vaccination', medicine_id: '', default_dose: '', default_dose_unit: 'ml', route: '', schedule_kind: 'interval',
  interval_days: '56', age_days: '28, 56', yearly_month: '03', yearly_day: '01', min_age_days: '', sexes: [], categories: [], herd_id: '',
  group_id: '', seasonal: false, season_start: '05-01', season_end: '10-31', lead_days: '7', baseline_date: '', active: true, notes: '',
};

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export default function HealthSchedulePage() {
  const today = localISODate();
  const { isManager } = useFarm();
  const { data: protocols = [], isLoading } = useHealthProtocols();
  const { data: animals = [] } = useScheduleAnimals();
  const { data: records = [] } = useProtocolRecords();
  const { data: medicines = [] } = useMedicines();
  const { data: lots = [] } = useMedicineLots();
  const { data: herds = [] } = useHerds();
  const { data: groups = [] } = useGroups();
  const saveProtocol = useSaveProtocol();
  const deleteProtocol = useDeleteProtocol();
  const recordScheduled = useRecordScheduled();

  const [showUpcoming, setShowUpcoming] = useState(true);
  const [rule, setRule] = useState<RuleForm | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [error, setError] = useState('');

  // Recording
  const [recording, setRecording] = useState<{ protocol: HealthProtocol; items: DueItem[] } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rec, setRec] = useState({ date: today, medicine_lot_id: '', dosage: '', dosage_unit: '', route: '', withdrawal_days: '', administered_by: '', notes: '' });

  const due = useMemo(() => computeDue(protocols, animals, records, today), [protocols, animals, records, today]);
  const shownDue = due.filter((d) => showUpcoming || d.state !== 'upcoming');
  const byProtocol = useMemo(() => {
    const m = new Map<string, DueItem[]>();
    shownDue.forEach((d) => m.set(d.protocol.id, [...(m.get(d.protocol.id) ?? []), d]));
    return m;
  }, [shownDue]);
  const counts = { overdue: due.filter((d) => d.state === 'overdue').length, due: due.filter((d) => d.state === 'due').length, upcoming: due.filter((d) => d.state === 'upcoming').length };

  const openRecord = (protocol: HealthProtocol, items: DueItem[]) => {
    const med = medicines.find((m) => m.id === protocol.medicine_id);
    const lot = lots.filter((l) => l.medicine_id === protocol.medicine_id && l.status === 'in_stock').sort((a, b) => (a.expiry_date ?? '9999').localeCompare(b.expiry_date ?? '9999'))[0];
    setRecording({ protocol, items });
    setSelected(new Set(items.filter((i) => i.state !== 'upcoming').map((i) => i.animal.id)));
    setRec({
      date: today, medicine_lot_id: lot?.id ?? '',
      dosage: protocol.default_dose?.toString() ?? med?.default_dose?.toString() ?? '',
      dosage_unit: protocol.default_dose_unit ?? med?.default_dose_unit ?? '',
      route: protocol.route ?? med?.route ?? '',
      withdrawal_days: med ? String(Math.max(med.meat_withdrawal_days ?? 0, med.milk_withdrawal_days ?? 0) || '') : '',
      administered_by: '', notes: '',
    });
    setError('');
  };
  const submitRecord = () => {
    if (!recording) return;
    const med = medicines.find((m) => m.id === recording.protocol.medicine_id);
    recordScheduled.mutate({
      protocol: recording.protocol,
      items: recording.items.filter((i) => selected.has(i.animal.id)).map((i) => ({ animal_id: i.animal.id, step: i.step })),
      date: rec.date, medication: med?.name ?? null, medicine_id: med?.id ?? null, medicine_lot_id: rec.medicine_lot_id || null,
      dosage: rec.dosage === '' ? null : Number(rec.dosage), dosage_unit: rec.dosage_unit || null, route: rec.route || null,
      withdrawal_days: rec.withdrawal_days === '' ? null : Number(rec.withdrawal_days),
      administered_by: rec.administered_by.trim() || null, notes: rec.notes.trim() || null,
    }, { onSuccess: () => setRecording(null), onError: (e: any) => setError(e.message) });
  };

  const openRule = (p?: HealthProtocol) => {
    setError('');
    if (!p) return setRule({ ...EMPTY_RULE });
    setRule({
      id: p.id, name: p.name, health_type: p.health_type, medicine_id: p.medicine_id ?? '', default_dose: p.default_dose?.toString() ?? '',
      default_dose_unit: p.default_dose_unit ?? '', route: p.route ?? '', schedule_kind: p.schedule_kind,
      interval_days: p.interval_days?.toString() ?? '56', age_days: (p.age_days ?? [28, 56]).join(', '),
      yearly_month: p.yearly_date?.slice(0, 2) ?? '03', yearly_day: p.yearly_date?.slice(3, 5) ?? '01',
      min_age_days: p.min_age_days?.toString() ?? '', sexes: p.sexes ?? [], categories: p.categories ?? [], herd_id: p.herd_id ?? '',
      group_id: p.group_id ?? '', seasonal: !!p.season_start, season_start: p.season_start ?? '05-01', season_end: p.season_end ?? '10-31',
      lead_days: String(p.lead_days), baseline_date: p.baseline_date ?? '', active: p.active, notes: p.notes ?? '',
    });
  };
  const submitRule = () => {
    if (!rule) return;
    if (!rule.name.trim()) return setError('Give the rule a name, e.g. "CD&T booster".');
    const ageDays = rule.age_days.split(/[,\s]+/).map(Number).filter((n) => Number.isFinite(n) && n >= 0);
    if (rule.schedule_kind === 'age' && ageDays.length === 0) return setError('List the ages in days, e.g. 28, 56.');
    if (rule.schedule_kind === 'interval' && !(Number(rule.interval_days) >= 1)) return setError('How many days between?');
    const seasonOk = /^\d\d-\d\d$/.test(rule.season_start) && /^\d\d-\d\d$/.test(rule.season_end);
    if (rule.seasonal && !seasonOk) return setError('Season dates must look like 05-01 (month-day).');
    saveProtocol.mutate({
      id: rule.id, name: rule.name.trim(), health_type: rule.health_type, medicine_id: rule.medicine_id || null,
      default_dose: rule.default_dose === '' ? null : Number(rule.default_dose), default_dose_unit: rule.default_dose_unit || null,
      route: rule.route || null, schedule_kind: rule.schedule_kind,
      interval_days: rule.schedule_kind === 'interval' ? Number(rule.interval_days) : null,
      age_days: rule.schedule_kind === 'age' ? ageDays : null,
      yearly_date: rule.schedule_kind === 'yearly' ? `${rule.yearly_month}-${rule.yearly_day}` : null,
      min_age_days: rule.min_age_days === '' ? null : Number(rule.min_age_days),
      sexes: rule.sexes.length ? rule.sexes : null, categories: rule.categories.length ? rule.categories : null,
      herd_id: rule.herd_id || null, group_id: rule.group_id || null,
      season_start: rule.seasonal ? rule.season_start : null, season_end: rule.seasonal ? rule.season_end : null,
      lead_days: Number(rule.lead_days) || 0, baseline_date: rule.baseline_date || null, active: rule.active, notes: rule.notes.trim() || null,
    }, { onSuccess: () => setRule(null), onError: (e: any) => setError(e.message) });
  };

  if (isLoading) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Health Schedule</h1>
          <p className="text-gray-500">Vaccines, deworming, hoof trims and checks that are due, based on your rules.</p>
        </div>
        {isManager && (
          <div className="flex gap-2">
            <Button variant="outline" leftIcon={<Settings2 className="h-4 w-4" />} onClick={() => setManageOpen(true)}>Rules ({protocols.length})</Button>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openRule()}>New rule</Button>
          </div>
        )}
      </div>

      {protocols.length === 0 ? (
        <Card>
          <EmptyState icon={<CalendarCheck className="h-10 w-10" />} title="No health rules yet"
            description={isManager ? 'Add rules like “CD&T booster yearly by March 1”, “Kid vaccines at 4 and 8 weeks”, or “Hoof trim every 8 weeks”.' : 'The owner or a manager sets up the health schedule.'}
            action={isManager ? <Button onClick={() => openRule()}>Add the first rule</Button> : undefined} />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="danger">{counts.overdue} overdue</Badge>
            <Badge variant="warning">{counts.due} due today</Badge>
            <Badge variant="info">{counts.upcoming} coming up</Badge>
            <label className="flex items-center gap-2 text-sm text-gray-700 ml-auto">
              <input type="checkbox" checked={showUpcoming} onChange={(e) => setShowUpcoming(e.target.checked)} className="rounded" />
              Show coming up
            </label>
          </div>

          {shownDue.length === 0 ? (
            <Card><EmptyState icon={<CalendarCheck className="h-10 w-10" />} title="All caught up" description="Nothing is due right now." /></Card>
          ) : (
            protocols.filter((p) => byProtocol.has(p.id)).map((p) => {
              const items = byProtocol.get(p.id)!;
              return (
                <Card key={p.id} padding="none">
                  <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-gray-900">{p.name}</h2>
                      <p className="text-xs text-gray-500">{describeProtocol(p)}{p.notes ? ` · ${p.notes}` : ''}</p>
                    </div>
                    <Button size="sm" onClick={() => openRecord(p, items)}>Record as done</Button>
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {items.map((d) => (
                      <li key={`${d.animal.id}-${d.step ?? ''}`} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                        <Link href={`/dashboard/herd/${d.animal.id}`} className="flex-1 min-w-0 text-gray-900 hover:underline truncate">
                          {animalLabel(d.animal)}{d.step != null ? <span className="text-gray-500"> · dose {d.step + 1}</span> : null}
                        </Link>
                        <span className="text-xs text-gray-500 hidden sm:inline">{d.lastDone ? `Last ${format(parseISO(d.lastDone), 'MMM d, yyyy')}` : 'No record yet'}</span>
                        <Badge variant={d.state === 'overdue' ? 'danger' : d.state === 'due' ? 'warning' : 'info'}>
                          {d.state === 'overdue' ? `${d.daysOverdue}d overdue` : d.state === 'due' ? 'Due today' : `Due ${format(parseISO(d.dueDate), 'MMM d')}`}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })
          )}
        </>
      )}

      {/* Record as done */}
      <Modal open={!!recording} onClose={() => setRecording(null)} title={recording ? `Record: ${recording.protocol.name}` : ''} size="lg"
        footer={<><Button variant="ghost" onClick={() => setRecording(null)}>Cancel</Button><Button loading={recordScheduled.isPending} onClick={submitRecord}>Save for {selected.size} animal{selected.size === 1 ? '' : 's'}</Button></>}>
        {recording && (
          <div className="space-y-4">
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
            <fieldset>
              <legend className="text-sm font-medium text-[#384E42] mb-1">Which animals</legend>
              <div className="flex gap-3 mb-2 text-xs">
                <button className="text-[#105040] hover:underline" onClick={() => setSelected(new Set(recording.items.map((i) => i.animal.id)))}>All</button>
                <button className="text-[#105040] hover:underline" onClick={() => setSelected(new Set())}>None</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto">
                {recording.items.map((i) => (
                  <label key={i.animal.id} className="flex items-center gap-2 text-sm rounded-lg border border-[#DDD8D4] px-3 py-1.5 cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" className="rounded" checked={selected.has(i.animal.id)}
                      onChange={() => setSelected((s) => { const n = new Set(s); n.has(i.animal.id) ? n.delete(i.animal.id) : n.add(i.animal.id); return n; })} />
                    <span className="truncate">{animalLabel(i.animal)}{i.step != null ? ` (dose ${i.step + 1})` : ''}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Date done" type="date" max={today} value={rec.date} onChange={(e) => setRec({ ...rec, date: e.target.value })} />
              <Input label="Done by" value={rec.administered_by} onChange={(e) => setRec({ ...rec, administered_by: e.target.value })} placeholder="Name (optional)" />
              {recording.protocol.medicine_id && (
                <Select label="Lot used" value={rec.medicine_lot_id} onChange={(e) => setRec({ ...rec, medicine_lot_id: e.target.value })}
                  options={[{ value: '', label: '—' }, ...lots.filter((l) => l.medicine_id === recording.protocol.medicine_id && l.status === 'in_stock')
                    .map((l) => ({ value: l.id, label: `Lot ${l.lot_number || '—'}${l.expiry_date ? ` · exp. ${l.expiry_date}` : ''}` }))]} />
              )}
              <div className="grid grid-cols-3 gap-2">
                <Input label="Dose" type="number" min="0" step="any" value={rec.dosage} onChange={(e) => setRec({ ...rec, dosage: e.target.value })} />
                <Input label="Unit" value={rec.dosage_unit} onChange={(e) => setRec({ ...rec, dosage_unit: e.target.value })} />
                <Input label="Route" value={rec.route} onChange={(e) => setRec({ ...rec, route: e.target.value })} />
              </div>
              <Input label="Withdrawal (days)" type="number" min="0" value={rec.withdrawal_days} onChange={(e) => setRec({ ...rec, withdrawal_days: e.target.value })} />
              <Input label="Notes" value={rec.notes} onChange={(e) => setRec({ ...rec, notes: e.target.value })} />
            </div>
            <p className="text-xs text-gray-500">Each animal gets its own health record. You&apos;ll see them in the Health Center and on each animal&apos;s page.</p>
          </div>
        )}
      </Modal>

      {/* Manage rules */}
      <Modal open={manageOpen} onClose={() => setManageOpen(false)} title="Health rules" size="lg">
        <ul className="divide-y divide-gray-100">
          {protocols.map((p) => (
            <li key={p.id} className={`py-3 flex items-center gap-3 ${p.active ? '' : 'opacity-60'}`}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{p.name}{!p.active && ' (paused)'}</p>
                <p className="text-xs text-gray-500">{describeProtocol(p)}</p>
              </div>
              <button className="p-1.5 text-gray-400 hover:text-gray-700" aria-label={`Edit ${p.name}`} onClick={() => { setManageOpen(false); openRule(p); }}><Pencil className="h-4 w-4" /></button>
              <button className="p-1.5 text-gray-400 hover:text-red-700" aria-label={`Delete ${p.name}`}
                onClick={() => confirm(`Delete the rule "${p.name}"? Health records already made stay.`) && deleteProtocol.mutate(p.id, { onError: (e: any) => alert(e.message) })}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </Modal>

      {/* Rule form */}
      <Modal open={!!rule} onClose={() => setRule(null)} title={rule?.id ? 'Edit health rule' : 'New health rule'} size="lg"
        footer={<><Button variant="ghost" onClick={() => setRule(null)}>Cancel</Button><Button loading={saveProtocol.isPending} onClick={submitRule}>Save</Button></>}>
        {rule && (
          <div className="space-y-4">
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Name" required value={rule.name} onChange={(e) => setRule({ ...rule, name: e.target.value })} placeholder="e.g. CD&T booster" />
              <Select label="Type" value={rule.health_type} onChange={(e) => setRule({ ...rule, health_type: e.target.value })} options={HEALTH_TYPES} />
              <Select label="Medicine (optional)" value={rule.medicine_id} onChange={(e) => setRule({ ...rule, medicine_id: e.target.value })}
                options={[{ value: '', label: '—' }, ...medicines.filter((m) => m.active).map((m) => ({ value: m.id, label: m.name }))]} />
              <div className="grid grid-cols-3 gap-2">
                <Input label="Dose" type="number" min="0" step="any" value={rule.default_dose} onChange={(e) => setRule({ ...rule, default_dose: e.target.value })} />
                <Input label="Unit" value={rule.default_dose_unit} onChange={(e) => setRule({ ...rule, default_dose_unit: e.target.value })} />
                <Input label="Route" value={rule.route} onChange={(e) => setRule({ ...rule, route: e.target.value })} />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-[#384E42] mb-1">When</p>
              <div className="grid grid-cols-3 gap-2 mb-3" role="radiogroup" aria-label="When">
                {([['interval', 'Every so often'], ['age', 'At certain ages'], ['yearly', 'Once a year']] as [ScheduleKind, string][]).map(([k, label]) => (
                  <button key={k} type="button" role="radio" aria-checked={rule.schedule_kind === k} onClick={() => setRule({ ...rule, schedule_kind: k })}
                    className={`rounded-lg border px-3 py-2 text-sm ${rule.schedule_kind === k ? 'border-[#105040] bg-[#B8DCC8]/30 font-medium' : 'border-[#DDD8D4]'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {rule.schedule_kind === 'interval' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Every how many days" type="number" min="1" value={rule.interval_days} onChange={(e) => setRule({ ...rule, interval_days: e.target.value })} hint="56 = every 8 weeks, 14 = every 2 weeks" />
                  <Input label="Last done for the herd (optional)" type="date" value={rule.baseline_date} onChange={(e) => setRule({ ...rule, baseline_date: e.target.value })} hint="So animals without a record aren't all shown as due today." />
                </div>
              )}
              {rule.schedule_kind === 'age' && (
                <Input label="Ages in days" value={rule.age_days} onChange={(e) => setRule({ ...rule, age_days: e.target.value })} hint="e.g. 28, 56 for 4 and 8 weeks old. Uses each animal's birth date." />
              )}
              {rule.schedule_kind === 'yearly' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select label="Due by (month)" value={rule.yearly_month} onChange={(e) => setRule({ ...rule, yearly_month: e.target.value })}
                    options={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => ({ value: String(i + 1).padStart(2, '0'), label: m }))} />
                  <Select label="Day" value={rule.yearly_day} onChange={(e) => setRule({ ...rule, yearly_day: e.target.value })}
                    options={Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1).padStart(2, '0'), label: String(i + 1) }))} />
                  <Input label="Last done for the herd (optional)" type="date" value={rule.baseline_date} onChange={(e) => setRule({ ...rule, baseline_date: e.target.value })} />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-[#384E42]">Which animals <span className="font-normal text-gray-500">(leave blank for all)</span></p>
              <div className="flex flex-wrap gap-1.5">
                {SEX_OPTIONS.map((o) => (
                  <button key={o.value} type="button" aria-pressed={rule.sexes.includes(o.value)} onClick={() => setRule({ ...rule, sexes: toggle(rule.sexes, o.value) })}
                    className={`px-3 py-1 rounded-full text-xs border ${rule.sexes.includes(o.value) ? 'bg-[#105040] text-white border-[#105040]' : 'border-[#DDD8D4] text-gray-600'}`}>{o.label}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_OPTIONS.map((o) => (
                  <button key={o.value} type="button" aria-pressed={rule.categories.includes(o.value)} onClick={() => setRule({ ...rule, categories: toggle(rule.categories, o.value) })}
                    className={`px-3 py-1 rounded-full text-xs border ${rule.categories.includes(o.value) ? 'bg-[#105040] text-white border-[#105040]' : 'border-[#DDD8D4] text-gray-600'}`}>{o.label}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select label="Herd" value={rule.herd_id} onChange={(e) => setRule({ ...rule, herd_id: e.target.value })}
                  options={[{ value: '', label: 'Any' }, ...(herds as any[]).map((h) => ({ value: h.id, label: h.name }))]} />
                <Select label="Group" value={rule.group_id} onChange={(e) => setRule({ ...rule, group_id: e.target.value })}
                  options={[{ value: '', label: 'Any' }, ...(groups as any[]).map((g) => ({ value: g.id, label: g.name }))]} />
                <Input label="Minimum age (days)" type="number" min="0" value={rule.min_age_days} onChange={(e) => setRule({ ...rule, min_age_days: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Show as coming up (days ahead)" type="number" min="0" max="120" value={rule.lead_days} onChange={(e) => setRule({ ...rule, lead_days: e.target.value })} />
              {rule.schedule_kind === 'interval' && (
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 mt-6">
                    <input type="checkbox" checked={rule.seasonal} onChange={(e) => setRule({ ...rule, seasonal: e.target.checked })} className="rounded" />
                    Only in season
                  </label>
                  {rule.seasonal && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Input aria-label="Season from (MM-DD)" value={rule.season_start} onChange={(e) => setRule({ ...rule, season_start: e.target.value })} placeholder="05-01" />
                      <Input aria-label="Season until (MM-DD)" value={rule.season_end} onChange={(e) => setRule({ ...rule, season_end: e.target.value })} placeholder="10-31" />
                    </div>
                  )}
                </div>
              )}
            </div>
            <Input label="Notes" value={rule.notes} onChange={(e) => setRule({ ...rule, notes: e.target.value })} />
            {rule.id && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={rule.active} onChange={(e) => setRule({ ...rule, active: e.target.checked })} className="rounded" />
                Active (untick to pause)
              </label>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
