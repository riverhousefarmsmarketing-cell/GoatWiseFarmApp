'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAnimals } from '@/hooks/useAnimals';
import { useUpdateGroup } from '@/hooks/useGroups';
import {
  Card,
  Button,
  Input,
  Select,
  Modal,
  Badge,
  EmptyState,
  ErrorState,
  LoadingSpinner,
} from '@/components/ui';
import {
  Folder,
  Plus,
  Users,
  Trash2,
  Check,
  Pencil,
} from 'lucide-react';

const groupTypeOptions = [
  { value: 'breeding', label: 'Breeding Group' },
  { value: 'milking', label: 'Milking Group' },
  { value: 'kidding', label: 'Kidding Group' },
  { value: 'quarantine', label: 'Quarantine' },
  { value: 'sales', label: 'For Sale' },
  { value: 'custom', label: 'Custom' },
];

const colorOptions = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
];

export default function GroupsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);

  const [newGroup, setNewGroup] = useState({
    name: '',
    type: 'custom',
    description: '',
    color: '#3b82f6',
  });

  // Fetch groups
  const { data: groups, isLoading, isError, refetch } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch animal-group assignments
  const { data: assignments } = useQuery<any>({
    queryKey: ['animal_groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animal_groups')
        .select('*, animals(id, name)');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch all animals for assignment
  const { data: allAnimals } = useAnimals({ status: 'active' });

  // Mutations
  const createGroup = useMutation({
    mutationFn: async (group: any) => {
      const { data, error } = await (supabase
         .from('groups') as any)
         .insert([{ ...group, user_id: user?.id }])
         .select()
         .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const updateGroup = useUpdateGroup();

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['animal_groups'] });
    },
    onError: (e: any) => alert(`Could not delete the group: ${e?.message || 'please try again.'}`),
  });

  const assignAnimals = useMutation({
    mutationFn: async ({ groupId, animalIds, currentIds }: { groupId: string; animalIds: string[]; currentIds: string[] }) => {
      // Apply only the delta -- add the newly-selected, remove the deselected.
      // The old approach deleted ALL members first and then re-inserted; if that
      // insert failed (RLS/network/one bad id) the group was left empty. A diff
      // never wipes membership, and both writes are error-checked.
      const toAdd = animalIds.filter((id) => !currentIds.includes(id));
      const toRemove = currentIds.filter((id) => !animalIds.includes(id));

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('animal_groups')
          .delete()
          .eq('group_id', groupId)
          .in('animal_id', toRemove);
        if (error) throw error;
      }

      if (toAdd.length > 0) {
        const { error } = await (supabase.from('animal_groups') as any).insert(
          toAdd.map((animal_id) => ({
            group_id: groupId,
            animal_id,
            user_id: user?.id,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animal_groups'] });
    },
  });

  // Get animals in a specific group
  const getAnimalsInGroup = (groupId: string) => {
    return assignments?.filter((a: any) => a.group_id === groupId).map((a: any) => a.animals) || [];
  };

  const resetGroupForm = () => {
    setNewGroup({
      name: '',
      type: 'custom',
      description: '',
      color: '#3b82f6',
    });
  };

  const openCreateModal = () => {
    setEditingGroupId(null);
    resetGroupForm();
    setShowAddModal(true);
  };

  const openEditModal = (group: any) => {
    setEditingGroupId(group.id);
    setNewGroup({
      name: group.name || '',
      type: group.type || 'custom',
      description: group.description || '',
      color: group.color || '#3b82f6',
    });
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setEditingGroupId(null);
  };

  const handleSaveGroup = async () => {
    if (!newGroup.name) return;

    const fields = {
      name: newGroup.name,
      type: newGroup.type,
      description: newGroup.description || null,
      color: newGroup.color,
    };

    try {
      if (editingGroupId) {
        await updateGroup.mutateAsync({ id: editingGroupId, updates: fields });
      } else {
        await createGroup.mutateAsync(fields);
      }
    } catch (e: any) {
      alert(
        `Could not ${editingGroupId ? 'update' : 'create'} the group: ${
          e?.message || 'please try again.'
        }`
      );
      return;
    }

    setShowAddModal(false);
    setEditingGroupId(null);
    resetGroupForm();
  };

  const openAssignModal = (group: any) => {
    setSelectedGroup(group);
    const currentAnimals = assignments
      ?.filter((a: any) => a.group_id === group.id)
       .map((a: any) => a.animal_id) || [];
    setSelectedAnimals(currentAnimals);
    setShowAssignModal(true);
  };

  const handleAssignAnimals = async () => {
    if (!selectedGroup) return;

    const currentIds: string[] = assignments
      ?.filter((a: any) => a.group_id === selectedGroup.id)
      .map((a: any) => a.animal_id) || [];

    try {
      await assignAnimals.mutateAsync({
        groupId: selectedGroup.id,
        animalIds: selectedAnimals,
        currentIds,
      });
    } catch (e: any) {
      alert(`Could not assign animals: ${e?.message || 'please try again.'}`);
      return;
    }

    setShowAssignModal(false);
    setSelectedGroup(null);
    setSelectedAnimals([]);
  };

  const toggleAnimalSelection = (animalId: string) => {
    setSelectedAnimals(prev =>
      prev.includes(animalId)
        ? prev.filter(id => id !== animalId)
        : [...prev, animalId]
    );
  };

  const getTypeLabel = (type: string) => {
    return groupTypeOptions.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="text-gray-500">Organize your animals into custom groups</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
          Create Group
        </Button>
      </div>

      {/* Groups Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : isError ? (
        <Card>
          <ErrorState onRetry={() => refetch()} />
        </Card>
      ) : !groups?.length ? (
        <Card>
          <EmptyState
            icon={<Folder className="h-12 w-12" />}
            title="No groups yet"
            description="Create groups to organize your animals"
            action={<Button onClick={openCreateModal}>Create Group</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group: any) => {
            const animalsInGroup = getAnimalsInGroup(group.id);
            return (
              <Card key={group.id} className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${group.color}20` }}
                    >
                      <Folder className="h-5 w-5" style={{ color: group.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{group.name}</h3>
                      <p className="text-sm text-gray-500">{getTypeLabel(group.type)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openAssignModal(group)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                      title="Assign animals"
                    >
                      <Users className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(group)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                      title="Edit group"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this group?')) {
                          deleteGroup.mutate(group.id);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
                      title="Delete group"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {group.description && (
                  <p className="text-sm text-gray-600 mb-3">{group.description}</p>
                )}

                {/* Animals */}
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {animalsInGroup.length} animal{animalsInGroup.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => openAssignModal(group)}
                      className="text-sm text-primary-600 hover:underline"
                    >
                      Manage
                    </button>
                  </div>

                  {animalsInGroup.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {animalsInGroup.slice(0, 6).map((animal: any) => (
                        <Badge key={animal?.id} variant="default" className="text-xs">
                          {animal?.name}
                        </Badge>
                      ))}
                      {animalsInGroup.length > 6 && (
                        <Badge variant="default" className="text-xs">
                          +{animalsInGroup.length - 6} more
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No animals assigned</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      <Modal
        open={showAddModal}
        onClose={closeAddModal}
        title={editingGroupId ? 'Edit Group' : 'Create Group'}
        footer={
          <>
            <Button variant="ghost" onClick={closeAddModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveGroup}
              loading={editingGroupId ? updateGroup.isPending : createGroup.isPending}
            >
              {editingGroupId ? 'Save Changes' : 'Create Group'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Group Name"
            value={newGroup.name}
            onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
            placeholder="e.g., Milking Does 2024"
            required
          />
          <Select
            label="Group Type"
            options={groupTypeOptions}
            value={newGroup.type}
            onChange={(e) => setNewGroup({ ...newGroup, type: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setNewGroup({ ...newGroup, color: color.value })}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    newGroup.color === color.value
                      ? 'border-gray-900 scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              placeholder="Optional description for this group"
            />
          </div>
        </div>
      </Modal>

      {/* Assign Animals Modal */}
      <Modal
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={`Assign Animals to "${selectedGroup?.name}"`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignAnimals} loading={assignAnimals.isPending}>
              Save ({selectedAnimals.length} selected)
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select animals to include in this group. Click to toggle selection.
          </p>

          <div className="flex gap-2 mb-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSelectedAnimals((prev) => Array.from(new Set([...prev, ...(allAnimals?.map(a => a.id) || [])])))}
            >
              Select All
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSelectedAnimals([])}
            >
              Clear All
            </Button>
          </div>

          <div className="max-h-80 overflow-y-auto border rounded-lg divide-y">
            {allAnimals?.map((animal: any) => {
              const isSelected = selectedAnimals.includes(animal.id);
              return (
                <button
                  key={animal.id}
                  type="button"
                  onClick={() => toggleAnimalSelection(animal.id)}
                  className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
                    isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-900">{animal.name}</p>
                    <p className="text-sm text-gray-500">{animal.category} • {animal.breed}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isSelected
                      ? 'bg-primary-600 border-primary-600'
                      : 'border-gray-300'
                  }`}>
                    {isSelected && <Check className="h-4 w-4 text-white" />}
                  </div>
                </button>
              );
            })}
            {!allAnimals?.length && (
              <div className="p-4 text-center text-gray-500">
                No animals available
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
