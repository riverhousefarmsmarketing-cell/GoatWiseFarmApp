'use client';

import { useState } from 'react';
import { useAnimals, useAnimalStats, useCreateAnimal, useDeleteAnimal } from '@/hooks/useAnimals';
import { Card, Button, Input, Select, Badge, Modal, EmptyState, LoadingSpinner } from '@/components/ui';
import { formatDate, calculateAge, getStatusColor, getCategoryDisplay } from '@/lib/utils';
import { Plus, Search, Filter, Users, MoreVertical, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'milking_doe', label: 'Milking Doe' },
  { value: 'dry_doe', label: 'Dry Doe' },
  { value: 'bred_doe', label: 'Bred Doe' },
  { value: 'doeling', label: 'Doeling' },
  { value: 'buck', label: 'Buck' },
  { value: 'buckling', label: 'Buckling' },
  { value: 'wether', label: 'Wether' },
];

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Sold' },
  { value: 'deceased', label: 'Deceased' },
  { value: 'culled', label: 'Culled' },
];

const sexOptions = [
  { value: 'doe', label: 'Doe' },
  { value: 'buck', label: 'Buck' },
  { value: 'wether', label: 'Wether' },
];

const newCategoryOptions = categoryOptions.filter(c => c.value !== 'all');

export default function HerdPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAnimal, setNewAnimal] = useState({
    name: '',
    breed: '',
    sex: 'doe' as const,
    category: 'milking_doe' as const,
    birth_date: '',
  });

  const { data: animals, isLoading } = useAnimals({ search, category, status });
  const { data: stats } = useAnimalStats();
  const createAnimal = useCreateAnimal();
  const deleteAnimal = useDeleteAnimal();

  // Calculate kids count (doelings + bucklings) from animals data
  const kidsCount = animals?.filter(a => 
    a.category === 'doeling' || a.category === 'buckling'
  ).length || 0;

  const handleAddAnimal = async () => {
    if (!newAnimal.name) return;
    
    await createAnimal.mutateAsync({
      name: newAnimal.name,
      breed: newAnimal.breed || null,
      sex: newAnimal.sex,
      category: newAnimal.category,
      birth_date: newAnimal.birth_date || null,
      status: 'active',
    });
    
    setShowAddModal(false);
    setNewAnimal({ name: '', breed: '', sex: 'doe', category: 'milking_doe', birth_date: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Herd</h1>
          <p className="text-gray-500">{stats?.active || 0} active animals</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowAddModal(true)}>
          Add Animal
        </Button>
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
          <p className="text-sm text-gray-500">Bucks</p>
          <p className="text-2xl font-semibold">{stats?.bucks || 0}</p>
        </Card>
        <Card padding="sm">
          <p className="text-sm text-gray-500">Kids</p>
          <p className="text-2xl font-semibold">{(stats?.doelings || 0) + (stats?.bucklings || 0) + (stats?.kids || 0)}</p>
        </Card>
      </div>

      {/* Filters */}
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
            className="w-full sm:w-40"
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
            description="Add your first animal to get started"
            action={
              <Button onClick={() => setShowAddModal(true)}>Add Animal</Button>
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
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                  {animal.name[0]}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{animal.name}</p>
                    <Badge className={getStatusColor(animal.status)}>
                      {animal.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    {animal.breed || 'Unknown breed'} • {getCategoryDisplay(animal.category)}
                    {animal.birth_date && ` • ${calculateAge(animal.birth_date)}`}
                  </p>
                </div>

                {/* Actions */}
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
        title="Add Animal"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
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
        </div>
      </Modal>
    </div>
  );
}
