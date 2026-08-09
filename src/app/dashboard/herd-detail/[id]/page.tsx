'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useHerd,
  useHerdAnimals,
  useUpdateHerd,
  useAssignAnimalToHerd,
  useFeedSchedules,
  useHerdsWithStats,
} from '@/hooks/useHerds';
import { useAnimals } from '@/hooks/useAnimals';
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
import { formatDate, calculateAge, getCategoryDisplay } from '@/lib/utils';
import { categoryIs, toCanonicalCategory } from '@/lib/animalVocab';
import {
  ArrowLeft,
  Edit,
  Plus,
  Users,
  Milk,
  MapPin,
  Calendar,
  Trash2,
  UserPlus,
  ArrowRightLeft,
} from 'lucide-react';
import Link from 'next/link';

// Keyed by canonical (neutral) category; look up via toCanonicalCategory so
// both goat and neutral vocabularies resolve to the same color.
const categoryColors: Record<string, string> = {
  male: 'bg-blue-100 text-blue-700',
  milking_female: 'bg-green-100 text-green-700',
  dry_female: 'bg-gray-100 text-gray-700',
  bred_female: 'bg-purple-100 text-purple-700',
  castrated: 'bg-amber-100 text-amber-700',
  young_male: 'bg-cyan-100 text-cyan-700',
  young_female: 'bg-pink-100 text-pink-700',
  young: 'bg-slate-100 text-slate-700',
};

