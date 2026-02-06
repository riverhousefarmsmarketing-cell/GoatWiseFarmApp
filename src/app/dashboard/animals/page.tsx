'use client';

import { useState } from 'react';
import { useAnimals } from '@/hooks/useAnimals';
import { useGroups } from '@/hooks/useGroups';
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  EmptyState,
  LoadingSpinner,
} from '@/components/ui';
import { formatDate, calculateAge } from '@/lib/utils';
import {
  Search,
  Filter,
  ChevronRight,
  Heart,
  Baby,
  Milk,
  Scale,
  Calendar,
  Tag,
} from 'lucide-react';
import Link from 'next/link';

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'buck', label: 'Bucks' },
  { value: 'milking_doe', label: 'Milking Does' },
  { value: 'dry_doe', label: 'Dry Does' },
  { value: 'bred_doe', label: 'Bred Does' },
  { value: 'wether', label: 'Wethers' },
  { value: 'buckling', label: 'Bucklings' },
  { value: 'doeling', label: 'Doelings' },
];

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Sold' },
  { value: 'deceased', label: 'Deceased' },
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

export default function AnimalsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [groupFilter, setGroupFilter] = useState('all');

  const { data: animals, isLoading } = useAnimals({
    status: statusFilter === 'all' ? undefined : statusFilter,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
  }) as any;
  const { data: groups } = useGroups();

  // Filter by search and group
  const filteredAnimals = animals?.filter((animal: any) => {
    const matchesSearch = !searchQuery || 
      animal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      animal.tag_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGroup = groupFilter === 'all' ||
      (animal as any).group_ids?.includes(groupFilter);
    
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Animal Profiles</h1>
        <p className="text-gray-500">View and manage individual animal records</p>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            options={categoryOptions}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full md:w-40"
          />
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-36"
          />
          <Select
            options={[
              { value: 'all', label: 'All Groups' },
              ...(groups?.map(g => ({ value: g.id, label: g.name })) || []),
            ]}
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="w-full md:w-40"
          />
        </div>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {filteredAnimals?.length || 0} animal{filteredAnimals?.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Animals Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : !filteredAnimals?.length ? (
        <Card>
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title="No animals found"
            description="Try adjusting your filters or add new animals to your herd"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAnimals.map((animal: any) => (
            <Link key={animal.id} href={`/dashboard/animals/${animal.id}`}>
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{animal.name}</h3>
                    {animal.tag_number && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Tag className="h-3 w-3" />
                        {animal.tag_number}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className={categoryColors[animal.category] || 'bg-gray-100 text-gray-700'}>
                    {categoryLabels[animal.category] || animal.category}
                  </Badge>
                  {animal.breed && (
                    <Badge variant="default">{animal.breed}</Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  {animal.birth_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{calculateAge(animal.birth_date)}</span>
                    </div>
                  )}
                  {animal.weight && (
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-gray-400" />
                      <span>{animal.weight} lbs</span>
                    </div>
                  )}
                </div>

                {/* Group Tags */}
                {animal.group_ids?.length > 0 && groups && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex flex-wrap gap-1">
                      {animal.group_ids.slice(0, 3).map((groupId: string) => {
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
                      {animal.group_ids.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{animal.group_ids.length - 3} more
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
    </div>
  );
}
