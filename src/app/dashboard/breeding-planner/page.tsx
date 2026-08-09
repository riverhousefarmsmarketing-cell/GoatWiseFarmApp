'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAnimals } from '@/hooks/useAnimals';
import { isFemale, isIntactMale } from '@/lib/animalVocab';
import {
  Card,
  Button,
  Input,
  Select,
  Modal,
  Badge,
  EmptyState,
  LoadingSpinner,
  AnimalLink,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import {
  Calendar,
  Plus,
  Baby,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
  CheckCircle,
  Clock,
  Target,
} from 'lucide-react';
import { format, addDays, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, parseISO } from 'date-fns';

const gestationOptions = [
  { value: '150', label: 'Standard Breed (150 days)' },
  { value: '145', label: 'Mini Breed (145 days)' },
];

const statusColors: Record<string, string> = {
  planned: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-700',
  missed: 'bg-red-100 text-red-700',
};

export default function BreedingPlannerPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  const [newPlan, setNewPlan] = useState({
    name: '',
    doe_id: '',
    buck_id: '',
    planned_breeding_date: format(new Date(), 'yyyy-MM-dd'),
    gestation_days: '150',
    notes: '',
  });

  // Fetch data
  const { data: does } = useAnimals({ status: 'active' });
  const { data: activeAnimals } = useAnimals({ status: 'active' });

  const breedableDoes = does?.filter(a => isFemale(a));
  const bucks = activeAnimals?.filter(a => isIntactMale(a));

  const { data: plans, isLoading } = useQuery<any>({
    queryKey: ['breeding_plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('breeding_plans')
        .select(`
          *,
          doe:animals!breeding_plans_doe_id_fkey(id, name),
          buck:animals!breeding_plans_buck_id_fkey(id, name)
        `)
        .order('planned_breeding_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Mutations
  const createPlan = useMutation({
    mutationFn: async (plan: any) => {
      const { data, error } = await (supabase
         .from('breeding_plans') as any)
         .insert([{ ...plan, user_id: user?.id }])
         .select()
         .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breeding_plans'] });
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await (supabase
         .from('breeding_plans') as any)
         .update(updates)
         .eq('id', id)
         .select()
         .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breeding_plans'] });
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('breeding_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breeding_plans'] });
    },
  });

  // Calendar data
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get events for calendar
  const calendarEvents = useMemo(() => {
    if (!plans) return [];
    
    const events: { date: Date; type: 'breeding' | 'due'; plan: any }[] = [];
    
    plans.forEach((plan: any) => {
      if (plan.status === 'cancelled') return;
      
      // Breeding date
      const breedingDate = parseISO(plan.planned_breeding_date);
      events.push({ date: breedingDate, type: 'breeding', plan });
      
      // Due date (calculated)
      const dueDate = addDays(breedingDate, plan.gestation_days || 150);
      events.push({ date: dueDate, type: 'due', plan });
    });
    
    return events;
  }, [plans]);

  const getEventsForDay = (day: Date) => {
    return calendarEvents.filter(e => isSameDay(e.date, day));
  };

  // Stats
  const plannedCount = plans?.filter((p: any) => p.status === 'planned').length || 0;
  const upcomingBreedings = plans?.filter((p: any) => {
    if (p.status !== 'planned') return false;
    const date = parseISO(p.planned_breeding_date);
    return date >= new Date() && date <= addDays(new Date(), 30);
  }).length || 0;
  const upcomingDueDates = plans?.filter((p: any) => {
    if (p.status !== 'planned' && p.status !== 'completed') return false;
    const dueDate = addDays(parseISO(p.planned_breeding_date), p.gestation_days || 150);
    return dueDate >= new Date() && dueDate <= addDays(new Date(), 30);
  }).length || 0;

  const resetNewPlan = () => {
    setNewPlan({
      name: '',
      doe_id: '',
      buck_id: '',
      planned_breeding_date: format(new Date(), 'yyyy-MM-dd'),
      gestation_days: '150',
      notes: '',
    });
  };

  const openCreatePlan = () => {
    setEditingPlanId(null);
    resetNewPlan();
    setShowAddModal(true);
  };

  const openEditPlan = (plan: any) => {
    setEditingPlanId(plan.id);
    setNewPlan({
      name: plan.name || '',
      doe_id: plan.doe_id,
      buck_id: plan.buck_id || '',
      planned_breeding_date: plan.planned_breeding_date
        ? plan.planned_breeding_date.slice(0, 10)
        : format(new Date(), 'yyyy-MM-dd'),
      gestation_days: String(plan.gestation_days ?? '150'),
      notes: plan.notes || '',
    });
    setShowAddModal(true);
  };

  const closePlanModal = () => {
    setShowAddModal(false);
    setEditingPlanId(null);
  };

  const handleSavePlan = async () => {
    if (!newPlan.doe_id || !newPlan.planned_breeding_date) return;

    const doe = breedableDoes?.find(d => d.id === newPlan.doe_id);
    const buck = bucks?.find(b => b.id === newPlan.buck_id);

    // doe_name/buck_name are NOT columns on breeding_plans -- including them made
    // PostgREST reject the whole insert, so no plan could ever be created. Names
    // are read back via the doe:/buck: joins below, so we don't store them.
    const fields = {
      name: newPlan.name || `${doe?.name} x ${buck?.name || 'TBD'}`,
      doe_id: newPlan.doe_id,
      buck_id: newPlan.buck_id || null,
      planned_breeding_date: newPlan.planned_breeding_date,
      gestation_days: parseInt(newPlan.gestation_days),
      notes: newPlan.notes || null,
    };

    if (editingPlanId) {
      // Omit status so the plan keeps its existing status.
      await updatePlan.mutateAsync({ id: editingPlanId, updates: fields });
    } else {
      await createPlan.mutateAsync({ ...fields, status: 'planned' });
    }

    setShowAddModal(false);
    setEditingPlanId(null);
    resetNewPlan();
  };

  const handleMarkCompleted = async (planId: string) => {
    await updatePlan.mutateAsync({
      id: planId,
      updates: { status: 'completed' },
    });
  };

  const handleMarkCancelled = async (planId: string) => {
    if (!confirm('Cancel this breeding plan?')) return;
    await updatePlan.mutateAsync({
      id: planId,
      updates: { status: 'cancelled' },
    });
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Delete this breeding plan?')) return;
    await deletePlan.mutateAsync(planId);
  };

  const handleDateClick = (day: Date) => {
    setSelectedDate(day);
    setNewPlan(prev => ({
      ...prev,
      planned_breeding_date: format(day, 'yyyy-MM-dd'),
    }));
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Breeding Planner</h1>
          <p className="text-gray-500">Plan and track future breeding events</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-2 text-sm ${viewMode === 'calendar' ? 'bg-primary-100 text-primary-700' : 'bg-white'}`}
            >
              <CalendarDays className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'bg-white'}`}
            >
              List
            </button>
          </div>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreatePlan}>
            Plan Breeding
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{plannedCount}</p>
              <p className="text-sm text-gray-500">Planned Breedings</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingBreedings}</p>
              <p className="text-sm text-gray-500">Breedings (30 days)</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
              <Baby className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingDueDates}</p>
              <p className="text-sm text-gray-500">Due Dates (30 days)</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <Card className="p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}

            {/* Empty cells for days before month start */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Calendar Days */}
            {calendarDays.map(day => {
              const events = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              const hasBreeding = events.some(e => e.type === 'breeding');
              const hasDue = events.some(e => e.type === 'due');

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDateClick(day)}
                  className={`aspect-square p-1 rounded-lg border transition-colors hover:bg-gray-50 ${
                    isToday ? 'border-primary-500 bg-primary-50' : 'border-transparent'
                  }`}
                >
                  <div className="h-full flex flex-col">
                    <span className={`text-sm ${isToday ? 'font-bold text-primary-600' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex-1 flex flex-col gap-0.5 mt-1">
                      {hasBreeding && (
                        <div className="h-1.5 w-full bg-purple-400 rounded-full" title="Breeding" />
                      )}
                      {hasDue && (
                        <div className="h-1.5 w-full bg-pink-400 rounded-full" title="Due Date" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-4 border-t text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-400 rounded-full" />
              <span>Breeding Date</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-pink-400 rounded-full" />
              <span>Due Date</span>
            </div>
          </div>
        </Card>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card padding="none">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner className="h-8 w-8" />
            </div>
          ) : !plans?.length ? (
            <EmptyState
              icon={<Calendar className="h-12 w-12" />}
              title="No breeding plans"
              description="Plan your future breedings to track expected due dates"
              action={<Button onClick={openCreatePlan}>Create Plan</Button>}
            />
          ) : (
            <div className="divide-y">
              {plans.map((plan: any) => {
                const dueDate = addDays(parseISO(plan.planned_breeding_date), plan.gestation_days || 150);
                const isPast = parseISO(plan.planned_breeding_date) < new Date();

                return (
                  <div key={plan.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{plan.name || `${plan.doe?.name} x ${plan.buck?.name || 'TBD'}`}</h3>
                          <Badge className={statusColors[plan.status]}>{plan.status}</Badge>
                        </div>
                        <div className="text-sm text-gray-500 space-y-1">
                          <p>
                            <span className="font-medium">Doe:</span> {plan.doe?.name || plan.doe_name}
                            {(plan.buck?.name || plan.buck_name) && (
                              <> • <span className="font-medium">Buck:</span> {plan.buck?.name || plan.buck_name}</>
                            )}
                          </p>
                          <p>
                            <span className="font-medium">Breeding:</span> {formatDate(plan.planned_breeding_date)}
                            <span className="mx-2">→</span>
                            <span className="font-medium">Due:</span> {formatDate(dueDate)}
                            <span className="text-gray-400 ml-1">({plan.gestation_days} days)</span>
                          </p>
                        </div>
                        {plan.notes && (
                          <p className="text-sm text-gray-600 mt-2">{plan.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {plan.status === 'planned' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkCompleted(plan.id)}
                              title="Mark as completed"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkCancelled(plan.id)}
                              title="Cancel"
                            >
                              <Clock className="h-4 w-4 text-gray-400" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditPlan(plan)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(plan.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Breedings */}
        <Card>
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              Upcoming Breedings
            </h2>
          </div>
          <div className="divide-y">
            {plans?.filter((p: any) => {
              if (p.status !== 'planned') return false;
              const date = parseISO(p.planned_breeding_date);
              return date >= new Date();
            }).slice(0, 5).map((plan: any) => (
              <div key={plan.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{plan.doe_id ? <AnimalLink animalId={plan.doe_id} name={plan.doe?.name || plan.doe_name} variant="subtle" /> : (plan.doe?.name || plan.doe_name)}</p>
                  <p className="text-sm text-gray-500">
                    with {plan.buck_id ? <AnimalLink animalId={plan.buck_id} name={plan.buck?.name || plan.buck_name || 'TBD'} variant="subtle" /> : (plan.buck?.name || plan.buck_name || 'TBD')}
                  </p>
                </div>
                <Badge variant="info">{formatDate(plan.planned_breeding_date)}</Badge>
              </div>
            )) || (
              <div className="p-4 text-gray-500 text-center">No upcoming breedings</div>
            )}
          </div>
        </Card>

        {/* Upcoming Due Dates */}
        <Card>
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Baby className="h-4 w-4 text-pink-600" />
              Upcoming Due Dates
            </h2>
          </div>
          <div className="divide-y">
            {plans?.filter((p: any) => {
              if (p.status === 'cancelled') return false;
              const dueDate = addDays(parseISO(p.planned_breeding_date), p.gestation_days || 150);
              return dueDate >= new Date();
            }).slice(0, 5).map((plan: any) => {
              const dueDate = addDays(parseISO(plan.planned_breeding_date), plan.gestation_days || 150);
              return (
                <div key={plan.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{plan.doe_id ? <AnimalLink animalId={plan.doe_id} name={plan.doe?.name || plan.doe_name} variant="subtle" /> : (plan.doe?.name || plan.doe_name)}</p>
                    <p className="text-sm text-gray-500">
                      {plan.gestation_days} day gestation
                    </p>
                  </div>
                  <Badge variant="warning">{formatDate(dueDate)}</Badge>
                </div>
              );
            }) || (
              <div className="p-4 text-gray-500 text-center">No upcoming due dates</div>
            )}
          </div>
        </Card>
      </div>

      {/* Add Plan Modal */}
      <Modal
        open={showAddModal}
        onClose={closePlanModal}
        title={editingPlanId ? 'Edit Breeding Plan' : 'Plan Breeding'}
        footer={
          <>
            <Button variant="ghost" onClick={closePlanModal}>
              Cancel
            </Button>
            <Button onClick={handleSavePlan} loading={editingPlanId ? updatePlan.isPending : createPlan.isPending}>
              {editingPlanId ? 'Save Changes' : 'Create Plan'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Plan Name (optional)"
            value={newPlan.name}
            onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
            placeholder="e.g., Spring 2026 Breeding"
          />
          <Select
            label="Doe"
            options={[
              { value: '', label: 'Select doe...' },
              ...(breedableDoes?.map(d => ({ value: d.id, label: d.name })) || []),
            ]}
            value={newPlan.doe_id}
            onChange={(e) => setNewPlan({ ...newPlan, doe_id: e.target.value })}
            required
          />
          <Select
            label="Buck"
            options={[
              { value: '', label: 'TBD / Unknown' },
              ...(bucks?.map(b => ({ value: b.id, label: b.name })) || []),
            ]}
            value={newPlan.buck_id}
            onChange={(e) => setNewPlan({ ...newPlan, buck_id: e.target.value })}
          />
          <Input
            label="Planned Breeding Date"
            type="date"
            value={newPlan.planned_breeding_date}
            onChange={(e) => setNewPlan({ ...newPlan, planned_breeding_date: e.target.value })}
            required
          />
          <Select
            label="Gestation Period"
            options={gestationOptions}
            value={newPlan.gestation_days}
            onChange={(e) => setNewPlan({ ...newPlan, gestation_days: e.target.value })}
          />

          {newPlan.planned_breeding_date && (
            <div className="p-4 bg-pink-50 rounded-lg">
              <p className="text-sm font-medium text-pink-800">Estimated Due Date:</p>
              <p className="text-lg font-bold text-pink-900">
                {format(addDays(parseISO(newPlan.planned_breeding_date), parseInt(newPlan.gestation_days)), 'MMMM d, yyyy')}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={3}
              value={newPlan.notes}
              onChange={(e) => setNewPlan({ ...newPlan, notes: e.target.value })}
              placeholder="Goals, considerations, etc."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
