'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Pill, Plus, Pencil, Snowflake, PackageMinus, AlertTriangle } from 'lucide-react';
import { useFarm } from '@/hooks/useFarm';
import {
  MEDICINE_KIND_LABELS, Medicine, MedicineKind, MedicineLot, expiryState,
  useDeleteLot, useMedicineLots, useMedicines, useSaveLot, useSaveMedicine,
} from '@/hooks/useAnimalHealth';
import { useFlagRestock, useRestockRequests } from '@/hooks/useRestock';
import { localISODate } from '@/lib/chores';
import { notify } from '@/components/ui/toast';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner, Modal, Select } from '@/components/ui';

type MedForm = {
  id?: string; name: string; kind: MedicineKind; active_ingredient: string; dose_notes: string; default_dose: string;
  default_dose_unit: string; route: string; stock_unit: string; meat_withdrawal_days: string; milk_withdrawal_days: string;
  storage: 'room' | 'fridge' | 'freezer'; prescription_required: boolean; low_stock_level: string; active: boolean; notes: string;
};
type LotForm = {
  id?: string; medicine_id: string; lot_number: string; expiry_date: string; quantity_received: string;
  quantity_remaining: string; received_on: string; supplier: string; cost: string; status: MedicineLot['status']; notes: string;
};

const num = (s: string) => (s.trim() === '' ? null : Number(s));
const str = (s: string) => s.trim() || null;

