'use client';

import { useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { PackageX, PackageMinus, PackageCheck, ShoppingCart, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useFarm, useFarmMembers, memberName } from '@/hooks/useFarm';
import {
  CATEGORY_LABELS, RestockCategory, RestockLevel, RestockRequest,
  useDeleteRestock, useFlagRestock, useRestockRequests, useStockItems, useUpdateRestock,
} from '@/hooks/useRestock';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner, Modal, Select } from '@/components/ui';

const stamp = (iso: string | null) => (iso ? format(new Date(iso), "MMM d 'at' h:mm a") : '');

function guessCategory(feedCategory: string | undefined): RestockCategory {
  if (!feedCategory) return 'other';
  if (feedCategory === 'mineral') return 'mineral';
  return 'feed';
}

export default function RestockPage() {
  const { isManager } = useFarm();
  const { data: members } = useFarmMembers();
  const { data: requests = [], isLoading } = useRestockRequests();
  const { data: stockItems = [] } = useStockItems();
  const flag = useFlagRestock();
  const update = useUpdateRestock();
  const remove = useDeleteRestock();

  const [open, setOpen] = useState(false);
  const [itemId, setItemId] = useState('');
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<RestockCategory>('feed');
  const [level, setLevel] = useState<RestockLevel>('low');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const active = useMemo(
    () =>
      requests
        .filter((r) => r.status === 'open' || r.status === 'ordered')
        .sort((a, b) => {
          // Out before low, not-yet-ordered before ordered, then oldest first.
          if (a.level !== b.level) return a.level === 'out' ? -1 : 1;
          if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
          return a.created_at.localeCompare(b.created_at);
        }),
    [requests]
  );
  const finished = requests
    .filter((r) => r.status === 'restocked' || r.status === 'cancelled')
    .sort((a, b) => (b.resolved_at ?? '').localeCompare(a.resolved_at ?? ''));

  const name = itemId ? stockItems.find((s) => s.id === itemId)?.name ?? '' : itemName;
  const duplicate = name
    ? active.find((r) => (itemId && r.feed_type_id === itemId) || r.item_name.trim().toLowerCase() === name.trim().toLowerCase())
    : undefined;

  const openForm = () => {
    setItemId(''); setItemName(''); setCategory('feed'); setLevel('low'); setQty(''); setNote(''); setError('');
    setOpen(true);
  };

  const submit = () => {
    if (!name.trim()) return setError('Say what is running low.');
    flag.mutate(
      { item_name: name, feed_type_id: itemId || null, category, level, quantity_note: qty, note },
      { onSuccess: () => setOpen(false), onError: (e: any) => setError(e.message) }
    );
  };

  const setStatus = (r: RestockRequest, status: RestockRequest['status']) => {
    let resolution_note: string | null | undefined;
    if (status === 'restocked') {
      const answer = window.prompt(`Mark "${r.item_name}" restocked. Add a note? (optional, e.g. "4 bags in the shed")`, '');
      if (answer === null) return;
      resolution_note = answer || null;
    }
    if (status === 'cancelled' && !confirm(`Take "${r.item_name}" off the list without restocking?`)) return;
    update.mutate({ id: r.id, status, ...(resolution_note !== undefined ? { resolution_note } : {}) }, { onError: (e: any) => alert(e.message) });
  };

  const renderItem = (r: RestockRequest) => (
    <li key={r.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3">
      <span className="mt-0.5 flex-shrink-0">
        {r.status === 'restocked' ? <PackageCheck className="h-5 w-5 text-[#105040]" />
          : r.level === 'out' ? <PackageX className="h-5 w-5 text-[#9B1C1C]" />
          : <PackageMinus className="h-5 w-5 text-[#8A5A1E]" />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-900">{r.item_name}</p>
          {(r.status === 'open' || r.status === 'ordered') && (
            <Badge variant={r.level === 'out' ? 'danger' : 'warning'}>{r.level === 'out' ? 'Out' : 'Low'}</Badge>
          )}
          {r.status === 'ordered' && <Badge variant="info">Ordered</Badge>}
          {r.status === 'cancelled' && <Badge>Taken off list</Badge>}
          <span className="text-xs text-gray-500">{CATEGORY_LABELS[r.category]}</span>
        </div>
        {(r.quantity_note || r.note) && (
          <p className="text-sm text-gray-700 mt-0.5">{[r.quantity_note, r.note].filter(Boolean).join(' · ')}</p>
        )}
        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
          <p title={stamp(r.created_at)}>
            Flagged by {memberName(members, r.user_id)} · {stamp(r.created_at)} ({formatDistanceToNow(new Date(r.created_at), { addSuffix: true })})
          </p>
          {r.ordered_at && <p>Ordered by {memberName(members, r.ordered_by)} · {stamp(r.ordered_at)}</p>}
          {r.resolved_at && (
            <p className={r.status === 'restocked' ? 'text-[#105040]' : ''}>
              {r.status === 'restocked' ? 'Restocked' : 'Taken off list'} by {memberName(members, r.resolved_by)} · {stamp(r.resolved_at)}
              {r.resolution_note ? ` — “${r.resolution_note}”` : ''}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
        {r.status === 'open' && r.level === 'low' && (
          <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: r.id, level: 'out' }, { onError: (e: any) => alert(e.message) })}>
            Now out
          </Button>
        )}
        {r.status === 'open' && (
          <Button size="sm" variant="outline" leftIcon={<ShoppingCart className="h-4 w-4" />} onClick={() => setStatus(r, 'ordered')}>
            Ordered
          </Button>
        )}
        {(r.status === 'open' || r.status === 'ordered') && (
          <>
            <Button size="sm" leftIcon={<PackageCheck className="h-4 w-4" />} onClick={() => setStatus(r, 'restocked')}>
              Restocked
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStatus(r, 'cancelled')}>Remove</Button>
          </>
        )}
        {(r.status === 'restocked' || r.status === 'cancelled') && (
          <Button size="sm" variant="ghost" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setStatus(r, 'open')}>
            Reopen
          </Button>
        )}
        {isManager && (r.status === 'restocked' || r.status === 'cancelled') && (
          <button className="p-1.5 text-gray-400 hover:text-red-700" title="Delete for good" aria-label={`Delete ${r.item_name}`}
            onClick={() => confirm(`Delete this entry for "${r.item_name}"? It stays in Change History.`) && remove.mutate(r.id, { onError: (e: any) => alert(e.message) })}>
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </li>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restock List</h1>
          <p className="text-gray-500">Anything running low or out. Anyone can add to it, mark it ordered, or mark it restocked.</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openForm}>Report low / out</Button>
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center"><LoadingSpinner /></div>
      ) : (
        <>
          <Card padding="none">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                Needs restocking ({active.length})
                {active.some((r) => r.level === 'out') && (
                  <span className="ml-2 text-sm font-normal text-[#9B1C1C]">{active.filter((r) => r.level === 'out').length} out</span>
                )}
              </h2>
            </div>
            {active.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={<PackageCheck className="h-10 w-10" />} title="Nothing on the list" description="When something runs low, tap “Report low / out”." />
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">{active.map(renderItem)}</ul>
            )}
          </Card>

          {finished.length > 0 && (
            <Card padding="none">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Recently restocked</h2>
              </div>
              <ul className="divide-y divide-gray-100">{finished.slice(0, 50).map(renderItem)}</ul>
            </Card>
          )}
        </>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Report something low or out"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={flag.isPending} onClick={submit}>Add to restock list</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How low">
            {(['low', 'out'] as RestockLevel[]).map((l) => (
              <button key={l} type="button" role="radio" aria-checked={level === l} onClick={() => setLevel(l)}
                className={`rounded-lg border px-3 py-3 text-sm font-medium ${level === l
                  ? l === 'out' ? 'border-[#9B1C1C] bg-red-50 text-[#9B1C1C]' : 'border-[#8A5A1E] bg-amber-50 text-[#8A5A1E]'
                  : 'border-[#DDD8D4] text-gray-600'}`}>
                {l === 'out' ? 'Out — none left' : 'Running low'}
              </button>
            ))}
          </div>

          {stockItems.length > 0 && (
            <Select
              label="Pick from your feed & minerals"
              value={itemId}
              onChange={(e) => {
                setItemId(e.target.value);
                setCategory(guessCategory(stockItems.find((s) => s.id === e.target.value)?.category));
              }}
              options={[{ value: '', label: 'Something else (type it below)' }, ...stockItems.map((s) => ({ value: s.id, label: s.name }))]}
            />
          )}
          {!itemId && (
            <Input label="What is it?" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Hoof trimmer blades, CD&T vaccine, straw" required />
          )}
          {duplicate && (
            <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-2">
              Already on the list: flagged {duplicate.level === 'out' ? 'out' : 'low'} by {memberName(members, duplicate.user_id)}{' '}
              {formatDistanceToNow(new Date(duplicate.created_at), { addSuffix: true })}. You can still add it if this is different.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Type" value={category} onChange={(e) => setCategory(e.target.value as RestockCategory)}
              options={(Object.keys(CATEGORY_LABELS) as RestockCategory[]).map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))} />
            <Input label="How much is left? (optional)" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. about 2 bags" />
          </div>
          <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Get the 50 lb bags from the co-op" />
        </div>
      </Modal>
    </div>
  );
}