const herdColors = [
  { value: '#16a34a', label: 'Green' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#9333ea', label: 'Purple' },
  { value: '#dc2626', label: 'Red' },
  { value: '#ea580c', label: 'Orange' },
  { value: '#ca8a04', label: 'Yellow' },
  { value: '#0891b2', label: 'Cyan' },
  { value: '#db2777', label: 'Pink' },
];

export default function HerdDetailPage() {
  const params = useParams();
  const router = useRouter();
  const herdId = params.id as string;

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddAnimalModal, setShowAddAnimalModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [transferToHerdId, setTransferToHerdId] = useState('');

  // Data hooks
  const { data: herd, isLoading: herdLoading } = useHerd(herdId);
  const { data: herdAnimals, isLoading: animalsLoading } = useHerdAnimals(herdId) as any;
  const { data: allAnimals } = useAnimals({ status: 'active' });
  const { data: allHerds } = useHerdsWithStats();
  const { data: feedSchedules } = useFeedSchedules(herdId !== 'unassigned' ? herdId : undefined);

  // Mutations
  const updateHerd = useUpdateHerd();
  const assignAnimal = useAssignAnimalToHerd();

  // Edit form state
  const [editForm, setEditForm] = useState<any>(null);

  // Get unassigned animals for add modal
  const unassignedAnimals = allAnimals?.filter((a: any) => !a.herd_id) || [];
  
  // Get other herds for transfer
  const otherHerds = allHerds?.filter((h: any) => h.id !== herdId && h.id !== 'unassigned') || [];

  // Stats
  const milkingCount = herdAnimals?.filter((a: any) => categoryIs(a, 'milking_female')).length || 0;
  const buckCount = herdAnimals?.filter((a: any) => categoryIs(a, 'male')).length || 0;
  const kidCount = herdAnimals?.filter((a: any) => categoryIs(a, 'young_male') || categoryIs(a, 'young_female') || categoryIs(a, 'young')).length || 0;

  const handleEdit = () => {
    if (herdId === 'unassigned') return;
    setEditForm({
      name: herd?.name || '',
      description: herd?.description || '',
      color: herd?.color || '#16a34a',
      location: herd?.location || '',
      pasture_name: herd?.pasture_name || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm || herdId === 'unassigned') return;
    await updateHerd.mutateAsync({ id: herdId, updates: editForm });
    setShowEditModal(false);
  };

  const handleAddAnimal = async (animalId: string) => {
    await assignAnimal.mutateAsync({ 
      animalId, 
      herdId: herdId === 'unassigned' ? null : herdId 
    });
    setShowAddAnimalModal(false);
  };

  const handleRemoveAnimal = async (animalId: string) => {
    if (!confirm('Remove this animal from the herd?')) return;
    await assignAnimal.mutateAsync({ animalId, herdId: null });
  };

  const handleTransfer = async () => {
    if (!selectedAnimalId || !transferToHerdId) return;
    await assignAnimal.mutateAsync({ 
      animalId: selectedAnimalId, 
      herdId: transferToHerdId 
    });
    setShowTransferModal(false);
    setSelectedAnimalId('');
    setTransferToHerdId('');
  };

  if (herdLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!herd) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">Herd not found</p>
        <Button variant="secondary" className="mt-4" onClick={() => router.push('/dashboard/herd-management')}>
          Back to Herd Management
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/dashboard/herd-management')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Herd Header */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl"
              style={{ backgroundColor: herd.color }}
            >
              🐐
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{herd.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                {herd.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {herd.location}
                  </span>
                )}
                {herd.pasture_name && (
                  <span>• {herd.pasture_name}</span>
                )}
              </div>
              {herd.description && (
                <p className="mt-2 text-gray-600">{herd.description}</p>
              )}
            </div>
          </div>
          {herdId !== 'unassigned' && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button onClick={() => setShowAddAnimalModal(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Animal
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: herd.color }}>{herdAnimals?.length || 0}</p>
            <p className="text-sm text-gray-500">Total Animals</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{milkingCount}</p>
            <p className="text-sm text-gray-500">Milking Does</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{buckCount}</p>
            <p className="text-sm text-gray-500">Bucks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-pink-600">{kidCount}</p>
            <p className="text-sm text-gray-500">Kids</p>
          </div>
        </div>
      </Card>

      {/* Feed Schedules for this herd */}
      {herdId !== 'unassigned' && feedSchedules && feedSchedules.length > 0 && (
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Feeding Schedule</h2>
          <div className="space-y-2">
            {feedSchedules.map((schedule: any) => (
              <div key={schedule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{schedule.feed_type}</p>
                  <p className="text-sm text-gray-500">
                    {schedule.quantity_per_feeding} {schedule.unit} at {schedule.feeding_times?.join(' & ')}
                  </p>
                </div>
                <Badge variant={schedule.status === 'active' ? 'success' : 'default'}>
                  {schedule.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Animals List */}
      <Card padding="none">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Animals in this Herd</h2>
          <span className="text-sm text-gray-500">{herdAnimals?.length || 0} animals</span>
        </div>

        {animalsLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : !herdAnimals?.length ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No animals in this herd"
            description={herdId === 'unassigned' 
              ? "All animals have been assigned to herds" 
              : "Add animals to this herd to get started"}
            action={
              herdId !== 'unassigned' && unassignedAnimals.length > 0 ? (
                <Button onClick={() => setShowAddAnimalModal(true)}>Add Animal</Button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y">
            {herdAnimals.map((animal: any) => (
              <div
                key={animal.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <Link 
                  href={`/dashboard/herd/${animal.id}`}
                  className="flex items-center gap-4 flex-1"
                >
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                    {animal.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{animal.name}</p>
                      <Badge className={categoryColors[toCanonicalCategory(animal.category)] || 'bg-gray-100'}>
                        {getCategoryDisplay(animal.category, animal.species)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {animal.breed || 'Unknown breed'}
                      {animal.date_of_birth && ` • ${calculateAge(animal.date_of_birth)}`}
                    </p>
                  </div>
                </Link>

                <div className="flex items-center gap-2">
                  {/* Transfer button */}
                  {otherHerds.length > 0 && (
                    <button
                      onClick={() => {
                        setSelectedAnimalId(animal.id);
                        setShowTransferModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                      title="Transfer to another herd"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                    </button>
                  )}
                  {/* Remove from herd button */}
                  {herdId !== 'unassigned' && (
                    <button
                      onClick={() => handleRemoveAnimal(animal.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                      title="Remove from herd"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Edit Herd Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Herd"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} loading={updateHerd.isPending}>Save Changes</Button>
          </>
        }
      >
        {editForm && (
          <div className="space-y-4">
            <Input
              label="Herd Name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="flex gap-2">
                {herdColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setEditForm({ ...editForm, color: color.value })}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      editForm.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>
            </div>
            <Input
              label="Location"
              value={editForm.location}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
            />
            <Input
              label="Pasture/Pen Name"
              value={editForm.pasture_name}
              onChange={(e) => setEditForm({ ...editForm, pasture_name: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Add Animal Modal */}
      <Modal
        open={showAddAnimalModal}
        onClose={() => setShowAddAnimalModal(false)}
        title="Add Animal to Herd"
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {unassignedAnimals.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              All animals are already assigned to herds.
            </p>
          ) : (
            unassignedAnimals.map((animal) => (
              <button
                key={animal.id}
                onClick={() => handleAddAnimal(animal.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                  {animal.name[0]}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{animal.name}</p>
                  <p className="text-sm text-gray-500">
                    {getCategoryDisplay(animal.category, animal.species)} • {animal.breed || 'Unknown breed'}
                  </p>
                </div>
                <Plus className="h-5 w-5 text-gray-400" />
              </button>
            ))
          )}
        </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        open={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setSelectedAnimalId('');
          setTransferToHerdId('');
        }}
        title="Transfer Animal"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowTransferModal(false)}>Cancel</Button>
            <Button onClick={handleTransfer} loading={assignAnimal.isPending}>Transfer</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Transfer <strong>{herdAnimals?.find((a: any) => a.id === selectedAnimalId)?.name}</strong> to:
          </p>
          <Select
            label="Destination Herd"
            options={[
              { value: '', label: 'Select herd...' },
              ...otherHerds.map((h: any) => ({ value: h.id, label: h.name })),
            ]}
            value={transferToHerdId}
            onChange={(e) => setTransferToHerdId(e.target.value)}
            required
          />
        </div>
      </Modal>
    </div>
  );
}
