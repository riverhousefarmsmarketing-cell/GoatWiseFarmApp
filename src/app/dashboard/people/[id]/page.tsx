'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Plus, Pencil, Trash2, Printer, Wallet, KeyRound } from 'lucide-react';
import { useFarm, useFarmMembers, memberName } from '@/hooks/useFarm';
import {
  PERSON_KIND_LABELS, Person, PersonKind, TimeEntry, useDeletePayment, useDeleteTimeEntry, useMyPerson, usePayments, usePeople,
  usePersonPay, useRecordPayment, useSavePerson, useSavePersonPay, useSaveTimeEntry, useTimeEntries,
} from '@/hooks/usePeople';
import { PAY_TYPE_LABELS, PayType, formatMoney, hoursBetween, summarizePay, weekOf } from '@/lib/pay';
import { localISODate } from '@/lib/chores';
import { Badge, Button, Card, Input, LoadingSpinner, Modal, Select } from '@/components/ui';

type HoursForm = { id?: string; work_date: string; mode: 'times' | 'total'; start_time: string; end_time: string; break_minutes: string; hours: string; task: string; notes: string };

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const today = localISODate();
  const { isManager } = useFarm();
  const { data: members } = useFarmMembers();
  const { data: people = [], isLoading } = usePeople();
  const { data: me } = useMyPerson();
  const { data: payList = [] } = usePersonPay();
  const person = people.find((p) => p.id === id);
  const pay = payList.find((p) => p.person_id === id);

  const [range, setRange] = useState(() => weekOf(today));
  const { data: entries = [] } = useTimeEntries({ personId: id });
  const { data: payments = [] } = usePayments(id);
  const savePerson = useSavePerson();
  const savePay = useSavePersonPay();
  const saveHours = useSaveTimeEntry();
  const deleteHours = useDeleteTimeEntry();
  const recordPayment = useRecordPayment();
  const deletePayment = useDeletePayment();

  const [profile, setProfile] = useState<Person | null>(null);
  const [payForm, setPayForm] = useState<{ pay_type: PayType; rate: string; notes: string } | null>(null);
  const [hours, setHours] = useState<HoursForm | null>(null);
  const [payNow, setPayNow] = useState<{ paid_on: string; amount: string; method: string; notes: string; addToMoney: boolean } | null>(null);
  const [error, setError] = useState('');

  const summary = useMemo(() => summarizePay(entries, range.from, range.to, pay?.pay_type ?? null, pay?.rate ?? null), [entries, range, pay]);
  const inRange = entries.filter((e) => e.work_date >= range.from && e.work_date <= range.to);
  const unpaidTotal = useMemo(() => summarizePay(entries, '0000-01-01', '9999-12-31', pay?.pay_type ?? null, pay?.rate ?? null), [entries, pay]);

  useEffect(() => { setError(''); }, [hours, payNow, profile, payForm]);

  if (isLoading) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;
  if (!person || (!isManager && person.id !== me?.id)) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/people" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"><ArrowLeft className="h-4 w-4" /> People</Link>
        <Card><p className="text-sm text-gray-600">This profile isn&apos;t available.</p></Card>
      </div>
    );
  }

  const shiftWeek = (n: number) => {
    const d = new Date(`${range.from}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n * 7);
    setRange(weekOf(d.toISOString().slice(0, 10)));
  };

  const openHours = (e?: TimeEntry) => setHours(e ? {
    id: e.id, work_date: e.work_date, mode: e.start_time && e.end_time ? 'times' : 'total', start_time: e.start_time?.slice(0, 5) ?? '07:00',
    end_time: e.end_time?.slice(0, 5) ?? '11:00', break_minutes: String(e.break_minutes ?? 0), hours: String(e.hours), task: e.task ?? '', notes: e.notes ?? '',
  } : { work_date: today, mode: 'times', start_time: '07:00', end_time: '11:00', break_minutes: '0', hours: '', task: '', notes: '' });

  const submitHours = () => {
    if (!hours) return;
    const total = hours.mode === 'times' ? hoursBetween(hours.start_time, hours.end_time, Number(hours.break_minutes) || 0) : Number(hours.hours);
    if (!(total > 0 && total <= 24)) return setError('Hours must be between 0 and 24.');
    saveHours.mutate({
      id: hours.id, person_id: person.id, work_date: hours.work_date,
      start_time: hours.mode === 'times' ? hours.start_time : null, end_time: hours.mode === 'times' ? hours.end_time : null,
      break_minutes: hours.mode === 'times' ? Number(hours.break_minutes) || 0 : 0, hours: total,
      task: hours.task.trim() || null, notes: hours.notes.trim() || null,
    }, { onSuccess: () => setHours(null), onError: (e: any) => setError(e.message) });
  };

  return (
    <div className="space-y-6">
      <Link href="/dashboard/people" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"><ArrowLeft className="h-4 w-4" /> People &amp; Hours</Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{person.name}</h1>
            <Badge>{PERSON_KIND_LABELS[person.kind]}</Badge>
            {!person.active && <Badge variant="warning">No longer working</Badge>}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {person.user_id ? <span className="inline-flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" /> Uses the app</span> : 'Doesn’t use the app — print their jobs.'}
            {person.phone ? ` · ${person.phone}` : ''}{person.start_date ? ` · since ${format(parseISO(person.start_date), 'MMM yyyy')}` : ''}
          </p>
          {person.emergency_contact && <p className="text-sm text-gray-500">Emergency contact: {person.emergency_contact}</p>}
          {person.notes && <p className="text-sm text-gray-700 mt-1">{person.notes}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/print/assignments?person=${person.id}`} target="_blank"><Button variant="outline" leftIcon={<Printer className="h-4 w-4" />}>Print their jobs</Button></Link>
          {isManager && <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setProfile({ ...person })}>Edit profile</Button>}
        </div>
      </div>

      {isManager && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">Pay</h2>
              <p className="text-sm text-gray-700">
                {pay ? `${PAY_TYPE_LABELS[pay.pay_type]}${pay.pay_type !== 'unpaid' && pay.rate != null ? `: ${formatMoney(pay.rate)}` : ''}` : 'Not set'}
                {pay?.notes ? ` · ${pay.notes}` : ''}
              </p>
              <p className="text-xs text-gray-500">Only you and managers can see pay.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setPayForm({ pay_type: pay?.pay_type ?? 'hourly', rate: pay?.rate?.toString() ?? '', notes: pay?.notes ?? '' })}>
              {pay ? 'Change' : 'Set pay'}
            </Button>
          </div>
          {unpaidTotal.entries > 0 && (
            <p className="mt-3 text-sm text-[#5E1840]">
              Unpaid so far: {unpaidTotal.hours} h{unpaidTotal.amount != null && pay?.pay_type !== 'unpaid' ? ` · ${formatMoney(unpaidTotal.amount)}` : ''}
            </p>
          )}
        </Card>
      )}

      <Card padding="none">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => shiftWeek(-1)} aria-label="Previous week">‹</Button>
            <h2 className="font-semibold text-gray-900">Week of {format(parseISO(range.from), 'MMM d')} – {format(parseISO(range.to), 'MMM d')}</h2>
            <Button size="sm" variant="ghost" onClick={() => shiftWeek(1)} aria-label="Next week">›</Button>
          </div>
          <p className="text-sm text-gray-600 sm:ml-auto">
            {inRange.reduce((s, e) => s + Number(e.hours), 0).toFixed(2)} h
            {isManager && summary.amount != null && pay?.pay_type !== 'unpaid' ? ` · unpaid ${formatMoney(summary.amount)}` : ''}
          </p>
          <div className="flex gap-2">
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => openHours()}>Add hours</Button>
            {isManager && summary.entries > 0 && pay?.pay_type !== 'unpaid' && (
              <Button size="sm" variant="outline" leftIcon={<Wallet className="h-4 w-4" />}
                onClick={() => setPayNow({ paid_on: today, amount: summary.amount?.toFixed(2) ?? '', method: '', notes: '', addToMoney: true })}>
                Record payment
              </Button>
            )}
          </div>
        </div>
        {inRange.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-500">No hours this week.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {inRange.map((e) => {
              const editable = isManager || !e.paid_payment_id;
              return (
                <li key={e.id} className="px-5 py-3 flex items-start gap-3 text-sm">
                  <div className="w-24 flex-shrink-0 text-gray-700">{format(parseISO(e.work_date), 'EEE, MMM d')}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900">
                      <span className="font-medium">{Number(e.hours)} h</span>
                      {e.start_time && e.end_time ? <span className="text-gray-500"> · {e.start_time.slice(0, 5)}–{e.end_time.slice(0, 5)}{e.break_minutes ? `, ${e.break_minutes} min break` : ''}</span> : null}
                      {e.task ? ` · ${e.task}` : ''}
                    </p>
                    {e.notes && <p className="text-xs text-gray-600">{e.notes}</p>}
                    <p className="text-xs text-gray-400">Entered by {memberName(members, e.user_id)}</p>
                  </div>
                  {e.paid_payment_id && <Badge variant="success">Paid</Badge>}
                  {editable && (
                    <div className="flex gap-0.5">
                      <button className="p-1 text-gray-400 hover:text-gray-700" aria-label="Edit hours" onClick={() => openHours(e)}><Pencil className="h-4 w-4" /></button>
                      <button className="p-1 text-gray-400 hover:text-red-700" aria-label="Delete hours"
                        onClick={() => confirm('Delete these hours?') && deleteHours.mutate(e.id, { onError: (err: any) => alert(err.message) })}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {(isManager || payments.length > 0) && (
        <Card padding="none">
          <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Payments</h2></div>
          {payments.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-500">No payments recorded.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {payments.map((p) => (
                <li key={p.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900"><span className="font-medium">{formatMoney(Number(p.amount))}</span> on {format(parseISO(p.paid_on), 'MMM d, yyyy')}{p.method ? ` · ${p.method}` : ''}</p>
                    <p className="text-xs text-gray-500">
                      {p.period_start && p.period_end ? `For ${format(parseISO(p.period_start), 'MMM d')} – ${format(parseISO(p.period_end), 'MMM d')}` : ''}
                      {p.hours != null ? ` · ${p.hours} h` : ''}{p.notes ? ` · ${p.notes}` : ''}{p.transaction_id ? ' · in Money' : ''}
                    </p>
                  </div>
                  {isManager && (
                    <button className="p-1 text-gray-400 hover:text-red-700" aria-label="Delete payment"
                      onClick={() => confirm('Delete this payment? The hours it covered go back to unpaid. (A matching Money entry, if any, stays — remove it in Money.)') && deletePayment.mutate(p.id, { onError: (err: any) => alert(err.message) })}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Hours form */}
      <Modal open={!!hours} onClose={() => setHours(null)} title={hours?.id ? 'Edit hours' : `Add hours for ${person.name}`}
        footer={<><Button variant="ghost" onClick={() => setHours(null)}>Cancel</Button><Button loading={saveHours.isPending} onClick={submitHours}>Save</Button></>}>
        {hours && (
          <div className="space-y-3">
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
            <Input label="Date" type="date" max={today} value={hours.work_date} onChange={(e) => setHours({ ...hours, work_date: e.target.value })} />
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How to enter">
              {([['times', 'Start and end'], ['total', 'Total hours']] as const).map(([m, label]) => (
                <button key={m} type="button" role="radio" aria-checked={hours.mode === m} onClick={() => setHours({ ...hours, mode: m })}
                  className={`rounded-lg border px-3 py-2 text-sm ${hours.mode === m ? 'border-[#105040] bg-[#B8DCC8]/30 font-medium' : 'border-[#DDD8D4]'}`}>{label}</button>
              ))}
            </div>
            {hours.mode === 'times' ? (
              <div className="grid grid-cols-3 gap-2">
                <Input label="Start" type="time" value={hours.start_time} onChange={(e) => setHours({ ...hours, start_time: e.target.value })} />
                <Input label="End" type="time" value={hours.end_time} onChange={(e) => setHours({ ...hours, end_time: e.target.value })} />
                <Input label="Break (min)" type="number" min="0" value={hours.break_minutes} onChange={(e) => setHours({ ...hours, break_minutes: e.target.value })} />
                <p className="col-span-3 text-sm text-gray-600">= {hoursBetween(hours.start_time, hours.end_time, Number(hours.break_minutes) || 0)} hours</p>
              </div>
            ) : (
              <Input label="Hours" type="number" min="0.25" max="24" step="0.25" value={hours.hours} onChange={(e) => setHours({ ...hours, hours: e.target.value })} />
            )}
            <Input label="What they worked on" value={hours.task} onChange={(e) => setHours({ ...hours, task: e.target.value })} placeholder="e.g. Morning chores, fencing" />
            <Input label="Notes" value={hours.notes} onChange={(e) => setHours({ ...hours, notes: e.target.value })} />
          </div>
        )}
      </Modal>

      {/* Record payment */}
      <Modal open={!!payNow} onClose={() => setPayNow(null)} title={`Pay ${person.name}`}
        footer={<>
          <Button variant="ghost" onClick={() => setPayNow(null)}>Cancel</Button>
          <Button loading={recordPayment.isPending} onClick={() => {
            if (!payNow) return;
            const amount = Number(payNow.amount);
            if (!(amount >= 0) || payNow.amount === '') return setError('Enter the amount paid.');
            recordPayment.mutate({ person, paid_on: payNow.paid_on, amount, period_start: range.from, period_end: range.to, hours: summary.hours,
              method: payNow.method.trim() || null, notes: payNow.notes.trim() || null, addToMoney: payNow.addToMoney },
              { onSuccess: () => setPayNow(null), onError: (e: any) => setError(e.message) });
          }}>Record payment</Button>
        </>}>
        {payNow && (
          <div className="space-y-3">
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
            <p className="text-sm text-gray-700">
              For {format(parseISO(range.from), 'MMM d')} – {format(parseISO(range.to), 'MMM d')}: {summary.hours} unpaid hours
              {summary.amount != null ? ` (${formatMoney(summary.amount)} at their rate)` : ''}. These hours will be marked paid.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Amount paid" type="number" min="0" step="0.01" value={payNow.amount} onChange={(e) => setPayNow({ ...payNow, amount: e.target.value })} />
              <Input label="Date paid" type="date" value={payNow.paid_on} onChange={(e) => setPayNow({ ...payNow, paid_on: e.target.value })} />
              <Input label="How" value={payNow.method} onChange={(e) => setPayNow({ ...payNow, method: e.target.value })} placeholder="Cash, check #123, Venmo" />
              <Input label="Notes" value={payNow.notes} onChange={(e) => setPayNow({ ...payNow, notes: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={payNow.addToMoney} onChange={(e) => setPayNow({ ...payNow, addToMoney: e.target.checked })} className="rounded" />
              Also add to Money as a labor expense
            </label>
            <p className="text-xs text-gray-500">This is a record for you; it doesn&apos;t work out taxes or withholding.</p>
          </div>
        )}
      </Modal>

      {/* Pay settings */}
      <Modal open={!!payForm} onClose={() => setPayForm(null)} title={`Pay for ${person.name}`}
        footer={<>
          <Button variant="ghost" onClick={() => setPayForm(null)}>Cancel</Button>
          <Button loading={savePay.isPending} onClick={() => payForm && savePay.mutate({ person_id: person.id, pay_type: payForm.pay_type,
            rate: payForm.pay_type === 'unpaid' || payForm.rate === '' ? null : Number(payForm.rate), notes: payForm.notes.trim() || null },
            { onSuccess: () => setPayForm(null), onError: (e: any) => setError(e.message) })}>Save</Button>
        </>}>
        {payForm && (
          <div className="space-y-3">
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
            <Select label="How they're paid" value={payForm.pay_type} onChange={(e) => setPayForm({ ...payForm, pay_type: e.target.value as PayType })}
              options={(Object.keys(PAY_TYPE_LABELS) as PayType[]).map((t) => ({ value: t, label: PAY_TYPE_LABELS[t] }))} />
            {payForm.pay_type !== 'unpaid' && (
              <Input label={payForm.pay_type === 'hourly' ? 'Rate per hour' : payForm.pay_type === 'daily' ? 'Rate per day' : payForm.pay_type === 'per_task' ? 'Rate per job' : 'Amount per pay period'}
                type="number" min="0" step="0.01" value={payForm.rate} onChange={(e) => setPayForm({ ...payForm, rate: e.target.value })} />
            )}
            <Input label="Notes" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} placeholder="e.g. Paid every other Friday" />
          </div>
        )}
      </Modal>

      {/* Profile */}
      <Modal open={!!profile} onClose={() => setProfile(null)} title={`Edit ${person.name}`} size="lg"
        footer={<>
          <Button variant="ghost" onClick={() => setProfile(null)}>Cancel</Button>
          <Button loading={savePerson.isPending} onClick={() => {
            if (!profile?.name.trim()) return setError('Name is required.');
            const { user_id, ...rest } = profile;
            savePerson.mutate({ ...rest, name: profile.name.trim(), start_date: profile.start_date || null, end_date: profile.end_date || null }, { onSuccess: () => setProfile(null), onError: (e: any) => setError(e.message) });
          }}>Save</Button>
        </>}>
        {profile && (
          <div className="space-y-3">
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Name" required value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              <Select label="Who they are" value={profile.kind} onChange={(e) => setProfile({ ...profile, kind: e.target.value as PersonKind })}
                options={(Object.keys(PERSON_KIND_LABELS) as PersonKind[]).map((k) => ({ value: k, label: PERSON_KIND_LABELS[k] }))} />
              <Input label="Phone" type="tel" value={profile.phone ?? ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              <Input label="Email" type="email" value={profile.email ?? ''} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              <Input label="Emergency contact" value={profile.emergency_contact ?? ''} onChange={(e) => setProfile({ ...profile, emergency_contact: e.target.value })} placeholder="Name and phone" />
              <Input label="Started" type="date" value={profile.start_date ?? ''} onChange={(e) => setProfile({ ...profile, start_date: e.target.value })} />
            </div>
            <Input label="Notes" value={profile.notes ?? ''} onChange={(e) => setProfile({ ...profile, notes: e.target.value })} />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={profile.active} onChange={(e) => setProfile({ ...profile, active: e.target.checked, end_date: e.target.checked ? null : (profile.end_date || today) })} className="rounded" />
              Still working here
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
