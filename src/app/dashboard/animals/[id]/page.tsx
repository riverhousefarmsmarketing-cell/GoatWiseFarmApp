'use client';

import { useState } from 'react';
import { useAnimals, useAnimalStats, useCreateAnimal, useDeleteAnimal } from '@/hooks/useAnimals';
import { useGroups } from '@/hooks/useGroups';
import { Card, Button, Input, Select, Badge, Modal, EmptyState, LoadingSpinner } from '@/components/ui';
import { formatDate, calculateAge, getStatusColor, getCategoryDisplay } from '@/lib/utils';
import { 
  Plus, 
  Search, 
  Filter, 
  Users, 
  MoreVertical, 
  Edit, 
  Trash2, 
  ChevronRight,
  Tag,
  Calendar,
  LayoutGrid,
  List,
} from 'lucide-react';
import Link from 'next/link';

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'milking_doe', label: 'Milking Does' },
  { value: 'dry_doe', label: 'Dry Does' },
  { value: 'bred_doe', label: 'Bred Does' },
  { value: 'doeling', label: 'Doelings' },
  { value: 'buck', label: 'Bucks' },
  { value: 'buckling', label: 'Bucklings' },
  { value: 'wether', label: 'Wethers' },
];

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Sold' },
  { value: 'deceased', label: 'Deceased' },
];

const sexOptions = [
  { value: 'doe', label: 'Doe' },
  { value: 'buck', label: 'Buck' },
  { value: 'wether', label: 'Wether' },
];

const categoryColors: Record<string, string> = {
  buck: 'bg-blue-100 text-blue-700',
  milking_doe: 'bg-green-100 text-green-700',
  dry_doe: 'bg-gray-100 text-gray-700',
  bred_doe: 'bg-purple-100 text-purple-700',
  wether: 'bg-amber-100 text-amber-700',
  buckling: 'bg-cyan-100 text-cyan-700',
  doeling: 'bg-pink-100 text-pink-700',
};

const categoryLabels: Record<string, string> = {
  buck: 'Buck',
  milking_doe: 'Milking Doe',
  dry_doe: 'Dry Doe',
  bred_doe: 'Bred Doe',
  wether: 'Wether',
  buckling: 'Buckling',
  doeling: 'Doeling',
};

const newCategoryOptions = categoryOptions.filter(c => c.value !== 'all');

