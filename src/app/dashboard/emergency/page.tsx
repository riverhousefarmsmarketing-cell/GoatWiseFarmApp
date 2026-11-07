'use client';

import { useEffect, useState } from 'react';
import { Phone, MapPin, Pill, Package, Plus, Pencil, Trash2, Siren } from 'lucide-react';
import { useFarm } from '@/hooks/useFarm';
import {
  EmergencyContact, telHref, useDeleteContact, useEmergencyContacts, useEmergencyInfo, useSaveContact, useSaveEmergencyInfo,
} from '@/hooks/useEmergency';
import { Button, Card, Input, LoadingSpinner, Modal } from '@/components/ui';

const EMPTY_INFO = { address: '', directions: '', medicine_location: '', supplies_location: '', notes: '' };
type ContactForm = { id?: string; name: string; role: string; phone: string; alt_phone: string; notes: string; sort_order: number };

function Area({ label, value, onChange, rows = 3, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  const id = label.toLowerCase().replace(/\W+/g, '-');
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-[#384E42]">{label}</label>
      <textarea id={id} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[#DDD8D4] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#105040]" />
    </div>
  );
}

export default function EmergencyPage() {
  const { farm, isManager } = useFarm();
  const { data: info, isLoading: infoLoading } = useEmergencyInfo();
  const { data: contacts = [], isLoading: contactsLoading } = useEmergencyContacts();
  const saveInfo = useSaveEmergencyInfo();
  const saveContact = useSaveContact();
  const deleteContact = useDeleteContact();

  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState(EMPTY_INFO);
  const [contact, setContact] = useState<ContactForm | null>(null);

  useEffect(() => {
    if (info) {
      setInfoForm({
        address: info.address ?? '', directions: info.directions ?? '', medicine_location: info.medicine_location ?? '',
        supplies_location: info.supplies_location ?? '', notes: info.notes ?? '',
      });
    }
  }, [info]);

  if (infoLoading || contactsLoading) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;

  const empty = !info && contacts.length === 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#9B1C1C] text-white flex items-center justify-center flex-shrink-0">
          <Siren className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Emergency</h1>
          <p className="text-gray-500">Who to call and where things are at {farm?.name ?? 'the farm'}. For a human emergency, call 911 first.</p>
        </div>
      </div>

      {empty && !isManager && (
        <Card><p className="text-sm text-gray-600">The owner hasn&apos;t filled this in yet.</p></Card>
      )}

      {/* Contacts */}
      <Card padding="none">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Who to call</h2>
          {isManager && (
            <Button size="sm" variant="outline" leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setContact({ name: '', role: '', phone: '', alt_phone: '', notes: '', sort_order: contacts.length })}>
              Add contact
            </Button>
          )}
        </div>
        {contacts.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-500">{isManager ? 'Add your vet, after-hours vet, and anyone else staff should call.' : 'No contacts yet.'}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {contacts.map((c: EmergencyContact) => (
              <li key={c.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{c.name}{c.role && <span className="font-normal text-gray-500"> · {c.role}</span>}</p>
                  {c.notes && <p className="text-sm text-gray-600">{c.notes}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.phone && (
                    <a href={telHref(c.phone)} className="inline-flex items-center gap-2 rounded-lg bg-[#105040] text-white px-4 py-2.5 text-sm font-medium hover:bg-[#0A3228]">
                      <Phone className="h-4 w-4" /> {c.phone}
                    </a>
                  )}
                  {c.alt_phone && (
                    <a href={telHref(c.alt_phone)} className="inline-flex items-center gap-2 rounded-lg border border-[#105040] text-[#105040] px-4 py-2.5 text-sm font-medium">
                      <Phone className="h-4 w-4" /> {c.alt_phone}
                    </a>
                  )}
                  {isManager && (
                    <>
                      <button className="p-2 text-gray-400 hover:text-gray-700" aria-label={`Edit ${c.name}`}
                        onClick={() => setContact({ id: c.id, name: c.name, role: c.role ?? '', phone: c.phone ?? '', alt_phone: c.alt_phone ?? '', notes: c.notes ?? '', sort_order: c.sort_order })}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-700" aria-label={`Remove ${c.name}`}
                        onClick={() => confirm(`Remove ${c.name}?`) && deleteContact.mutate(c.id, { onError: (e: any) => alert(e.message) })}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Farm info */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Where things are</h2>
          {isManager && !editingInfo && (
            <Button size="sm" variant="outline" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEditingInfo(true)}>Edit</Button>
          )}
        </div>
        {editingInfo ? (
          <form className="space-y-3" onSubmit={(e) => {
            e.preventDefault();
            saveInfo.mutate(infoForm, { onSuccess: () => setEditingInfo(false), onError: (err: any) => alert(err.message) });
          }}>
            <Area label="Farm address (for 911 or the vet)" rows={2} value={infoForm.address} onChange={(v) => setInfoForm({ ...infoForm, address: v })} />
            <Area label="How to find us" value={infoForm.directions} onChange={(v) => setInfoForm({ ...infoForm, directions: v })}
              placeholder="Gate code, which driveway, where to park, which barn" />
            <Area label="Where the medicine is kept" value={infoForm.medicine_location} onChange={(v) => setInfoForm({ ...infoForm, medicine_location: v })}
              placeholder="e.g. Fridge in the milk room (vaccines); grey cabinet in the barn office (everything else)" />
            <Area label="Where the supplies are kept" value={infoForm.supplies_location} onChange={(v) => setInfoForm({ ...infoForm, supplies_location: v })}
              placeholder="e.g. Kidding kit, tube feeder, thermometers, hoof trimmers" />
            <Area label="Other notes" value={infoForm.notes} onChange={(v) => setInfoForm({ ...infoForm, notes: v })}
              placeholder="e.g. If a goat is down, call the vet before moving her" />
            <div className="flex gap-2">
              <Button type="submit" loading={saveInfo.isPending}>Save</Button>
              <Button type="button" variant="ghost" onClick={() => setEditingInfo(false)}>Cancel</Button>
            </div>
          </form>
        ) : info ? (
          <dl className="space-y-4 text-sm">
            {[
              { icon: <MapPin className="h-4 w-4" />, label: 'Address', value: info.address },
              { icon: <MapPin className="h-4 w-4" />, label: 'How to find us', value: info.directions },
              { icon: <Pill className="h-4 w-4" />, label: 'Medicine', value: info.medicine_location },
              { icon: <Package className="h-4 w-4" />, label: 'Supplies', value: info.supplies_location },
              { icon: null, label: 'Notes', value: info.notes },
            ].filter((r) => r.value).map((r) => (
              <div key={r.label}>
                <dt className="flex items-center gap-1.5 font-medium text-gray-700">{r.icon}{r.label}</dt>
                <dd className="text-gray-900 whitespace-pre-wrap mt-0.5">{r.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-gray-500">{isManager ? 'Add the farm address and where medicine and supplies are kept.' : 'Nothing here yet.'}</p>
        )}
      </Card>

      <Modal
        open={!!contact}
        onClose={() => setContact(null)}
        title={contact?.id ? 'Edit contact' : 'Add contact'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setContact(null)}>Cancel</Button>
            <Button loading={saveContact.isPending} onClick={() => {
              if (!contact?.name.trim()) return;
              saveContact.mutate(contact, { onSuccess: () => setContact(null), onError: (e: any) => alert(e.message) });
            }}>Save</Button>
          </>
        }
      >
        {contact && (
          <div className="space-y-3">
            <Input label="Name" required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} placeholder="e.g. Dr. Smith, Valley Vet" />
            <Input label="Role" value={contact.role} onChange={(e) => setContact({ ...contact, role: e.target.value })} placeholder="e.g. Vet, After-hours vet, Neighbour" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Phone" type="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
              <Input label="Other phone" type="tel" value={contact.alt_phone} onChange={(e) => setContact({ ...contact, alt_phone: e.target.value })} />
            </div>
            <Input label="Notes" value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} placeholder="e.g. Call first for anything after 6pm" />
            <Input label="Order on the list" type="number" value={String(contact.sort_order)} onChange={(e) => setContact({ ...contact, sort_order: Number(e.target.value) || 0 })} hint="Lower numbers show first." />
          </div>
        )}
      </Modal>
    </div>
  );
}
