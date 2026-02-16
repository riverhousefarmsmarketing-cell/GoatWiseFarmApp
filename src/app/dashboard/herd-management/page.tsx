'use client';

import { useState } from 'react';
import { 
  useHerdsWithStats, 
  useCreateHerd, 
  useDeleteHerd,
  useHerdTransfers,
  useCompleteHerdTransfer,
  useFeedInventory,
  useCreateFeedInventory,
  useUpdateFeedInventory,
  useDeleteFeedInventory,
  useFeedTypes,
  useCreateFeedType,
  useDeleteFeedType,
  useFeedSchedules,
  useCreateFeedSchedule,
} from '@/hooks/useHerds';
import { useAnimals } from '@/hooks/useAnimals';
import {
  Card,
  Button,
  Input,
  Select,
  Modal,
  Badge,
  StatCard,
  EmptyState,
  LoadingSpinner,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import {
  Plus,
  Users,
  Truck,
  Package,
  Calendar,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Wheat,
  Scale,
  MapPin,
  BarChart3,
  Lightbulb,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

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

const feedTypes = [
  { value: 'hay_alfalfa', label: 'Alfalfa Hay' },
  { value: 'hay_grass', label: 'Grass Hay' },
  { value: 'hay_timothy', label: 'Timothy Hay' },
  { value: 'hay_orchard', label: 'Orchard Grass' },
  { value: 'grain_goat', label: 'Goat Feed/Grain' },
  { value: 'grain_sweet', label: 'Sweet Feed' },
  { value: 'pellets', label: 'Pelleted Feed' },
  { value: 'minerals', label: 'Loose Minerals' },
  { value: 'mineral_block', label: 'Mineral Block' },
  { value: 'beet_pulp', label: 'Beet Pulp' },
  { value: 'boss', label: 'Black Oil Sunflower Seeds' },
  { value: 'alfalfa_pellets', label: 'Alfalfa Pellets' },
  { value: 'browse', label: 'Browse/Forage' },
  { value: 'other', label: 'Other' },
];

const feedUnits = [
  { value: 'lbs', label: 'Pounds (lbs)' },
  { value: 'oz', label: 'Ounces (oz)' },
  { value: 'bales', label: 'Bales' },
  { value: 'flakes', label: 'Flakes' },
  { value: 'cups', label: 'Cups' },
  { value: 'scoops', label: 'Scoops' },
  { value: 'bags', label: 'Bags' },
];

// ==========================================
// MANAGEMENT TIPS DATA
// ==========================================

const managementTips = [
  {
    id: 'space',
    title: 'Space Requirements',
    icon: '📏',
    content: `**Indoor Space:** 15-20 sq ft per adult goat in shelters. Kids need 5-10 sq ft each.

**Outdoor Space:** Minimum 200 sq ft per goat in dry lots. Pasture: 2-10 goats per acre depending on forage quality.

**Buck Housing:** Keep bucks separate with at least 20 sq ft shelter space and secure 5-foot fencing.`,
  },
  {
    id: 'famacha',
    title: 'FAMACHA Scoring',
    icon: '👁️',
    content: `Check inner eyelid color every 2-4 weeks during parasite season:

**Score 1 (Red):** Optimal - No treatment needed
**Score 2 (Red-Pink):** Acceptable - Monitor closely  
**Score 3 (Pink):** Borderline - Consider deworming
**Score 4 (Pink-White):** Anemic - Deworm immediately
**Score 5 (White):** Severe - Emergency treatment + supportive care

Use targeted selective treatment (TST) - only deworm animals that need it to prevent resistance.`,
  },
  {
    id: 'rotation',
    title: 'Pasture Rotation',
    icon: '🔄',
    content: `**Why Rotate:** Breaks parasite cycles, prevents overgrazing, improves forage quality.

**Schedule:** Move goats when grass is grazed to 3-4 inches. Rest pastures 30-60 days.

**Multi-Species Grazing:** Rotate with cattle or horses - they don't share parasites and clean up what goats leave.

**Hot Composting:** Parasite larvae die at 130°F+ - compost manure before spreading on pastures.`,
  },
  {
    id: 'biosecurity',
    title: 'Biosecurity Protocols',
    icon: '🛡️',
    content: `**New Animals:** Quarantine 30 days minimum. Test for CAE, CL, Johne's before introduction.

**Visitor Policy:** Provide boot covers or foot baths. Limit direct animal contact.

**Equipment:** Don't share equipment between farms. Disinfect regularly.

**Closed Herd:** Consider keeping a closed herd - adds animals only through your own breeding.`,
  },
  {
    id: 'observation',
    title: 'Daily Observation',
    icon: '📋',
    content: `**Check Daily:**
- Appetite and water intake
- Posture and gait
- Eye brightness and position
- Coat condition
- Manure consistency
- Udder appearance (does)
- Rumen activity (listen for gurgling)

**Document:** Keep records of any changes - early detection saves lives.`,
  },
  {
    id: 'hoofcare',
    title: 'Hoof Maintenance',
    icon: '🦶',
    content: `**Frequency:** Trim every 4-8 weeks depending on terrain and growth rate.

**Signs of Overgrowth:** Curling, splaying, difficulty walking.

**Hoof Rot Prevention:** Keep areas dry, remove manure buildup, provide dry standing areas.

**Tools Needed:** Sharp hoof shears, hoof knife, blood stop powder, brush.

**Technique:** Trim parallel to coronary band, removing excess wall. Don't cut into pink tissue.`,
  },
];

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================

export default function HerdManagementPage() {
  const [activeTab, setActiveTab] = useState<'herds' | 'transfers' | 'feed' | 'tips' | 'analytics'>('herds');
  
  // Herds state
  const [showAddHerdModal, setShowAddHerdModal] = useState(false);
  const [newHerd, setNewHerd] = useState({
    name: '',
    description: '',
    color: '#16a34a',
    location: '',
    pasture_name: '',
  });

  // Transfer state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFilter, setTransferFilter] = useState('all');
  const [newTransfer, setNewTransfer] = useState({
    animal_id: '',
    to_herd_id: '',
    reason: '',
  });

  // Feed state
  const [showAddFeedModal, setShowAddFeedModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newFeed, setNewFeed] = useState({
    feed_type: '',
    brand: '',
    quantity_on_hand: '',
    unit: 'lbs',
    unit_cost: '',
    low_stock_threshold: '',
    supplier: '',
    storage_location: '',
  });
  const [newSchedule, setNewSchedule] = useState({
    herd_id: '',
    feed_type: '',
    quantity_per_feeding: '',
    unit: 'lbs',
    feeding_times: ['07:00', '17:00'],
  });

  // Data hooks
  const { data: herds, isLoading: herdsLoading, error: herdsError } = useHerdsWithStats();
  const { data: animals } = useAnimals({ status: 'active' });
  const { data: transfers } = useHerdTransfers(transferFilter);
  const { data: feedInventory } = useFeedTypes();
  const { data: feedSchedules } = useFeedSchedules();

  // Mutations
  const createHerd = useCreateHerd();
  const deleteHerd = useDeleteHerd();
  const completeTransfer = useCompleteHerdTransfer();
  const createFeedItem = useCreateFeedType();
  const deleteFeedItem = useDeleteFeedType();
  const createSchedule = useCreateFeedSchedule();

  // Stats
  const totalAnimals = herds?.reduce((sum: number, h: any) => sum + h.animalCount, 0) || 0;
  const totalHerds = herds?.filter((h: any) => h.id !== 'unassigned').length || 0;
  const pendingTransfers = transfers?.filter((t: any) => t.status === 'pending').length || 0;
  const lowStockItems = 0; // TODO: Implement with feed_inventory + feed_types join

  // Handlers - WITH ERROR HANDLING
  const handleCreateHerd = async () => {
    if (!newHerd.name.trim()) {
      alert('Please enter a herd name');
      return;
    }
    
    try {
      const result = await createHerd.mutateAsync(newHerd);
      setShowAddHerdModal(false);
      setNewHerd({ name: '', description: '', color: '#16a34a', location: '', pasture_name: '' });
    } catch (error: any) {
      console.error('Failed to create herd:', error);
      alert(`Failed to create herd: ${error?.message || JSON.stringify(error)}`);
    }
  };

  const handleCreateFeed = async () => {
    if (!newFeed.feed_type) {
      alert('Please enter a feed name');
      return;
    }
    
    try {
      await createFeedItem.mutateAsync({
        name: newFeed.feed_type,
        category: 'other',
        unit: newFeed.unit,
        cost_per_unit: newFeed.unit_cost ? parseFloat(newFeed.unit_cost) : null,
        reorder_point: newFeed.low_stock_threshold ? parseFloat(newFeed.low_stock_threshold) : null,
        supplier: newFeed.supplier || null,
        notes: newFeed.brand ? `Brand: ${newFeed.brand}` : null,
      });
      setShowAddFeedModal(false);
      setNewFeed({ feed_type: '', brand: '', quantity_on_hand: '', unit: 'lbs', unit_cost: '', low_stock_threshold: '', supplier: '', storage_location: '' });
    } catch (error: any) {
      console.error('Failed to create feed item:', error);
      alert(`Failed to create feed item: ${error?.message || JSON.stringify(error)}`);
    }
  };

  const handleCreateSchedule = async () => {
    if (!newSchedule.herd_id || !newSchedule.feed_type || !newSchedule.quantity_per_feeding) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      await createSchedule.mutateAsync({
        herd_id: newSchedule.herd_id,
        feed_type: newSchedule.feed_type,
        quantity_per_feeding: parseFloat(newSchedule.quantity_per_feeding),
        unit: newSchedule.unit,
        feeding_times: newSchedule.feeding_times as unknown as import('@/types/database').Json,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        status: 'active',
      } as any);
      setShowScheduleModal(false);
      setNewSchedule({ herd_id: '', feed_type: '', quantity_per_feeding: '', unit: 'lbs', feeding_times: ['07:00', '17:00'] });
    } catch (error: any) {
      console.error('Failed to create schedule:', error);
      alert(`Failed to create schedule: ${error?.message || JSON.stringify(error)}`);
    }
  };

  const tabs = [
    { id: 'herds', label: 'Herds', icon: Users },
    { id: 'transfers', label: 'Transfers', icon: Truck, badge: pendingTransfers > 0 ? pendingTransfers : undefined },
    { id: 'feed', label: 'Feed Management', icon: Wheat, badge: lowStockItems > 0 ? lowStockItems : undefined },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'tips', label: 'Management Tips', icon: Lightbulb },
  ];

  // Show error if herds failed to load
  if (herdsError) {
    console.error('Herds loading error:', herdsError);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Herd Management</h1>
          <p className="text-gray-500">Organize, track, and manage your herds</p>
        </div>
        {activeTab === 'herds' && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowAddHerdModal(true)}>
            New Herd
          </Button>
        )}
        {activeTab === 'feed' && (
          <div className="flex gap-2">
            <Button variant="secondary" leftIcon={<Calendar className="h-4 w-4" />} onClick={() => setShowScheduleModal(true)}>
              Add Schedule
            </Button>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowAddFeedModal(true)}>
              Add Feed Item
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Herds"
          value={totalHerds}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Total Animals"
          value={totalAnimals}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Pending Transfers"
          value={pendingTransfers}
          icon={<Truck className="h-5 w-5" />}
        />
        <StatCard
          title="Low Stock Items"
          value={lowStockItems}
          icon={<AlertTriangle className="h-5 w-5" />}
          className={lowStockItems > 0 ? 'border-amber-200 bg-amber-50' : ''}
        />
      </div>

      {/* Tabs */}
      <div className="border-b overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.badge && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'herds' && (
        <div className="space-y-6">
          {herdsLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner className="h-8 w-8" />
            </div>
          ) : herdsError ? (
            <Card className="p-6">
              <div className="text-center text-red-600">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p className="font-medium">Failed to load herds</p>
                <p className="text-sm mt-1">{(herdsError as any)?.message || 'Unknown error'}</p>
                <p className="text-xs mt-2 text-gray-500">
                  Make sure the 'herds' table exists in your Supabase database.
                </p>
              </div>
            </Card>
          ) : !herds?.length ? (
            <Card>
              <EmptyState
                icon={<Users className="h-12 w-12" />}
                title="No herds yet"
                description="Create your first herd to organize your animals"
                action={<Button onClick={() => setShowAddHerdModal(true)}>Create Herd</Button>}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {herds.map((herd) => (
                <Link key={herd.id} href={`/dashboard/herd-detail/${herd.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                          style={{ backgroundColor: herd.color }}
                        >
                          🐐
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{herd.name}</h3>
                          {herd.location && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {herd.location}
                            </p>
                          )}
                        </div>
                      </div>
                      {herd.id !== 'unassigned' && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            if (confirm(`Delete "${herd.name}"? Animals will be unassigned.`)) {
                              deleteHerd.mutate(herd.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {herd.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{herd.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{herd.animalCount}</span>
                        <span className="text-gray-500">animals</span>
                      </div>
                      {herd.milkingCount > 0 && (
                        <div className="text-gray-500">
                          {herd.milkingCount} milking
                        </div>
                      )}
                      {herd.buckCount > 0 && (
                        <div className="text-gray-500">
                          {herd.buckCount} buck{herd.buckCount > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'transfers' && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <Select
                options={[
                  { value: 'all', label: 'All Transfers' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                value={transferFilter}
                onChange={(e) => setTransferFilter(e.target.value)}
                className="w-full sm:w-48"
              />
              <Button variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowTransferModal(true)}>
                Request Transfer
              </Button>
            </div>
          </Card>

          <Card padding="none">
            {!transfers?.length ? (
              <EmptyState
                icon={<Truck className="h-8 w-8" />}
                title="No transfers"
                description="Transfer animals between herds"
              />
            ) : (
              <div className="divide-y">
                {transfers.map((transfer: any) => (
                  <div key={transfer.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transfer.status === 'pending' ? 'bg-amber-100' :
                        transfer.status === 'completed' ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        {transfer.status === 'pending' ? <Clock className="h-5 w-5 text-amber-600" /> :
                         transfer.status === 'completed' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                         <XCircle className="h-5 w-5 text-gray-600" />}
                      </div>
                      <div>
                        <p className="font-medium">{transfer.animal?.name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span style={{ color: transfer.from_herd?.color }}>{transfer.from_herd?.name || 'Unassigned'}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span style={{ color: transfer.to_herd?.color }}>{transfer.to_herd?.name}</span>
                        </div>
                        {transfer.reason && (
                          <p className="text-sm text-gray-500">{transfer.reason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm text-gray-500">
                        {formatDate(transfer.requested_date)}
                      </div>
                      {transfer.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => completeTransfer.mutate(transfer.id)}
                          loading={completeTransfer.isPending}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'feed' && (
        <div className="space-y-6">
          {/* Feed Inventory */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Feed Inventory</h2>
            <Card padding="none">
              {!feedInventory?.length ? (
                <EmptyState
                  icon={<Package className="h-8 w-8" />}
                  title="No feed inventory"
                  description="Track your feed supplies"
                  action={<Button onClick={() => setShowAddFeedModal(true)}>Add Feed Item</Button>}
                />
              ) : (
                <div className="divide-y">
                  {feedInventory.map((item: any) => {
                    const isLow = item.reorder_point && false; // TODO: check actual inventory quantity
                    return (
                      <div key={item.id} className={`p-4 flex items-center justify-between ${isLow ? 'bg-amber-50' : ''}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isLow ? 'bg-amber-200' : 'bg-gray-100'}`}>
                            <Wheat className={`h-5 w-5 ${isLow ? 'text-amber-700' : 'text-gray-600'}`} />
                          </div>
                          <div>
                            <p className="font-medium">
                              {item.name}
                            </p>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              {item.category && <span>📦 {item.category}</span>}
                              {item.supplier && <span>🏪 {item.supplier}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`font-semibold ${isLow ? 'text-amber-700' : ''}`}>
                              {item.unit}
                            </p>
                            {isLow && (
                              <p className="text-xs text-amber-600">Low stock!</p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (confirm('Delete this feed item?')) {
                                deleteFeedItem.mutate(item.id);
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Feed Schedules */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Feeding Schedules</h2>
            <Card padding="none">
              {!feedSchedules?.length ? (
                <EmptyState
                  icon={<Calendar className="h-8 w-8" />}
                  title="No feeding schedules"
                  description="Set up feeding schedules for your herds"
                  action={<Button onClick={() => setShowScheduleModal(true)}>Create Schedule</Button>}
                />
              ) : (
                <div className="divide-y">
                  {feedSchedules.map((schedule: any) => (
                    <div key={schedule.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: schedule.herd?.color || '#9ca3af' }}
                        >
                          🐐
                        </div>
                        <div>
                          <p className="font-medium">{schedule.herd?.name}</p>
                          <p className="text-sm text-gray-500">
                            {feedTypes.find((f: any) => f.value === schedule.feed_type)?.label || schedule.feed_type}
                            {' • '}{schedule.quantity_per_feeding} {schedule.unit} per feeding
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={schedule.status === 'active' ? 'success' : 'default'}>
                          {schedule.status}
                        </Badge>
                        <p className="text-sm text-gray-500 mt-1">
                          {schedule.feeding_times?.join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Herd Distribution</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Herd size chart - simplified bar representation */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Animals per Herd</h3>
                <div className="space-y-3">
                  {herds?.filter((h: any) => h.animalCount > 0).map((herd) => (
                    <div key={herd.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{herd.name}</span>
                        <span className="font-medium">{herd.animalCount}</span>
                      </div>
                      <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(herd.animalCount / totalAnimals) * 100}%`,
                            backgroundColor: herd.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category breakdown */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Animal Categories</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Milking Does', count: herds?.reduce((s, h) => s + h.milkingCount, 0) || 0, color: '#16a34a' },
                    { label: 'Bucks', count: herds?.reduce((s, h) => s + h.buckCount, 0) || 0, color: '#2563eb' },
                    { label: 'Other', count: totalAnimals - (herds?.reduce((s, h) => s + h.milkingCount + h.buckCount, 0) || 0), color: '#9ca3af' },
                  ].map((cat) => (
                    <div key={cat.label} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm">{cat.label}</span>
                      </div>
                      <span className="font-medium">{cat.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Feed Usage Summary</h2>
            <p className="text-gray-500">
              Track feed consumption trends and costs over time. 
              <span className="text-primary-600 cursor-pointer"> Coming soon!</span>
            </p>
          </Card>
        </div>
      )}

      {activeTab === 'tips' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {managementTips.map((tip) => (
            <Card key={tip.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{tip.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{tip.title}</h3>
                  <div className="text-sm text-gray-600 whitespace-pre-line">
                    {tip.content.split('**').map((part, i) => 
                      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Herd Modal */}
      <Modal
        open={showAddHerdModal}
        onClose={() => setShowAddHerdModal(false)}
        title="Create New Herd"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddHerdModal(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateHerd} 
              loading={createHerd.isPending}
              disabled={!newHerd.name.trim()}
            >
              Create Herd
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Herd Name"
            value={newHerd.name}
            onChange={(e) => setNewHerd({ ...newHerd, name: e.target.value })}
            placeholder="e.g., Main Milking Herd"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex gap-2">
              {herdColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setNewHerd({ ...newHerd, color: color.value })}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    newHerd.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>
          <Input
            label="Location"
            value={newHerd.location}
            onChange={(e) => setNewHerd({ ...newHerd, location: e.target.value })}
            placeholder="e.g., North Pasture"
          />
          <Input
            label="Pasture/Pen Name"
            value={newHerd.pasture_name}
            onChange={(e) => setNewHerd({ ...newHerd, pasture_name: e.target.value })}
            placeholder="e.g., Pasture A"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={3}
              value={newHerd.description}
              onChange={(e) => setNewHerd({ ...newHerd, description: e.target.value })}
              placeholder="Notes about this herd..."
            />
          </div>
        </div>
      </Modal>

      {/* Add Feed Modal */}
      <Modal
        open={showAddFeedModal}
        onClose={() => setShowAddFeedModal(false)}
        title="Add Feed Item"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddFeedModal(false)}>Cancel</Button>
            <Button onClick={handleCreateFeed} loading={createFeedItem.isPending}>Add Item</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Feed Type"
            options={[{ value: '', label: 'Select type...' }, ...feedTypes]}
            value={newFeed.feed_type}
            onChange={(e) => setNewFeed({ ...newFeed, feed_type: e.target.value })}
            required
          />
          <Input
            label="Brand (optional)"
            value={newFeed.brand}
            onChange={(e) => setNewFeed({ ...newFeed, brand: e.target.value })}
            placeholder="e.g., Purina"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity on Hand"
              type="number"
              value={newFeed.quantity_on_hand}
              onChange={(e) => setNewFeed({ ...newFeed, quantity_on_hand: e.target.value })}
              required
            />
            <Select
              label="Unit"
              options={feedUnits}
              value={newFeed.unit}
              onChange={(e) => setNewFeed({ ...newFeed, unit: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Unit Cost ($)"
              type="number"
              step="0.01"
              value={newFeed.unit_cost}
              onChange={(e) => setNewFeed({ ...newFeed, unit_cost: e.target.value })}
            />
            <Input
              label="Low Stock Alert"
              type="number"
              value={newFeed.low_stock_threshold}
              onChange={(e) => setNewFeed({ ...newFeed, low_stock_threshold: e.target.value })}
              hint="Alert when below this amount"
            />
          </div>
          <Input
            label="Supplier"
            value={newFeed.supplier}
            onChange={(e) => setNewFeed({ ...newFeed, supplier: e.target.value })}
            placeholder="e.g., Tractor Supply"
          />
          <Input
            label="Storage Location"
            value={newFeed.storage_location}
            onChange={(e) => setNewFeed({ ...newFeed, storage_location: e.target.value })}
            placeholder="e.g., Barn, Shed A"
          />
        </div>
      </Modal>

      {/* Feed Schedule Modal */}
      <Modal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Create Feeding Schedule"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
            <Button onClick={handleCreateSchedule} loading={createSchedule.isPending}>Create Schedule</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Herd"
            options={[
              { value: '', label: 'Select herd...' },
              ...(herds?.filter((h: any) => h.id !== 'unassigned').map((h: any) => ({ value: h.id, label: h.name })) || []),
            ]}
            value={newSchedule.herd_id}
            onChange={(e) => setNewSchedule({ ...newSchedule, herd_id: e.target.value })}
            required
          />
          <Select
            label="Feed Type"
            options={[{ value: '', label: 'Select type...' }, ...feedTypes]}
            value={newSchedule.feed_type}
            onChange={(e) => setNewSchedule({ ...newSchedule, feed_type: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount per Feeding"
              type="number"
              step="0.1"
              value={newSchedule.quantity_per_feeding}
              onChange={(e) => setNewSchedule({ ...newSchedule, quantity_per_feeding: e.target.value })}
              required
            />
            <Select
              label="Unit"
              options={feedUnits}
              value={newSchedule.unit}
              onChange={(e) => setNewSchedule({ ...newSchedule, unit: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Feeding Times</label>
            <div className="flex gap-2">
              <Input
                type="time"
                value={newSchedule.feeding_times[0]}
                onChange={(e) => setNewSchedule({ 
                  ...newSchedule, 
                  feeding_times: [e.target.value, newSchedule.feeding_times[1]] 
                })}
              />
              <Input
                type="time"
                value={newSchedule.feeding_times[1]}
                onChange={(e) => setNewSchedule({ 
                  ...newSchedule, 
                  feeding_times: [newSchedule.feeding_times[0], e.target.value] 
                })}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        open={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Request Animal Transfer"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowTransferModal(false)}>Cancel</Button>
            <Button 
              onClick={async () => {
                if (!newTransfer.animal_id || !newTransfer.to_herd_id) return;
                const animal = animals?.find((a: any) => a.id === newTransfer.animal_id);
                // Would need to implement createHerdTransfer mutation
                setShowTransferModal(false);
              }}
            >
              Request Transfer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Animal"
            options={[
              { value: '', label: 'Select animal...' },
              ...(animals?.map((a: any) => ({ value: a.id, label: a.name })) || []),
            ]}
            value={newTransfer.animal_id}
            onChange={(e) => setNewTransfer({ ...newTransfer, animal_id: e.target.value })}
            required
          />
          <Select
            label="Transfer To"
            options={[
              { value: '', label: 'Select destination herd...' },
              ...(herds?.filter((h: any) => h.id !== 'unassigned').map((h: any) => ({ value: h.id, label: h.name })) || []),
            ]}
            value={newTransfer.to_herd_id}
            onChange={(e) => setNewTransfer({ ...newTransfer, to_herd_id: e.target.value })}
            required
          />
          <Input
            label="Reason (optional)"
            value={newTransfer.reason}
            onChange={(e) => setNewTransfer({ ...newTransfer, reason: e.target.value })}
            placeholder="e.g., Moving to breeding group"
          />
        </div>
      </Modal>
    </div>
  );
}