export default function HerdPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('active');
  const [groupFilter, setGroupFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAnimal, setNewAnimal] = useState({
    name: '',
    breed: '',
    sex: 'doe' as const,
    category: 'milking_doe' as const,
    birth_date: '',
    tag_number: '',
  });

  const { data: animals, isLoading } = useAnimals({ 
    search, 
    category: category === 'all' ? undefined : category, 
    status: status === 'all' ? undefined : status,
  });
  const { data: stats } = useAnimalStats();
  const { data: groups } = useGroups();
  const createAnimal = useCreateAnimal();
  const deleteAnimal = useDeleteAnimal();

  // Filter by group
  const filteredAnimals = animals?.filter(animal => {
    if (groupFilter === 'all') return true;
    return (animal as any).group_ids?.includes(groupFilter);
  });

  const handleAddAnimal = async () => {
    if (!newAnimal.name) return;
    
    await createAnimal.mutateAsync({
      name: newAnimal.name,
      breed: newAnimal.breed || null,
      sex: newAnimal.sex,
      category: newAnimal.category,
      birth_date: newAnimal.birth_date || null,
      tag_number: newAnimal.tag_number || null,
      status: 'active',
    });
    
    setShowAddModal(false);
    setNewAnimal({ name: '', breed: '', sex: 'doe', category: 'milking_doe', birth_date: '', tag_number: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Herd</h1>
          <p className="text-gray-500">{stats?.total || 0} animals total • {stats?.active || 0} active</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/add-animal">
            <Button leftIcon={<Plus className="h-4 w-4" />}>
              Add Animal
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card padding="sm" className="text-center">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-semibold text-primary-600">{stats?.active || 0}</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-sm text-gray-500">Milking</p>
          <p className="text-2xl font-semibold text-green-600">{stats?.milkingDoes || 0}</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-sm text-gray-500">Bred</p>
          <p className="text-2xl font-semibold text-purple-600">{stats?.bredDoes || 0}</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-sm text-gray-500">Bucks</p>
          <p className="text-2xl font-semibold text-blue-600">{stats?.bucks || 0}</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-sm text-gray-500">Kids</p>
          <p className="text-2xl font-semibold text-cyan-600">{stats?.kids || 0}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <Select
            options={categoryOptions}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full sm:w-40"
          />
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full sm:w-32"
          />
          <Select
            options={[
              { value: 'all', label: 'All Groups' },
              ...(groups?.map(g => ({ value: g.id, label: g.name })) || []),
            ]}
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="w-full sm:w-40"
          />
          <div className="flex gap-1 border rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-500'}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-500'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {filteredAnimals?.length || 0} animal{filteredAnimals?.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Animal List/Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : !filteredAnimals?.length ? (
        <Card>
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="No animals found"
            description={search || category !== 'all' || status !== 'active' ? 'Try adjusting your filters' : 'Add your first animal to get started'}
            action={
              <Link href="/dashboard/add-animal">
                <Button>Add Animal</Button>
              </Link>
            }
          />
        </Card>
      ) : viewMode === 'list' ? (
        /* List View */
        <Card padding="none">
          <div className="divide-y">
            {filteredAnimals.map((animal) => (
              <Link
                key={animal.id}
                href={`/dashboard/animals/${animal.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                {/* Avatar */}
                {animal.photo_url ? (
                  <img 
                    src={animal.photo_url} 
                    alt={animal.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                    {animal.name[0]}
                  </div>
                )}
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{animal.name}</p>
                    {animal.tag_number && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {animal.tag_number}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {animal.breed || 'Unknown breed'} • {categoryLabels[animal.category] || animal.category}
                    {animal.birth_date && ` • ${calculateAge(animal.birth_date)}`}
                  </p>
                  {/* Group Tags */}
                  {(animal as any).group_ids?.length > 0 && groups && (
                    <div className="flex gap-1 mt-1">
                      {(animal as any).group_ids.slice(0, 2).map((groupId: string) => {
                        const group = groups.find(g => g.id === groupId);
                        return group ? (
                          <span
                            key={groupId}
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${group.color}20`, color: group.color }}
                          >
                            {group.name}
                          </span>
                        ) : null;
                      })}
                      {(animal as any).group_ids.length > 2 && (
                        <span className="text-xs text-gray-400">+{(animal as any).group_ids.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <Badge className={categoryColors[animal.category] || 'bg-gray-100'}>
                  {categoryLabels[animal.category] || animal.category}
                </Badge>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this animal?')) {
                        deleteAnimal.mutate(animal.id);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAnimals.map((animal) => (
            <Link key={animal.id} href={`/dashboard/animals/${animal.id}`}>
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {animal.photo_url ? (
                      <img 
                        src={animal.photo_url} 
                        alt={animal.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-lg">
                        {animal.name[0]}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{animal.name}</h3>
                      {animal.tag_number && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Tag className="h-3 w-3" />
                          {animal.tag_number}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className={categoryColors[animal.category] || 'bg-gray-100'}>
                    {categoryLabels[animal.category] || animal.category}
                  </Badge>
                  {animal.breed && (
                    <Badge variant="default">{animal.breed}</Badge>
                  )}
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                  {animal.birth_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{calculateAge(animal.birth_date)}</span>
                    </div>
                  )}
                </div>

                {/* Group Tags */}
                {(animal as any).group_ids?.length > 0 && groups && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex flex-wrap gap-1">
                      {(animal as any).group_ids.slice(0, 3).map((groupId: string) => {
                        const group = groups.find(g => g.id === groupId);
                        return group ? (
                          <span
                            key={groupId}
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${group.color}20`, color: group.color }}
                          >
                            {group.name}
                          </span>
                        ) : null;
                      })}
                      {(animal as any).group_ids.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{(animal as any).group_ids.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Add Animal Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Quick Add Animal"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Link href="/dashboard/add-animal">
              <Button variant="secondary">Full Form</Button>
            </Link>
            <Button onClick={handleAddAnimal} loading={createAnimal.isPending}>
              Add Animal
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={newAnimal.name}
            onChange={(e) => setNewAnimal({ ...newAnimal, name: e.target.value })}
            placeholder="e.g., Daisy"
            required
          />
          <Input
            label="Tag Number"
            value={newAnimal.tag_number}
            onChange={(e) => setNewAnimal({ ...newAnimal, tag_number: e.target.value })}
            placeholder="e.g., D001"
          />
          <Input
            label="Breed"
            value={newAnimal.breed}
            onChange={(e) => setNewAnimal({ ...newAnimal, breed: e.target.value })}
            placeholder="e.g., Nubian"
          />
          <Select
            label="Sex"
            options={sexOptions}
            value={newAnimal.sex}
            onChange={(e) => setNewAnimal({ ...newAnimal, sex: e.target.value as any })}
          />
          <Select
            label="Category"
            options={newCategoryOptions}
            value={newAnimal.category}
            onChange={(e) => setNewAnimal({ ...newAnimal, category: e.target.value as any })}
          />
          <Input
            label="Birth Date"
            type="date"
            value={newAnimal.birth_date}
            onChange={(e) => setNewAnimal({ ...newAnimal, birth_date: e.target.value })}
          />
          <p className="text-xs text-gray-500">
            For more detailed information including lineage, registration, and photos, use the{' '}
            <Link href="/dashboard/add-animal" className="text-primary-600 hover:underline">full form</Link>.
          </p>
        </div>
      </Modal>
    </div>
  );
}
