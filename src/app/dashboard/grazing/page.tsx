'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  usePaddocks,
  usePaddockMoves,
  useActivePaddockMoves,
  useCreatePaddock,
  useDeletePaddock,
  useCreatePaddockMove,
  useRecordMoveOut,
  getParasiteRisk,
  getSafeReturnDate,
  getDaysResting,
  type Paddock,
  type PaddockMove,
} from '@/hooks/useGrazing';
import { useGroups } from '@/hooks/useGroups';
import {
  Card,
  Button,
  Input,
  Select,
  Modal,
  Badge,
  EmptyState,
  LoadingSpinner,
} from '@/components/ui';
import {
  MapPin,
  Plus,
  Trash2,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  History,
  Leaf,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

// ============================================================
// PARASITE RISK BADGE
// ============================================================

function RiskBadge({ movedInAt }: { movedInAt: string }) {
  const { risk, daysIn } = getParasiteRisk(movedInAt);

  const config = {
    green: {
      label: 'On Track',
      className: 'bg-green-100 text-green-800 border border-green-200',
      icon: <CheckCircle className="h-3 w-3" />,
    },
    yellow: {
      label: 'Consider Moving',
      className: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      icon: <Clock className="h-3 w-3" />,
    },
    red: {
      label: 'Parasite Risk — Move Now',
      className: 'bg-red-100 text-red-800 border border-red-200',
      icon: <AlertTriangle className="h-3 w-3" />,
    },
  }[risk];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.icon}
      Day {daysIn} — {config.label}
    </span>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function GrazingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'paddocks' | 'history'>('paddocks');

  // Data
  const { data: paddocks, isLoading: paddocksLoading } = usePaddocks();
  const { data: activeMoves } = useActivePaddockMoves();
  const { data: allMoves, isLoading: movesLoading } = usePaddockMoves();
  const { data: groups } = useGroups();

  // Mutations
  const createPaddock = useCreatePaddock();
  const deletePaddock = useDeletePaddock();
  const createMove = useCreatePaddockMove();
  const recordMoveOut = useRecordMoveOut();

  // Modal state
  const [showAddPaddock, setShowAddPaddock] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showMoveOut, setShowMoveOut] = useState(false);
  const [selectedMove, setSelectedMove] = useState<PaddockMove | null>(null);

  const [newPaddock, setNewPaddock] = useState({ name: '', acres: '', notes: '' });
  const [assignForm, setAssignForm] = useState({
    group_id: '',
    paddock_id: '',
    moved_in_at: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [moveOutForm, setMoveOutForm] = useState({
    moved_out_at: new Date().toISOString().split('T')[0],
    next_paddock_id: '',
    notes: '',
  });

  // Helpers
  const getActiveMove = (paddockId: string) =>
    activeMoves?.find(m => m.paddock_id === paddockId) || null;

  const getGroupActiveMove = (groupId: string) =>
    activeMoves?.find(m => m.group_id === groupId) || null;

  const groupOptions = groups?.map(g => ({ value: g.id, label: g.name })) || [];
  const paddockOptions = paddocks?.map(p => ({ value: p.id, label: p.name })) || [];

  // Handlers
  const handleCreatePaddock = async () => {
    if (!newPaddock.name) return;
    await createPaddock.mutateAsync({
      name: newPaddock.name,
      acres: newPaddock.acres ? parseFloat(newPaddock.acres) : null,
      notes: newPaddock.notes || null,
    });
    setShowAddPaddock(false);
    setNewPaddock({ name: '', acres: '', notes: '' });
  };

  const handleAssign = async () => {
    if (!assignForm.group_id || !assignForm.paddock_id) return;
    await createMove.mutateAsync({
      group_id: assignForm.group_id,
      paddock_id: assignForm.paddock_id,
      moved_in_at: assignForm.moved_in_at,
      notes: assignForm.notes || null,
    });
    setShowAssign(false);
    setAssignForm({ group_id: '', paddock_id: '', moved_in_at: new Date().toISOString().split('T')[0], notes: '' });
  };

  const handleMoveOut = async () => {
    if (!selectedMove) return;
    await recordMoveOut.mutateAsync({
      moveId: selectedMove.id,
      movedOutAt: moveOutForm.moved_out_at,
      nextPaddockId: moveOutForm.next_paddock_id || null,
      groupId: selectedMove.group_id,
      userId: user?.id,
      notes: moveOutForm.notes || null,
    });
    setShowMoveOut(false);
    setSelectedMove(null);
    setMoveOutForm({ moved_out_at: new Date().toISOString().split('T')[0], next_paddock_id: '', notes: '' });
  };

  const openMoveOut = (move: PaddockMove) => {
    setSelectedMove(move);
    setShowMoveOut(true);
  };

  // Count at-risk groups for header alert
  const atRiskCount = activeMoves?.filter(m => {
    const { risk } = getParasiteRisk(m.moved_in_at);
    return risk === 'red' || risk === 'yellow';
  }).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rotational Grazing</h1>
          <p className="text-gray-500">Track paddock moves and parasite risk</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            leftIcon={<MapPin className="h-4 w-4" />}
            onClick={() => setShowAddPaddock(true)}
          >
            Add Paddock
          </Button>
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowAssign(true)}
          >
            Record Move
          </Button>
        </div>
      </div>

      {/* At-risk alert banner */}
      {atRiskCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800 font-medium">
            {atRiskCount} group{atRiskCount !== 1 ? 's' : ''} at or approaching parasite risk threshold — review below.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['paddocks', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-rhf-forest-mid text-rhf-forest-mid'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'paddocks' ? '🌿 Paddocks' : '📋 Move History'}
          </button>
        ))}
      </div>

      {/* PADDOCKS TAB */}
      {activeTab === 'paddocks' && (
        <>
          {paddocksLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : !paddocks?.length ? (
            <Card>
              <EmptyState
                icon={<Leaf className="h-12 w-12" />}
                title="No paddocks yet"
                description="Add your first paddock to start tracking rotational grazing"
                action={<Button onClick={() => setShowAddPaddock(true)}>Add Paddock</Button>}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paddocks.map((paddock) => {
                const activeMove = getActiveMove(paddock.id);
                const isOccupied = !!activeMove;
                const recentMoves = allMoves?.filter(m =>
                  m.paddock_id === paddock.id && m.moved_out_at !== null
                ).slice(0, 1) || [];
                const lastMoveOut = recentMoves[0]?.moved_out_at;
                const daysResting = lastMoveOut ? getDaysResting(lastMoveOut) : null;
                const safeReturn = lastMoveOut ? getSafeReturnDate(lastMoveOut) : null;

                return (
                  <Card key={paddock.id} className="p-4">
                    {/* Paddock header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isOccupied ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <MapPin className={`h-5 w-5 ${isOccupied ? 'text-green-700' : 'text-gray-500'}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{paddock.name}</h3>
                          {paddock.acres && (
                            <p className="text-sm text-gray-500">{paddock.acres} acres</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isOccupied
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {isOccupied ? 'Occupied' : 'Resting'}
                        </span>
                        <button
                          onClick={() => {
                            if (isOccupied) {
                              alert('Move the current group out before deleting this paddock.');
                              return;
                            }
                            if (confirm(`Delete paddock "${paddock.name}"?`)) {
                              deletePaddock.mutate(paddock.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Occupied: show group + risk */}
                    {isOccupied && activeMove && (
                      <div className="border-t pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: activeMove.groups?.color || '#6b7280' }}
                            />
                            <span className="text-sm font-medium text-gray-900">
                              {activeMove.groups?.name || 'Unknown group'}
                            </span>
                          </div>
                          <RiskBadge movedInAt={activeMove.moved_in_at} />
                        </div>
                        <p className="text-xs text-gray-500">
                          Moved in: {format(parseISO(activeMove.moved_in_at), 'MMM d, yyyy')}
                        </p>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full mt-1"
                          onClick={() => openMoveOut(activeMove)}
                        >
                          <ArrowRight className="h-3.5 w-3.5 mr-1" />
                          Record Move Out
                        </Button>
                      </div>
                    )}

                    {/* Resting: show rest period info */}
                    {!isOccupied && daysResting !== null && safeReturn && (
                      <div className="border-t pt-3 space-y-1">
                        <p className="text-sm text-gray-600">
                          Resting: <span className="font-medium">{daysResting} days</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          Safe return:{' '}
                          <span className={`font-medium ${daysResting >= 40 ? 'text-green-700' : 'text-yellow-700'}`}>
                            {format(parseISO(safeReturn), 'MMM d, yyyy')}
                            {daysResting >= 40 ? ' ✓' : ` (${40 - daysResting} days away)`}
                          </span>
                        </p>
                      </div>
                    )}

                    {/* No history yet */}
                    {!isOccupied && daysResting === null && (
                      <div className="border-t pt-3">
                        <p className="text-sm text-gray-400 italic">No grazing history yet</p>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <Card padding="none">
          {movesLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : !allMoves?.length ? (
            <EmptyState
              icon={<History className="h-12 w-12" />}
              title="No move history yet"
              description="Move history will appear here once you start recording paddock moves"
            />
          ) : (
            <div className="divide-y">
              {allMoves.map((move) => {
                const daysGrazed = move.moved_out_at
                  ? Math.floor(
                      (new Date(move.moved_out_at).getTime() - new Date(move.moved_in_at).getTime()) /
                      (1000 * 60 * 60 * 24)
                    )
                  : null;

                return (
                  <div key={move.id} className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: move.groups?.color || '#6b7280' }}
                        />
                        <span className="font-medium text-gray-900">
                          {move.groups?.name || 'Unknown group'}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-gray-700">{move.paddocks?.name || 'Unknown paddock'}</span>
                        {!move.moved_out_at && (
                          <RiskBadge movedInAt={move.moved_in_at} />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {format(parseISO(move.moved_in_at), 'MMM d, yyyy')}
                        {move.moved_out_at
                          ? ` → ${format(parseISO(move.moved_out_at), 'MMM d, yyyy')} (${daysGrazed} days)`
                          : ' → present'}
                      </p>
                      {move.notes && (
                        <p className="text-xs text-gray-400 mt-0.5">{move.notes}</p>
                      )}
                    </div>
                    {!move.moved_out_at && (
                      <Button size="sm" variant="secondary" onClick={() => openMoveOut(move)}>
                        Move Out
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ADD PADDOCK MODAL */}
      <Modal
        open={showAddPaddock}
        onClose={() => setShowAddPaddock(false)}
        title="Add Paddock"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddPaddock(false)}>Cancel</Button>
            <Button onClick={handleCreatePaddock} loading={createPaddock.isPending}>
              Add Paddock
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Paddock Name *"
            value={newPaddock.name}
            onChange={(e) => setNewPaddock({ ...newPaddock, name: e.target.value })}
            placeholder="e.g., North Pasture, Paddock 3"
            required
          />
          <Input
            label="Acres (optional)"
            type="number"
            step="0.1"
            value={newPaddock.acres}
            onChange={(e) => setNewPaddock({ ...newPaddock, acres: e.target.value })}
            placeholder="e.g., 2.5"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={2}
              value={newPaddock.notes}
              onChange={(e) => setNewPaddock({ ...newPaddock, notes: e.target.value })}
              placeholder="Any notes about this paddock"
            />
          </div>
        </div>
      </Modal>

      {/* ASSIGN TO PADDOCK MODAL */}
      <Modal
        open={showAssign}
        onClose={() => setShowAssign(false)}
        title="Record Move In"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button
              onClick={handleAssign}
              loading={createMove.isPending}
              disabled={!assignForm.group_id || !assignForm.paddock_id}
            >
              Record Move
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Group *"
            options={[{ value: '', label: 'Select group...' }, ...groupOptions]}
            value={assignForm.group_id}
            onChange={(e) => setAssignForm({ ...assignForm, group_id: e.target.value })}
          />
          <Select
            label="Paddock *"
            options={[{ value: '', label: 'Select paddock...' }, ...paddockOptions]}
            value={assignForm.paddock_id}
            onChange={(e) => setAssignForm({ ...assignForm, paddock_id: e.target.value })}
          />
          <Input
            label="Move-in Date"
            type="date"
            value={assignForm.moved_in_at}
            onChange={(e) => setAssignForm({ ...assignForm, moved_in_at: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={2}
              value={assignForm.notes}
              onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
              placeholder="e.g., Moving breeding group to fresh pasture"
            />
          </div>
        </div>
      </Modal>

      {/* MOVE OUT MODAL */}
      <Modal
        open={showMoveOut}
        onClose={() => { setShowMoveOut(false); setSelectedMove(null); }}
        title="Record Move Out"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowMoveOut(false); setSelectedMove(null); }}>
              Cancel
            </Button>
            <Button onClick={handleMoveOut} loading={recordMoveOut.isPending}>
              Record Move Out
            </Button>
          </>
        }
      >
        {selectedMove && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p className="text-gray-600">
                Moving <span className="font-medium text-gray-900">{selectedMove.groups?.name}</span>{' '}
                out of <span className="font-medium text-gray-900">{selectedMove.paddocks?.name}</span>
              </p>
              <RiskBadge movedInAt={selectedMove.moved_in_at} />
            </div>
            <Input
              label="Move-out Date"
              type="date"
              value={moveOutForm.moved_out_at}
              onChange={(e) => setMoveOutForm({ ...moveOutForm, moved_out_at: e.target.value })}
            />
            <Select
              label="Assign to Next Paddock (optional)"
              options={[
                { value: '', label: 'No immediate reassignment' },
                ...paddockOptions.filter(p => p.value !== selectedMove.paddock_id),
              ]}
              value={moveOutForm.next_paddock_id}
              onChange={(e) => setMoveOutForm({ ...moveOutForm, next_paddock_id: e.target.value })}
            />
            <p className="text-xs text-gray-500">
              Leave blank if moving to a sacrifice area or dry lot between paddocks.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={2}
                value={moveOutForm.notes}
                onChange={(e) => setMoveOutForm({ ...moveOutForm, notes: e.target.value })}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
