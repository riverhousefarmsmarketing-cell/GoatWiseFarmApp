'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, Sparkles, MapPin, Settings2, X } from 'lucide-react';
import { useFarmMembers, memberName } from '@/hooks/useFarm';
import { usePaddocks } from '@/hooks/useGrazing';
import {
  Mineral, MineralRefill, latestRefills, useDeleteRefill, useLogRefills, useMineralRefills, useMinerals, useSaveMineral,
} from '@/hooks/useCare';
import { daysBetween, localISODate } from '@/lib/chores';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner, Modal, Select } from '@/components/ui';

type RefillRow = { feed_type_id: string; amount: string; unit: string };

function dueStatus(m: Mineral, last: MineralRefill | undefined, today: string): { label: string; variant: 'success' | 'warning' | 'danger' | 'default' } | null {
  if (!last) return m.check_every_days ? { label: 'Never filled', variant: 'danger' } : null;
  if (!m.check_every_days) return null;
  const age = daysBetween(last.refilled_on, today);
  if (age > m.check_every_days) return { label: `Overdue ${age - m.check_every_days}d`, variant: 'danger' };
  if (age >= m.check_every_days - 1) return { label: 'Due', variant: 'warning' };
  return { label: 'OK', variant: 'success' };
}

export default function MineralsPage() {
  const today = localISODate();
  const { data: members } = useFarmMembers();
  const { data: paddocks = [], isLoading: paddocksLoading } = usePaddocks();
  const { data: minerals = [], isLoading: mineralsLoading } = useMinerals();
  const { data: refills = [] } = useMineralRefills();
  const logRefills = useLogRefills();
  const deleteRefill = useDeleteRefill();
  const saveMineral = useSaveMineral();

  const [pastureFilter, setPastureFilter] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Log refill modal
  const [logOpen, setLogOpen] = useState(false);
  const [logPasture, setLogPasture] = useState('');
  const [logDate, setLogDate] = useState(today);
  const [logNotes, setLogNotes] = useState('');
  const [logRows, setLogRows] = useState<RefillRow[]>([]);
  const [logError, setLogError] = useState('');

  // Manage minerals modal
  const [manageOpen, setManageOpen] = useState(false);
  const [bulkNames, setBulkNames] = useState('');
  const [bulkUnit, setBulkUnit] = useState('lbs');
  const [editing, setEditing] = useState<{ id?: string; name: string; unit: string; check_every_days: string; notes: string } | null>(null);

  const latest = useMemo(() => latestRefills(refills), [refills]);
  const mineralById = useMemo(() => new Map(minerals.map((m) => [m.id, m])), [minerals]);
  const paddockById = useMemo(() => new Map(paddocks.map((p) => [p.id, p])), [paddocks]);
  const shownPaddocks = pastureFilter ? paddocks.filter((p) => p.id === pastureFilter) : paddocks;

  const openLog = (paddockId = '', mineralId = '') => {
    const m = mineralId ? mineralById.get(mineralId) : undefined;
    const last = paddockId && mineralId ? latest.get(`${paddockId}|${mineralId}`) : undefined;
    setLogPasture(paddockId || pastureFilter || paddocks[0]?.id || '');
    setLogDate(today);
    setLogNotes('');
    setLogRows([{ feed_type_id: mineralId, amount: last ? String(last.amount) : '', unit: last?.unit ?? m?.unit ?? 'lbs' }]);
    setLogError('');
    setLogOpen(true);
  };

  const setRow = (i: number, patch: Partial<RefillRow>) =>
    setLogRows((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const submitLog = () => {
    if (!logPasture) return setLogError('Choose a pasture.');
    const missing = logRows.some((r) => r.feed_type_id && !(Number(r.amount) > 0));
    if (missing) return setLogError('Enter an amount for each mineral (more than 0).');
    logRefills.mutate(
      { paddock_id: logPasture, refilled_on: logDate, notes: logNotes, rows: logRows },
      { onSuccess: () => setLogOpen(false), onError: (e: any) => setLogError(e.message) }
    );
  };

  const addBulk = async () => {
    const names = Array.from(new Set(bulkNames.split('\n').map((n) => n.trim()).filter(Boolean)));
    const existing = new Set(minerals.map((m) => m.name.toLowerCase()));
    try {
      for (const name of names.filter((n) => !existing.has(n.toLowerCase()))) {
        await saveMineral.mutateAsync({ name, unit: bulkUnit, check_every_days: '', notes: '' });
      }
      setBulkNames('');
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (paddocksLoading || mineralsLoading) {
    return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minerals</h1>
          <p className="text-gray-500">When each loose mineral was last put out, pasture by pasture.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<Settings2 className="h-4 w-4" />} onClick={() => setManageOpen(true)}>
            My minerals ({minerals.length})
          </Button>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openLog()} disabled={paddocks.length === 0 || minerals.length === 0}>
            Log refill
          </Button>
        </div>
      </div>

      {paddocks.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MapPin className="h-10 w-10" />}
            title="Add your pastures first"
            description="Minerals are tracked by pasture. Add your pastures on the Grazing page."
            action={<Link href="/dashboard/grazing"><Button>Go to Grazing</Button></Link>}
          />
        </Card>
      ) : minerals.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Sparkles className="h-10 w-10" />}
            title="List the minerals you put out"
            description="Add them once (you can paste the whole list), then log refills by pasture."
            action={<Button onClick={() => setManageOpen(true)}>Add my minerals</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="sm:w-64">
              <Select
                aria-label="Pasture"
                value={pastureFilter}
                onChange={(e) => setPastureFilter(e.target.value)}
                options={[{ value: '', label: 'All pastures' }, ...paddocks.map((p) => ({ value: p.id, label: p.name }))]}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="rounded" />
              Show every mineral, including ones never put out in that pasture
            </label>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {shownPaddocks.map((p) => {
              const rows = minerals
                .map((m) => ({ m, last: latest.get(`${p.id}|${m.id}`) }))
                .filter(({ m, last }) => showAll || last || m.check_every_days);
              const lastAny = rows.reduce<string | null>((acc, r) => (r.last && (!acc || r.last.refilled_on > acc) ? r.last.refilled_on : acc), null);
              return (
                <Card key={p.id} padding="none">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-gray-900 truncate">{p.name}</h2>
                      <p className="text-xs text-gray-500">
                        {lastAny ? `Last minerals put out ${format(parseISO(lastAny), 'MMM d, yyyy')}` : 'No minerals logged yet'}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => openLog(p.id)}>
                      Log
                    </Button>
                  </div>
                  {rows.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-gray-500">Nothing logged here yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500 border-b border-gray-100">
                            <th className="px-5 py-2 font-medium">Mineral</th>
                            <th className="px-3 py-2 font-medium">Last done</th>
                            <th className="px-3 py-2 font-medium">Amount</th>
                            <th className="px-3 py-2 font-medium hidden sm:table-cell">By</th>
                            <th className="px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {rows.map(({ m, last }) => {
                            const status = dueStatus(m, last, today);
                            const age = last ? daysBetween(last.refilled_on, today) : null;
                            return (
                              <tr key={m.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openLog(p.id, m.id)} title="Log a refill">
                                <td className="px-5 py-2 text-gray-900">{m.name}</td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {last ? (
                                    <>
                                      {format(parseISO(last.refilled_on), 'MMM d')}
                                      <span className="text-gray-400"> · {age === 0 ? 'today' : `${age}d ago`}</span>
                                    </>
                                  ) : (
                                    <span className="text-gray-400">Never</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">{last ? `${last.amount} ${last.unit}` : '—'}</td>
                                <td className="px-3 py-2 hidden sm:table-cell truncate max-w-[8rem]">{last ? memberName(members, last.user_id) : '—'}</td>
                                <td className="px-3 py-2 text-right">{status && <Badge variant={status.variant}>{status.label}</Badge>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <Card padding="none">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Refill log</h2>
            </div>
            {refills.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-500">No refills logged yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {refills
                  .filter((r) => !pastureFilter || r.paddock_id === pastureFilter)
                  .slice(0, 100)
                  .map((r) => {
                    const label = `${mineralById.get(r.feed_type_id)?.name ?? 'Mineral'} in ${paddockById.get(r.paddock_id)?.name ?? 'pasture'} (${r.refilled_on})`;
                    return (
                      <li key={r.id} className="px-5 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">{mineralById.get(r.feed_type_id)?.name ?? 'Mineral'}</span> — {r.amount} {r.unit} in{' '}
                            {paddockById.get(r.paddock_id)?.name ?? 'a pasture'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(parseISO(r.refilled_on), 'EEE, MMM d, yyyy')} · {memberName(members, r.user_id)}
                            {r.notes ? ` · ${r.notes}` : ''}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete ${label}`}
                          onClick={() => deleteRefill.mutate({ id: r.id, label }, { onError: (e: any) => alert(e.message) })}
                        >
                          <Trash2 className="h-4 w-4 text-gray-400" />
                        </Button>
                      </li>
                    );
                  })}
              </ul>
            )}
          </Card>
        </>
      )}

      {/* Log refill */}
      <Modal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        title="Log mineral refill"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setLogOpen(false)}>Cancel</Button>
            <Button loading={logRefills.isPending} onClick={submitLog}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          {logError && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{logError}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Pasture" value={logPasture} onChange={(e) => setLogPasture(e.target.value)}
              options={paddocks.map((p) => ({ value: p.id, label: p.name }))} />
            <Input label="Date" type="date" value={logDate} max={today} onChange={(e) => setLogDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#384E42]">What was put out</p>
            {logRows.map((row, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1 min-w-0">
                  <Select
                    aria-label="Mineral"
                    value={row.feed_type_id}
                    onChange={(e) => {
                      const m = mineralById.get(e.target.value);
                      setRow(i, { feed_type_id: e.target.value, unit: m?.unit ?? row.unit });
                    }}
                    options={[{ value: '', label: 'Choose mineral…' }, ...minerals.map((m) => ({ value: m.id, label: m.name }))]}
                  />
                </div>
                <div className="w-24">
                  <Input aria-label="Amount" type="number" min="0" step="any" inputMode="decimal" placeholder="Amount" value={row.amount}
                    onChange={(e) => setRow(i, { amount: e.target.value })} />
                </div>
                <div className="w-20">
                  <Input aria-label="Unit" value={row.unit} onChange={(e) => setRow(i, { unit: e.target.value })} />
                </div>
                {logRows.length > 1 && (
                  <button className="p-2 text-gray-400 hover:text-gray-700" aria-label="Remove row" onClick={() => setLogRows((rows) => rows.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <Button variant="ghost" size="sm" leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setLogRows((rows) => [...rows, { feed_type_id: '', amount: '', unit: 'lbs' }])}>
              Add another mineral
            </Button>
          </div>
          <Input label="Notes (optional)" value={logNotes} onChange={(e) => setLogNotes(e.target.value)} placeholder="e.g. Feeder was wet, cleaned it out" />
        </div>
      </Modal>

      {/* Manage minerals */}
      <Modal open={manageOpen} onClose={() => { setManageOpen(false); setEditing(null); }} title="My minerals" size="lg">
        {editing ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!editing.name.trim()) return;
              saveMineral.mutate(editing, { onSuccess: () => setEditing(null), onError: (err: any) => alert(err.message) });
            }}
          >
            <Input label="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Usual unit" value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} placeholder="lbs" />
              <Input label="Check every (days)" type="number" min="1" value={editing.check_every_days}
                onChange={(e) => setEditing({ ...editing, check_every_days: e.target.value })}
                hint="Optional. Flags pastures that are due." />
            </div>
            <Input label="Notes" value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            <div className="flex gap-2">
              <Button type="submit" loading={saveMineral.isPending}>Save</Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Back</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            {minerals.length > 0 && (
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg max-h-72 overflow-y-auto">
                {minerals.map((m) => (
                  <li key={m.id}>
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between gap-3"
                      onClick={() => setEditing({ id: m.id, name: m.name, unit: m.unit, check_every_days: m.check_every_days ? String(m.check_every_days) : '', notes: m.notes ?? '' })}
                    >
                      <span className="text-sm text-gray-900">{m.name}</span>
                      <span className="text-xs text-gray-500">
                        {m.unit}{m.check_every_days ? ` · check every ${m.check_every_days}d` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="space-y-2">
              <label htmlFor="bulk-minerals" className="block text-sm font-medium text-[#384E42]">Add minerals — one per line</label>
              <textarea
                id="bulk-minerals"
                rows={5}
                value={bulkNames}
                onChange={(e) => setBulkNames(e.target.value)}
                placeholder={'Kelp\nBaking soda\nCopper bolus mix\nLoose salt'}
                className="w-full rounded-lg border border-[#DDD8D4] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#105040]"
              />
              <div className="flex items-end gap-2">
                <div className="w-28">
                  <Input label="Unit" value={bulkUnit} onChange={(e) => setBulkUnit(e.target.value)} />
                </div>
                <Button onClick={addBulk} loading={saveMineral.isPending} disabled={!bulkNames.trim()}>Add</Button>
              </div>
              <p className="text-xs text-gray-500">Tap a mineral above to rename it, change its unit, or set how often it should be checked.</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
