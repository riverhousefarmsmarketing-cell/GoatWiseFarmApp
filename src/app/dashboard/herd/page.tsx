'use client';

import { useState, useMemo } from 'react';
import { useAnimals, useAnimalStats, useCreateAnimal, useDeleteAnimal } from '@/hooks/useAnimals';
import { Card, Button, Input, Select, Badge, Modal, EmptyState, LoadingSpinner } from '@/components/ui';
import { formatDate, calculateAge, getStatusColor, getCategoryDisplay } from '@/lib/utils';
import { Plus, Search, Filter, Users, MoreVertical, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { type Species, getSpeciesConfig } from '@/lib/speciesConfig';
import { BREEDS } from '@/lib/breedData';
import { useRouter } from 'next/navigation';

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Sold' },
  { value: 'deceased', label: 'Deceased' },
  { value: 'culled', label: 'Culled' },
];

export default function HerdPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<'all' | Species>('all');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAnimal, setNewAnimal] = useState({
    name: '',
    breed: '',
    sex: 'female' as const,
    category: 'milking_female' as const,
    birth_date: '',
  });

  const activeSpecies: Species = speciesFilter === 'all' ? 'goat' : speciesFilter;
  const speciesConfig = getSpeciesConfig(activeSpecies);

  const pageTitle = speciesFilter === 'all'
    ? 'Herd & Flock'
    : speciesFilter === 'goat'
    ? 'Herd'
    : 'Flock';

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'milking_female', label: speciesConfig.categories.milkingFemale },
    { value: 'dry_female', label: speciesConfig.categories.dryFemale },
    { value: 'bred_female', label: speciesConfig.categories.bredFemale },
    { value: 'young_female', label: speciesConfig.categories.youngFemale },
    { value: 'male', label: speciesConfig.categories.male },
    { value: 'young_male', label: speciesConfig.categories.youngMale },
    { value: 'wether', label: speciesConfig.categories.castrated },
    { value: 'young', label: speciesConfig.categories.young },
  ];

  const sexOptions = [
    { value: 'female', label: speciesConfig.female },
    { value: 'male', label: speciesConfig.male },
    { value: 'castrated', label: speciesConfig.castrated },
  ];

  const breedOptions = useMemo(() => [
    { value: '', label: 'Select breed...' },
    ...BREEDS[activeSpecies].map((b: any) => ({ value: b.name, label: b.name })),
    { value: 'Mixed/Grade', label: 'Mixed/Grade' },
    { value: 'Other', label: 'Other' },
  ], [activeSpecies]);

  const newCategoryOptions = categoryOptions.filter(c => c.value !== 'all');

  const { data: animals, isLoading } = useAnimals({ search, category, status });
  const { data: stats } = useAnimalStats();
  const createAnimal = useCreateAnimal();
  const deleteAnimal = useDeleteAnimal();

  const kidsCount = animals?.filter(a =>
    a.category === 'doeling' || a.category === 'buckling' || a.category === 'young'
  ).length || 0;

  const handleSpeciesChange = (val: 'all' | Species) => {
    setSpeciesFilter(val);
    setCategory('all');
    setNewAnimal(prev => ({ ...prev, sex: 'female', category: 'milking_female' }));
  };

  const handleAddAnimal = async () => {
    if (!newAnimal.name) return;
    await createAnimal.mutateAsync({
      name: newAnimal.name,
      breed: newAnimal.breed || null,
      sex: newAnimal.sex,
      category: newAnimal.category,
      date_of_birth: newAnimal.birth_date || null,
      status: 'active',
      species: speciesFilter === 'all' ? 'goat' : speciesFilter,
    });
    setShowAddModal(false);
    setNewAnimal({ name: '', breed: '', sex: 'female', category: 'milking_female', birth_date: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="text-gray-500">{stats?.active || 0} active animals</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => router.push('/dashboard/add-animal')}>
  Add {speciesFilter === 'all' ? 'Animal' : speciesConfig.label}
</Button>
      </div>

      {/* Species Toggle — prominent, above everything else */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: 'All Animals', emoji: '🐾' },
          { value: 'goat', label: 'Goats (Herd)', emoji: '🐐' },
          { value: 'sheep', label: 'Sheep (Flock)', emoji: '🐑' },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSpeciesChange(opt.value as 'all' | Species)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              speciesFilter === opt.value
                ? 'bg-rhf-forest-mid border-rhf-forest-mid text-white'
                : 'bg-white border-gray-300 text-gray-700 hover:border-rhf-forest-mid hover:text-rhf-forest-mid'
            }`}
          >
            <span>{opt.emoji}</span>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding="sm">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-semibold">{stats?.active || 0}</p>
        </Card>
        <Card padding="sm">
          <p className="text-sm text-gray-500">Milking</p>
          <p className="text-2xl font-semibold">{stats?.milkingDoes || 0}</p>
        </Card>
        <Card padding="sm">
          <p className="text-sm text-gray-500">{speciesFilter === 'sheep' ? 'Rams' : 'Bucks'}</p>
          <p className="text-2xl font-semibold">{stats?.bucks || 0}</p>
        </Card>
        <Card padding="sm">
          <p className="text-sm text-gray-500">{speciesConfig.offspring}</p>
          <p className="text-2xl font-semibold">{(stats?.doelings || 0) + (stats?.bucklings || 0) + (stats?.kids || 0)}</p>
        </Card>
      </div>

      {/* Search + Category + Status filters */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search animals..."
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
            className="w-full sm:w-44"
          />
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full sm:w-32"
          />
        </div>
      </Card>

      {/* Animal List */}
      <Card padding="none">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : !animals?.length ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="No animals found"
            description={`Add your first ${speciesFilter === 'all' ? 'animal' : speciesConfig.label.toLowerCase()} to get started`}
            action={
              <Button onClick={() => setShowAddModal(true)}>
                Add {speciesFilter === 'all' ? 'Animal' : speciesConfig.label}
              </Button>
            }
          />
        ) : (
          <div className="divide-y">
            {animals.map((animal) => (
              <Link
                key={animal.id}
                href={`/dashboard/herd/${animal.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                  {(animal as any).species === 'sheep' ? '🐑' : animal.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{animal.name}</p>
                    <Badge className={getStatusColor(animal.status)}>
                      {animal.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    {animal.breed || 'Unknown breed'} • {getCategoryDisplay(animal.category)}
                   {(animal as any).date_of_birth && ` • ${calculateAge((animal as any).date_of_birth)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (confirm('Are you sure you want to delete this animal?')) {
                        deleteAnimal.mutate(animal.id);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Add Animal Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={`Add ${speciesFilter === 'all' ? 'Animal' : speciesConfig.label}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddAnimal} loading={createAnimal.isPending}>
              Add {speciesFilter === 'all' ? 'Animal' : speciesConfig.label}
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
          <Select
            label="Breed"
            options={breedOptions}
            value={newAnimal.breed}
            onChange={(e) => setNewAnimal({ ...newAnimal, breed: e.target.value })}
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
        </div>
      </Modal>
    </div>
  );
}