export default function MedicineCabinetPage() {
  const today = localISODate();
  const { isManager } = useFarm();
  const { data: medicines = [], isLoading } = useMedicines();
  const { data: lots = [] } = useMedicineLots();
  const { data: restock = [] } = useRestockRequests();
  const saveMedicine = useSaveMedicine();
  const saveLot = useSaveLot();
  const deleteLot = useDeleteLot();
  const flagRestock = useFlagRestock();

  const [showInactive, setShowInactive] = useState(false);
  const [med, setMed] = useState<MedForm | null>(null);
  const [lot, setLot] = useState<LotForm | null>(null);
  const [error, setError] = useState('');

  const lotsByMed = useMemo(() => {
    const m = new Map<string, MedicineLot[]>();
    lots.forEach((l) => m.set(l.medicine_id, [...(m.get(l.medicine_id) ?? []), l]));
    return m;
  }, [lots]);

  const onHand = (medId: string) =>
    (lotsByMed.get(medId) ?? []).filter((l) => l.status === 'in_stock').reduce((s, l) => s + (l.quantity_remaining ?? 0), 0);
  const isLow = (m: Medicine) => m.low_stock_level != null && onHand(m.id) <= m.low_stock_level;
  const onRestockList = (m: Medicine) =>
    restock.some((r) => (r.status === 'open' || r.status === 'ordered') && (r.item_name.toLowerCase() === m.name.toLowerCase()));

  const expired = lots.filter((l) => expiryState(l, today) === 'expired');
  const expiringSoon = lots.filter((l) => expiryState(l, today) === 'soon');
  const shown = medicines.filter((m) => showInactive || m.active);

  const openNewMed = () => {
    setError('');
    setMed({ name: '', kind: 'other', active_ingredient: '', dose_notes: '', default_dose: '', default_dose_unit: 'ml', route: '',
      stock_unit: 'ml', meat_withdrawal_days: '', milk_withdrawal_days: '', storage: 'room', prescription_required: false,
      low_stock_level: '', active: true, notes: '' });
  };
  const openEditMed = (m: Medicine) => {
    setError('');
    setMed({ id: m.id, name: m.name, kind: m.kind, active_ingredient: m.active_ingredient ?? '', dose_notes: m.dose_notes ?? '',
      default_dose: m.default_dose?.toString() ?? '', default_dose_unit: m.default_dose_unit ?? '', route: m.route ?? '',
      stock_unit: m.stock_unit, meat_withdrawal_days: m.meat_withdrawal_days?.toString() ?? '',
      milk_withdrawal_days: m.milk_withdrawal_days?.toString() ?? '', storage: m.storage, prescription_required: m.prescription_required,
      low_stock_level: m.low_stock_level?.toString() ?? '', active: m.active, notes: m.notes ?? '' });
  };
  const submitMed = () => {
    if (!med?.name.trim()) return setError('Give the medicine a name.');
    saveMedicine.mutate({
      id: med.id, name: med.name.trim(), kind: med.kind, active_ingredient: str(med.active_ingredient), dose_notes: str(med.dose_notes),
      default_dose: num(med.default_dose), default_dose_unit: str(med.default_dose_unit), route: str(med.route),
      stock_unit: med.stock_unit.trim() || 'ml', meat_withdrawal_days: num(med.meat_withdrawal_days),
      milk_withdrawal_days: num(med.milk_withdrawal_days), storage: med.storage, prescription_required: med.prescription_required,
      low_stock_level: num(med.low_stock_level), active: med.active, notes: str(med.notes),
    }, {
      onSuccess: () => setMed(null),
      onError: (e: any) => setError(/duplicate|unique/i.test(e.message) ? 'There is already a medicine with that name.' : e.message),
    });
  };

  const openNewLot = (medicineId: string) => {
    setError('');
    setLot({ medicine_id: medicineId, lot_number: '', expiry_date: '', quantity_received: '', quantity_remaining: '', received_on: today,
      supplier: '', cost: '', status: 'in_stock', notes: '' });
  };
  const openEditLot = (l: MedicineLot) => {
    setError('');
    setLot({ id: l.id, medicine_id: l.medicine_id, lot_number: l.lot_number ?? '', expiry_date: l.expiry_date ?? '',
      quantity_received: l.quantity_received?.toString() ?? '', quantity_remaining: l.quantity_remaining?.toString() ?? '',
      received_on: l.received_on ?? '', supplier: l.supplier ?? '', cost: l.cost?.toString() ?? '', status: l.status, notes: l.notes ?? '' });
  };
  const submitLot = () => {
    if (!lot) return;
    const received = num(lot.quantity_received);
    const remaining = lot.id ? num(lot.quantity_remaining) : (num(lot.quantity_remaining) ?? received);
    saveLot.mutate({
      id: lot.id, medicine_id: lot.medicine_id, lot_number: str(lot.lot_number), expiry_date: lot.expiry_date || null,
      quantity_received: received, quantity_remaining: remaining, received_on: lot.received_on || null, supplier: str(lot.supplier),
      cost: isManager ? num(lot.cost) : undefined, status: lot.status, notes: str(lot.notes),
    } as any, { onSuccess: () => setLot(null), onError: (e: any) => setError(e.message) });
  };

  const addToRestock = (m: Medicine) => {
    flagRestock.mutate(
      { item_name: m.name, feed_type_id: null, category: 'medicine', level: onHand(m.id) > 0 ? 'low' : 'out',
        quantity_note: `${onHand(m.id)} ${m.stock_unit} left`, note: '' },
      { onSuccess: () => notify(`${m.name} added to the restock list.`), onError: (e: any) => alert(e.message) }
    );
  };

  if (isLoading) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;
  const medForLot = lot ? medicines.find((m) => m.id === lot.medicine_id) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medicine Cabinet</h1>
          <p className="text-gray-500">What&apos;s on hand, lot numbers and expiry dates. Health records and treatments can say which lot was used.</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openNewMed}>Add medicine</Button>
      </div>

      {(expired.length > 0 || expiringSoon.length > 0) && (
        <Card className="border-amber-300 bg-amber-50">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 space-y-1">
              {expired.length > 0 && <p><span className="font-semibold">{expired.length} lot{expired.length === 1 ? '' : 's'} expired</span> — check and discard.</p>}
              {expiringSoon.length > 0 && <p><span className="font-semibold">{expiringSoon.length} lot{expiringSoon.length === 1 ? '' : 's'} expire within 30 days.</span></p>}
            </div>
          </div>
        </Card>
      )}

      {medicines.length === 0 ? (
        <Card>
          <EmptyState icon={<Pill className="h-10 w-10" />} title="Your cabinet is empty"
            description="Add the medicines you keep (vaccines, dewormers, antibiotics...), then the lots you have on hand." />
        </Card>
      ) : (
        <>
          {medicines.some((m) => !m.active) && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
              Show medicines you no longer use
            </label>
          )}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {shown.map((m) => {
              const medLots = (lotsByMed.get(m.id) ?? []).filter((l) => l.status === 'in_stock');
              const low = isLow(m);
              return (
                <Card key={m.id} padding="none" className={!m.active ? 'opacity-60' : undefined}>
                  <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-semibold text-gray-900">{m.name}</h2>
                        <Badge>{MEDICINE_KIND_LABELS[m.kind]}</Badge>
                        {m.storage !== 'room' && <span className="inline-flex items-center gap-1 text-xs text-[#1D5E8C]"><Snowflake className="h-3 w-3" /> {m.storage}</span>}
                        {m.prescription_required && <Badge variant="info">Rx</Badge>}
                        {low && <Badge variant="danger">Low</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        On hand: <span className="font-medium text-gray-800">{onHand(m.id)} {m.stock_unit}</span>
                        {(m.meat_withdrawal_days != null || m.milk_withdrawal_days != null) && (
                          <> · Withdrawal: meat {m.meat_withdrawal_days ?? '—'}d, milk {m.milk_withdrawal_days ?? '—'}d</>
                        )}
                      </p>
                      {(m.dose_notes || m.default_dose != null) && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          Dose: {m.default_dose != null ? `${m.default_dose} ${m.default_dose_unit ?? ''}` : ''}{m.route ? ` ${m.route}` : ''}
                          {m.dose_notes ? `${m.default_dose != null ? ' · ' : ''}${m.dose_notes}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button className="p-1.5 text-gray-400 hover:text-gray-700" aria-label={`Edit ${m.name}`} onClick={() => openEditMed(m)}><Pencil className="h-4 w-4" /></button>
                    </div>
                  </div>
                  {medLots.length === 0 ? (
                    <p className="px-5 py-3 text-sm text-gray-500">No lots on hand.</p>
                  ) : (
                    <ul className="divide-y divide-gray-50">
                      {medLots.map((l) => {
                        const exp = expiryState(l, today);
                        return (
                          <li key={l.id} className="px-5 py-2.5 flex items-center gap-3 text-sm hover:bg-gray-50 cursor-pointer" onClick={() => openEditLot(l)}>
                            <span className="flex-1 min-w-0">
                              <span className="text-gray-900">Lot {l.lot_number || '—'}</span>
                              <span className="text-gray-500"> · {l.quantity_remaining ?? '?'} {m.stock_unit} left</span>
                            </span>
                            {l.expiry_date && (
                              <span className={exp === 'expired' ? 'text-[#9B1C1C] font-medium' : exp === 'soon' ? 'text-amber-700 font-medium' : 'text-gray-500'}>
                                {exp === 'expired' ? 'Expired ' : 'Exp. '}{format(parseISO(l.expiry_date), 'MMM d, yyyy')}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => openNewLot(m.id)}>Add lot</Button>
                    {onRestockList(m) ? (
                      <Link href="/dashboard/restock" className="text-sm text-[#105040] self-center hover:underline">On the restock list</Link>
                    ) : (
                      <Button size="sm" variant="ghost" leftIcon={<PackageMinus className="h-4 w-4" />} onClick={() => addToRestock(m)}>Add to restock list</Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Medicine form */}
      <Modal open={!!med} onClose={() => setMed(null)} title={med?.id ? 'Edit medicine' : 'Add medicine'} size="lg"
        footer={<><Button variant="ghost" onClick={() => setMed(null)}>Cancel</Button><Button loading={saveMedicine.isPending} onClick={submitMed}>Save</Button></>}>
        {med && (
          <div className="space-y-3">
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Name" required value={med.name} onChange={(e) => setMed({ ...med, name: e.target.value })} placeholder="e.g. CD&T, Penicillin G, Valbazen" />
              <Select label="Type" value={med.kind} onChange={(e) => setMed({ ...med, kind: e.target.value as MedicineKind })}
                options={(Object.keys(MEDICINE_KIND_LABELS) as MedicineKind[]).map((k) => ({ value: k, label: MEDICINE_KIND_LABELS[k] }))} />
              <Input label="Active ingredient" value={med.active_ingredient} onChange={(e) => setMed({ ...med, active_ingredient: e.target.value })} />
              <Input label="Route" value={med.route} onChange={(e) => setMed({ ...med, route: e.target.value })} placeholder="SQ, IM, oral, topical" />
              <Input label="Usual dose" type="number" min="0" step="any" value={med.default_dose} onChange={(e) => setMed({ ...med, default_dose: e.target.value })} />
              <Input label="Dose unit" value={med.default_dose_unit} onChange={(e) => setMed({ ...med, default_dose_unit: e.target.value })} placeholder="ml" />
            </div>
            <Input label="Dosing notes" value={med.dose_notes} onChange={(e) => setMed({ ...med, dose_notes: e.target.value })} placeholder="e.g. 1 ml per 25 lb; booster in 4 weeks" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="Meat withdrawal (days)" type="number" min="0" value={med.meat_withdrawal_days} onChange={(e) => setMed({ ...med, meat_withdrawal_days: e.target.value })} />
              <Input label="Milk withdrawal (days)" type="number" min="0" value={med.milk_withdrawal_days} onChange={(e) => setMed({ ...med, milk_withdrawal_days: e.target.value })} />
              <Select label="Storage" value={med.storage} onChange={(e) => setMed({ ...med, storage: e.target.value as MedForm['storage'] })}
                options={[{ value: 'room', label: 'Room temperature' }, { value: 'fridge', label: 'Fridge' }, { value: 'freezer', label: 'Freezer' }]} />
              <Input label="Counted in" value={med.stock_unit} onChange={(e) => setMed({ ...med, stock_unit: e.target.value })} hint="ml, doses, tablets, boluses..." />
              <Input label="Flag low at" type="number" min="0" step="any" value={med.low_stock_level} onChange={(e) => setMed({ ...med, low_stock_level: e.target.value })} hint={`In ${med.stock_unit || 'units'}, total across lots`} />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={med.prescription_required} onChange={(e) => setMed({ ...med, prescription_required: e.target.checked })} className="rounded" />
              Prescription / vet-only
            </label>
            <Input label="Notes" value={med.notes} onChange={(e) => setMed({ ...med, notes: e.target.value })} />
            {med.id && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={med.active} onChange={(e) => setMed({ ...med, active: e.target.checked })} className="rounded" />
                Still in use (untick to hide it)
              </label>
            )}
          </div>
        )}
      </Modal>

      {/* Lot form */}
      <Modal open={!!lot} onClose={() => setLot(null)} title={lot?.id ? `Lot of ${medForLot?.name ?? 'medicine'}` : `New lot of ${medForLot?.name ?? 'medicine'}`}
        footer={
          <>
            {lot?.id && (
              <Button variant="ghost" className="mr-auto" onClick={() => {
                if (confirm('Delete this lot record? (To keep history, mark it finished or discarded instead.)')) {
                  deleteLot.mutate({ id: lot.id!, label: `Lot ${lot.lot_number || ''} of ${medForLot?.name ?? 'medicine'}` }, { onSuccess: () => setLot(null), onError: (e: any) => alert(e.message) });
                }
              }}>Delete</Button>
            )}
            <Button variant="ghost" onClick={() => setLot(null)}>Cancel</Button>
            <Button loading={saveLot.isPending} onClick={submitLot}>Save</Button>
          </>
        }>
        {lot && (
          <div className="space-y-3">
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Lot number" value={lot.lot_number} onChange={(e) => setLot({ ...lot, lot_number: e.target.value })} />
              <Input label="Expiry date" type="date" value={lot.expiry_date} onChange={(e) => setLot({ ...lot, expiry_date: e.target.value })} />
              <Input label={`Amount received (${medForLot?.stock_unit ?? 'units'})`} type="number" min="0" step="any" value={lot.quantity_received} onChange={(e) => setLot({ ...lot, quantity_received: e.target.value })} />
              <Input label={`Amount left (${medForLot?.stock_unit ?? 'units'})`} type="number" min="0" step="any" value={lot.quantity_remaining}
                onChange={(e) => setLot({ ...lot, quantity_remaining: e.target.value })} hint={lot.id ? 'Update as it gets used.' : 'Leave blank if it’s a new, full lot.'} />
              <Input label="Received on" type="date" value={lot.received_on} onChange={(e) => setLot({ ...lot, received_on: e.target.value })} />
              <Input label="Supplier" value={lot.supplier} onChange={(e) => setLot({ ...lot, supplier: e.target.value })} />
              {isManager && <Input label="Cost" type="number" min="0" step="any" value={lot.cost} onChange={(e) => setLot({ ...lot, cost: e.target.value })} />}
              {lot.id && (
                <Select label="Status" value={lot.status} onChange={(e) => setLot({ ...lot, status: e.target.value as MedicineLot['status'] })}
                  options={[{ value: 'in_stock', label: 'In stock' }, { value: 'finished', label: 'Used up' }, { value: 'discarded', label: 'Discarded (expired / damaged)' }]} />
              )}
            </div>
            <Input label="Notes" value={lot.notes} onChange={(e) => setLot({ ...lot, notes: e.target.value })} />
          </div>
        )}
      </Modal>
    </div>
  );
}
