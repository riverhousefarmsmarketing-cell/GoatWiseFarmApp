'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Syringe, Plus, Square, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFarm, useFarmMembers, memberName } from '@/hooks/useFarm';
import {
  TreatmentCourse, animalLabel, courseSlots, useCourseDoses, useGiveDose, useMedicineLots, useMedicines,
  useScheduleAnimals, useStartCourse, useStopCourse, useTreatmentCourses, useUndoDose,
} from '@/hooks/useAnimalHealth';
import { formatSlot, localISODate } from '@/lib/chores';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner, Modal, Select } from '@/components/ui';
import { DoseCell } from '@/components/farm/DoseCell';

type CourseForm = {
  animal_id: string; medicine_id: string; medicine_lot_id: string; medication: string; reason: string; dose: string; dose_unit: string;
  route: string; times: string[]; every_n_days: string; start_date: string; days: string; withdrawal_days: string; prescribed_by: string; notes: string;
};

export default function TreatmentsPage() {
  const today = localISODate();
  const { user } = useAuth();
  const { isManager } = useFarm();
  const { data: members } = useFarmMembers();
  const [showFinished, setShowFinished] = useState(false);
  const { data: courses = [], isLoading } = useTreatmentCourses({ includeFinished: showFinished });
  const { data: doses = [] } = useCourseDoses(courses.map((c) => c.id));
  const { data: animals = [] } = useScheduleAnimals();
  const { data: medicines = [] } = useMedicines();
  const { data: lots = [] } = useMedicineLots();
  const start = useStartCourse();
  const stop = useStopCourse();
  const give = useGiveDose();
  const undo = useUndoDose();

  const [form, setForm] = useState<CourseForm | null>(null);
  const [error, setError] = useState('');

  const doseMap = useMemo(() => new Map(doses.map((d) => [`${d.course_id}|${d.dose_date}|${d.slot}`, d])), [doses]);

  const giveDose = (c: TreatmentCourse, date: string, slot: string) => {
    const amountStr = window.prompt(`${c.medication} for ${animalLabel(c.animals)} — ${formatSlot(slot)}, ${format(parseISO(date), 'MMM d')}.\n\nAmount given (${c.dose_unit ?? 'units'}):`, c.dose?.toString() ?? '');
    if (amountStr === null) return;
    const note = window.prompt('Note? (optional)', '');
    if (note === null) return;
    give.mutate({ course_id: c.id, dose_date: date, slot, amount: amountStr.trim() === '' ? null : Number(amountStr), dose_unit: c.dose_unit, medicine_lot_id: c.medicine_lot_id, note },
      { onError: (e: any) => alert(e.message) });
  };
  const skipDose = (c: TreatmentCourse, date: string, slot: string) => {
    const reason = window.prompt(`Skip the ${formatSlot(slot)} dose for ${animalLabel(c.animals)}? Why?`, '');
    if (reason === null) return;
    give.mutate({ course_id: c.id, dose_date: date, slot, skipped: true, note: reason || 'Skipped' }, { onError: (e: any) => alert(e.message) });
  };

  const openNew = () => {
    setError('');
    setForm({ animal_id: '', medicine_id: '', medicine_lot_id: '', medication: '', reason: '', dose: '', dose_unit: 'ml', route: '',
      times: ['08:00', '18:00'], every_n_days: '1', start_date: today, days: '5', withdrawal_days: '', prescribed_by: '', notes: '' });
  };
  const pickMedicine = (id: string) => {
    if (!form) return;
    const m = medicines.find((x) => x.id === id);
    const inStock = lots.filter((l) => l.medicine_id === id && l.status === 'in_stock').sort((a, b) => (a.expiry_date ?? '9999').localeCompare(b.expiry_date ?? '9999'));
    setForm({
      ...form, medicine_id: id, medicine_lot_id: inStock[0]?.id ?? '',
      medication: m?.name ?? form.medication, dose: m?.default_dose?.toString() ?? form.dose,
      dose_unit: m?.default_dose_unit ?? form.dose_unit, route: m?.route ?? form.route,
      withdrawal_days: m ? String(Math.max(m.meat_withdrawal_days ?? 0, m.milk_withdrawal_days ?? 0) || '') : form.withdrawal_days,
    });
  };
  const submit = () => {
    if (!form) return;
    if (!form.animal_id) return setError('Choose the animal.');
    if (!form.medication.trim()) return setError('Say what medicine is being given.');
    if (form.times.filter(Boolean).length === 0) return setError('Add at least one time of day.');
    const days = Number(form.days);
    if (!(days >= 1 && days <= 365)) return setError('Days must be between 1 and 365.');
    start.mutate({
      animal_id: form.animal_id, medicine_id: form.medicine_id || null, medicine_lot_id: form.medicine_lot_id || null,
      medication: form.medication.trim(), reason: form.reason.trim() || null, dose: form.dose === '' ? null : Number(form.dose),
      dose_unit: form.dose_unit.trim() || null, route: form.route.trim() || null, times: form.times.filter(Boolean),
      every_n_days: Number(form.every_n_days) || 1, start_date: form.start_date, days,
      withdrawal_days: form.withdrawal_days === '' ? null : Number(form.withdrawal_days),
      prescribed_by: form.prescribed_by.trim() || null, notes: form.notes.trim() || null,
    }, { onSuccess: () => setForm(null), onError: (e: any) => setError(e.message) });
  };

  const active = courses.filter((c) => c.status === 'active');
  const finished = courses.filter((c) => c.status !== 'active');

  const renderCourse = (c: TreatmentCourse) => {
    const slots = courseSlots(c);
    const given = slots.filter((s) => doseMap.has(`${c.id}|${s.date}|${s.slot}`)).length;
    const byDate = new Map<string, string[]>();
    slots.forEach((s) => byDate.set(s.date, [...(byDate.get(s.date) ?? []), s.slot]));
    const lastDay = slots[slots.length - 1]?.date;
    return (
      <Card key={c.id} padding="none">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/dashboard/herd/${c.animal_id}`} className="font-semibold text-gray-900 hover:underline">{animalLabel(c.animals)}</Link>
              <span className="text-gray-700">— {c.medication}{c.dose != null ? ` ${c.dose} ${c.dose_unit ?? ''}` : ''}{c.route ? ` ${c.route}` : ''}</span>
              {c.status === 'completed' && <Badge variant="success">Completed</Badge>}
              {c.status === 'stopped' && <Badge>Stopped</Badge>}
            </div>
            <p className="text-sm text-gray-600">
              {c.reason ? `${c.reason} · ` : ''}{c.times.map(formatSlot).join(' & ')}{c.every_n_days > 1 ? `, every ${c.every_n_days} days` : ''} ·{' '}
              {format(parseISO(c.start_date), 'MMM d')} – {lastDay ? format(parseISO(lastDay), 'MMM d') : ''} · {given} of {slots.length} doses
            </p>
            {c.withdrawal_days ? (
              <p className="text-xs text-[#9B1C1C]">Withdrawal {c.withdrawal_days} days after the last dose{lastDay ? ` (until ${format(new Date(Date.parse(lastDay) + c.withdrawal_days * 86_400_000), 'MMM d')})` : ''}</p>
            ) : null}
            <p className="text-xs text-gray-500">
              Started by {memberName(members, c.user_id)}{c.prescribed_by ? ` · prescribed by ${c.prescribed_by}` : ''}
              {c.status === 'stopped' && c.stopped_at ? ` · stopped by ${memberName(members, c.stopped_by)} ${format(new Date(c.stopped_at), 'MMM d')}${c.stopped_reason ? ` (“${c.stopped_reason}”)` : ''}` : ''}
            </p>
            {c.notes && <p className="text-xs text-gray-600 mt-0.5">{c.notes}</p>}
          </div>
          {c.status === 'active' && (
            <Button size="sm" variant="ghost" leftIcon={<Square className="h-4 w-4" />} onClick={() => {
              const reason = window.prompt('Stop this treatment early? Reason (optional):', '');
              if (reason !== null) stop.mutate({ id: c.id, reason: reason || null }, { onError: (e: any) => alert(e.message) });
            }}>Stop early</Button>
          )}
        </div>
        <div className="px-5 py-3 space-y-2">
          {Array.from(byDate.entries()).map(([date, daySlots]) => (
            <div key={date} className="flex flex-col sm:flex-row sm:items-start gap-2">
              <p className={`text-sm w-28 flex-shrink-0 pt-1.5 ${date === today ? 'font-semibold text-[#105040]' : 'text-gray-600'}`}>
                {date === today ? 'Today' : format(parseISO(date), 'EEE, MMM d')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 flex-1">
                {daySlots.map((slot) => {
                  const dose = doseMap.get(`${c.id}|${date}|${slot}`);
                  return (
                    <DoseCell key={slot} course={c} date={date} slot={slot} dose={dose} today={today} members={members}
                      canUndo={!!dose && !(dose as any).pending && (dose.user_id === user?.id || isManager)}
                      onGive={() => c.status !== 'stopped' && giveDose(c, date, slot)}
                      onSkip={() => c.status !== 'stopped' && skipDose(c, date, slot)}
                      onUndo={() => dose && undo.mutate(dose.id, { onError: (e: any) => alert(e.message) })} />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Treatments</h1>
          <p className="text-gray-500">Courses of medicine. Tick each dose when it&apos;s given; missed doses show in red.</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openNew}>Start a treatment</Button>
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center"><LoadingSpinner /></div>
      ) : (
        <>
          {active.length === 0 ? (
            <Card><EmptyState icon={<Syringe className="h-10 w-10" />} title="No treatments going on" description="Start one when an animal needs a course of medicine." /></Card>
          ) : (
            <div className="space-y-4">{active.map(renderCourse)}</div>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={showFinished} onChange={(e) => setShowFinished(e.target.checked)} className="rounded" />
            Show finished and stopped treatments
          </label>
          {showFinished && finished.length > 0 && <div className="space-y-4">{finished.map(renderCourse)}</div>}
        </>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title="Start a treatment" size="lg"
        footer={<><Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button loading={start.isPending} onClick={submit}>Start</Button></>}>
        {form && (
          <div className="space-y-3">
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
            <Select label="Animal" required value={form.animal_id} onChange={(e) => setForm({ ...form, animal_id: e.target.value })}
              options={[{ value: '', label: 'Choose…' }, ...animals.map((a) => ({ value: a.id, label: animalLabel(a) }))]} />
            <Input label="What it's for" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Mastitis, left side" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="From the medicine cabinet" value={form.medicine_id} onChange={(e) => pickMedicine(e.target.value)}
                options={[{ value: '', label: 'Not in the cabinet (type below)' }, ...medicines.filter((m) => m.active).map((m) => ({ value: m.id, label: m.name }))]} />
              {form.medicine_id ? (
                <Select label="Lot" value={form.medicine_lot_id} onChange={(e) => setForm({ ...form, medicine_lot_id: e.target.value })}
                  options={[{ value: '', label: '—' }, ...lots.filter((l) => l.medicine_id === form.medicine_id && l.status === 'in_stock')
                    .map((l) => ({ value: l.id, label: `Lot ${l.lot_number || '—'}${l.expiry_date ? ` · exp. ${l.expiry_date}` : ''}` }))]} />
              ) : (
                <Input label="Medicine" required value={form.medication} onChange={(e) => setForm({ ...form, medication: e.target.value })} />
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Dose" type="number" min="0" step="any" value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} />
              <Input label="Unit" value={form.dose_unit} onChange={(e) => setForm({ ...form, dose_unit: e.target.value })} />
              <Input label="Route" value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} placeholder="IM, SQ, oral" />
            </div>
            <div>
              <p className="block text-sm font-medium text-[#384E42] mb-1">Times each day</p>
              <div className="flex flex-wrap gap-2 items-center">
                {form.times.map((t, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input type="time" value={t} aria-label={`Time ${i + 1}`} onChange={(e) => setForm({ ...form, times: form.times.map((x, j) => (j === i ? e.target.value : x)) })}
                      className="rounded-lg border border-[#DDD8D4] px-2 py-1.5 text-sm" />
                    {form.times.length > 1 && (
                      <button type="button" className="p-1 text-gray-400 hover:text-gray-700" aria-label="Remove time" onClick={() => setForm({ ...form, times: form.times.filter((_, j) => j !== i) })}>
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <Button type="button" size="sm" variant="ghost" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setForm({ ...form, times: [...form.times, '12:00'] })}>Add time</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="Start date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              <Input label="For how many days" type="number" min="1" max="365" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
              <Select label="How often" value={form.every_n_days} onChange={(e) => setForm({ ...form, every_n_days: e.target.value })}
                options={[{ value: '1', label: 'Every day' }, { value: '2', label: 'Every other day' }, { value: '3', label: 'Every 3 days' }, { value: '7', label: 'Once a week' }]} />
              <Input label="Withdrawal (days after last dose)" type="number" min="0" value={form.withdrawal_days} onChange={(e) => setForm({ ...form, withdrawal_days: e.target.value })} />
              <Input label="Prescribed by" value={form.prescribed_by} onChange={(e) => setForm({ ...form, prescribed_by: e.target.value })} placeholder="e.g. Dr. Smith" />
            </div>
            <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Rotate injection sides" />
          </div>
        )}
      </Modal>
    </div>
  );
}
