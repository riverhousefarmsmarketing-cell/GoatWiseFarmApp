'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, Plus, KeyRound, Printer, ChevronRight } from 'lucide-react';
import { useFarm } from '@/hooks/useFarm';
import { PERSON_KIND_LABELS, PersonKind, useMyPerson, usePeople, usePersonPay, useSavePerson, useTimeEntries } from '@/hooks/usePeople';
import { PAY_TYPE_LABELS, formatMoney, round2, weekOf } from '@/lib/pay';
import { localISODate } from '@/lib/chores';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner, Modal, Select } from '@/components/ui';

export default function PeoplePage() {
  const today = localISODate();
  const week = weekOf(today);
  const { isManager } = useFarm();
  const { data: people = [], isLoading } = usePeople();
  const { data: me } = useMyPerson();
  const { data: pay = [] } = usePersonPay();
  const { data: weekHours = [] } = useTimeEntries({ from: week.from, to: week.to });
  const save = useSavePerson();

  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState<{ name: string; kind: PersonKind; phone: string } | null>(null);

  const hoursByPerson = useMemo(() => {
    const m = new Map<string, number>();
    weekHours.forEach((e) => m.set(e.person_id, (m.get(e.person_id) ?? 0) + Number(e.hours)));
    return m;
  }, [weekHours]);

  const shown = people.filter((p) => showInactive || p.active);

  if (isLoading) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">People &amp; Hours</h1>
          <p className="text-gray-500">
            {isManager ? 'Everyone who works on the farm, with or without the app: hours, pay and printable job sheets.' : 'Who works here, and your own hours.'}
          </p>
        </div>
        <div className="flex gap-2">
          {me && !isManager && <Link href={`/dashboard/people/${me.id}`}><Button>My hours</Button></Link>}
          {isManager && <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setForm({ name: '', kind: 'family', phone: '' })}>Add person</Button>}
        </div>
      </div>

      {people.length === 0 ? (
        <Card><EmptyState icon={<Users className="h-10 w-10" />} title="No one yet" /></Card>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-gray-100">
            {shown.map((p) => {
              const canOpen = isManager || p.id === me?.id;
              const pp = pay.find((x) => x.person_id === p.id);
              const hrs = round2(hoursByPerson.get(p.id) ?? 0);
              const row = (
                <div className="px-5 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#B8DCC8] text-[#0A3228] flex items-center justify-center font-medium flex-shrink-0">{p.name[0]?.toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 truncate">{p.name}{p.id === me?.id ? <span className="text-gray-400 font-normal"> (you)</span> : null}</p>
                      <Badge>{PERSON_KIND_LABELS[p.kind]}</Badge>
                      {!p.active && <Badge variant="warning">No longer working</Badge>}
                      {p.user_id ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#105040]"><KeyRound className="h-3 w-3" /> Has the app</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Printer className="h-3 w-3" /> Paper sheets</span>
                      )}
                    </div>
                    {(isManager || p.id === me?.id) && (
                      <p className="text-xs text-gray-500">
                        This week: {hrs} h
                        {isManager && pp ? ` · ${PAY_TYPE_LABELS[pp.pay_type]}${pp.rate != null && pp.pay_type !== 'unpaid' ? ` ${formatMoney(pp.rate)}` : ''}` : ''}
                      </p>
                    )}
                  </div>
                  {canOpen && <ChevronRight className="h-4 w-4 text-gray-400" />}
                </div>
              );
              return <li key={p.id}>{canOpen ? <Link href={`/dashboard/people/${p.id}`} className="block hover:bg-gray-50">{row}</Link> : row}</li>;
            })}
          </ul>
        </Card>
      )}

      {people.some((p) => !p.active) && (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
          Show people who no longer work here
        </label>
      )}

      {isManager && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-1">Printable sheets</h2>
          <p className="text-sm text-gray-600 mb-3">For anyone who won&apos;t use the app: print the day&apos;s chores or the week&apos;s grid, tick it off on paper, then enter it back in.</p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/print/day?date=${today}`} target="_blank"><Button variant="outline" leftIcon={<Printer className="h-4 w-4" />}>Today&apos;s sheet</Button></Link>
            <Link href={`/print/week?start=${week.from}`} target="_blank"><Button variant="outline" leftIcon={<Printer className="h-4 w-4" />}>This week&apos;s chore grid</Button></Link>
          </div>
        </Card>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title="Add a person"
        footer={<>
          <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
          <Button loading={save.isPending} onClick={() => {
            if (!form?.name.trim()) return;
            save.mutate({ name: form.name.trim(), kind: form.kind, phone: form.phone.trim() || null }, {
              onSuccess: (id) => { setForm(null); window.location.href = `/dashboard/people/${id}`; },
              onError: (e: any) => alert(e.message),
            });
          }}>Add</Button>
        </>}>
        {form && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">For family and helpers who don&apos;t use the app. (People who join with an invite link get a profile automatically.)</p>
            <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Grandpa Joe" />
            <Select label="Who they are" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as PersonKind })}
              options={(Object.keys(PERSON_KIND_LABELS) as PersonKind[]).map((k) => ({ value: k, label: PERSON_KIND_LABELS[k] }))} />
            <Input label="Phone (optional)" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        )}
      </Modal>
    </div>
  );
}
