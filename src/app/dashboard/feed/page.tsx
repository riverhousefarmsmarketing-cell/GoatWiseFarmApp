'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useHerds } from '@/hooks/useHerds';
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  LoadingSpinner,
  Modal,
  ErrorState,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Wheat,
  Leaf,
  Sparkles,
  MoreVertical,
  ShoppingCart,
  History,
  BarChart3,
  Layers,
  Clipboard,
} from 'lucide-react';

interface FeedType {
  id: string;
  user_id: string;
  name: string;
  category: string;
  unit: string;
  cost_per_unit: number | null;
  supplier: string | null;
  reorder_point: number | null;
  notes: string | null;
  created_at: string;
}

interface FeedInventory {
  id: string;
  user_id: string;
  feed_type_id: string;
  quantity: number;
  purchase_date: string | null;
  expiration_date: string | null;
  lot_number: string | null;
  notes: string | null;
  created_at: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  hay: { label: 'Hay', icon: Wheat, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  grain: { label: 'Grain', icon: Package, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  supplement: { label: 'Supplement', icon: Sparkles, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  mineral: { label: 'Mineral', icon: Leaf, color: 'text-green-600', bgColor: 'bg-green-100' },
  other: { label: 'Other', icon: Package, color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

export default function FeedInventoryPage() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  const { data: herds } = useHerds();

  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
  const [showLogUsageModal, setShowLogUsageModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'usage'>('inventory');
  const [editingType, setEditingType] = useState<FeedType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFeedType, setSelectedFeedType] = useState<string | null>(null);

  // Form state for feed type
  const [typeFormData, setTypeFormData] = useState({
    name: '',
    category: 'hay',
    unit: 'lbs',
    cost_per_unit: '',
    supplier: '',
    reorder_point: '',
    notes: '',
  });

  // Form state for inventory
  const [inventoryFormData, setInventoryFormData] = useState({
    feed_type_id: '',
    quantity: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    expiration_date: '',
    lot_number: '',
    notes: '',
  });

  // Form state for feed usage
  const [usageFormData, setUsageFormData] = useState({
    feed_type_id: '',
    herd_id: '',
    quantity: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  // Fetch feed types
  const { data: feedTypes, isLoading: typesLoading, isError: typesError, refetch: refetchTypes } = useQuery({
    queryKey: ['feed_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_types')
        .select('*')
        .eq('user_id', user!.id)
        .order('name');
      if (error) throw error;
      return data as FeedType[];
    },
    enabled: !!user,
  });

  // Fetch feed inventory
  const { data: feedInventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ['feed_inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_inventory')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FeedInventory[];
    },
    enabled: !!user,
  });

  // Add feed type mutation
  const addTypeMutation = useMutation({
    mutationFn: async (data: Omit<FeedType, 'id' | 'created_at'>) => {
      const { error } = await (supabase as any)
        .from('feed_types')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed_types'] });
      setShowAddTypeModal(false);
      resetTypeForm();
    },
  });

  // Update feed type mutation
  const updateTypeMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<FeedType> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('feed_types')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed_types'] });
      setShowAddTypeModal(false);
      setEditingType(null);
      resetTypeForm();
    },
  });

  // Delete feed type mutation
  const deleteTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('feed_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed_types'] });
      queryClient.invalidateQueries({ queryKey: ['feed_inventory'] });
    },
  });

  // Add inventory mutation
  const addInventoryMutation = useMutation({
    mutationFn: async (data: Omit<FeedInventory, 'id' | 'created_at'>) => {
      const { error } = await (supabase as any)
        .from('feed_inventory')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed_inventory'] });
      setShowAddInventoryModal(false);
      resetInventoryForm();
    },
  });

  // Update inventory mutation
  const updateInventoryMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const { error } = await (supabase as any)
        .from('feed_inventory')
        .update({ quantity })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed_inventory'] });
    },
  });

  // Delete inventory mutation
  const deleteInventoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('feed_inventory')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed_inventory'] });
    },
  });

  // Fetch feed usage records
  const { data: feedUsage } = useQuery({
    queryKey: ['feed_usage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_usage')
        .select('*, feed_types(name, unit, cost_per_unit, category), herds(name)')
        .eq('user_id', user!.id)
        .order('date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Add feed usage mutation
  const addUsageMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase as any)
        .from('feed_usage')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed_usage'] });
      setShowLogUsageModal(false);
      resetUsageForm();
    },
  });

  // Delete feed usage mutation
  const deleteUsageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('feed_usage')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed_usage'] });
    },
  });

  const resetTypeForm = () => {
    setTypeFormData({
      name: '',
      category: 'hay',
      unit: 'lbs',
      cost_per_unit: '',
      supplier: '',
      reorder_point: '',
      notes: '',
    });
  };

  const resetInventoryForm = () => {
    setInventoryFormData({
      feed_type_id: '',
      quantity: '',
      purchase_date: format(new Date(), 'yyyy-MM-dd'),
      expiration_date: '',
      lot_number: '',
      notes: '',
    });
  };

  const resetUsageForm = () => {
    setUsageFormData({
      feed_type_id: '',
      herd_id: '',
      quantity: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
  };

  const handleUsageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addUsageMutation.mutate({
      user_id: user!.id,
      feed_type_id: usageFormData.feed_type_id,
      herd_id: usageFormData.herd_id,
      quantity: parseFloat(usageFormData.quantity),
      date: usageFormData.date,
      notes: usageFormData.notes || null,
    });
  };

  // Cost per herd calculation
  const costByHerd = useMemo(() => {
    if (!feedUsage || !herds) return [];
    const herdCosts: Record<string, { name: string; totalCost: number; totalFeedings: number; feedBreakdown: Record<string, { name: string; quantity: number; unit: string; cost: number }> }> = {};
    for (const usage of feedUsage as any[]) {
      const herdId = usage.herd_id;
      const herdName = usage.herds?.name || 'Unknown';
      const feedName = usage.feed_types?.name || 'Unknown';
      const unit = usage.feed_types?.unit || '';
      const costPerUnit = usage.feed_types?.cost_per_unit || 0;
      const cost = usage.quantity * costPerUnit;
      if (!herdCosts[herdId]) herdCosts[herdId] = { name: herdName, totalCost: 0, totalFeedings: 0, feedBreakdown: {} };
      herdCosts[herdId].totalCost += cost;
      herdCosts[herdId].totalFeedings += 1;
      if (!herdCosts[herdId].feedBreakdown[usage.feed_type_id]) herdCosts[herdId].feedBreakdown[usage.feed_type_id] = { name: feedName, quantity: 0, unit, cost: 0 };
      herdCosts[herdId].feedBreakdown[usage.feed_type_id].quantity += usage.quantity;
      herdCosts[herdId].feedBreakdown[usage.feed_type_id].cost += cost;
    }
    return Object.entries(herdCosts).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.totalCost - a.totalCost);
  }, [feedUsage, herds]);

  // Calculate inventory stats per feed type
  const inventoryStats = useMemo(() => {
    const types = feedTypes || [];
    const inventory = feedInventory || [];

    return types.map((type) => {
      const typeInventory = inventory.filter((inv) => inv.feed_type_id === type.id);
      const totalQuantity = typeInventory.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
      const isLowStock = type.reorder_point ? totalQuantity <= type.reorder_point : false;
      const totalValue = type.cost_per_unit ? totalQuantity * type.cost_per_unit : null;

      return {
        ...type,
        inventory: typeInventory,
        totalQuantity,
        isLowStock,
        totalValue,
      };
    });
  }, [feedTypes, feedInventory]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const lowStockCount = inventoryStats.filter((s) => s.isLowStock).length;
    const totalValue = inventoryStats.reduce((sum, s) => sum + (s.totalValue || 0), 0);
    const totalTypes = inventoryStats.length;
    const categoryBreakdown = inventoryStats.reduce((acc, s) => {
      const cat = s.category || 'other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { lowStockCount, totalValue, totalTypes, categoryBreakdown };
  }, [inventoryStats]);

  // Filtered inventory
  const filteredStats = useMemo(() => {
    if (selectedCategory === 'all') return inventoryStats;
    return inventoryStats.filter((s) => s.category === selectedCategory);
  }, [inventoryStats, selectedCategory]);

  const handleTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      user_id: user!.id,
      name: typeFormData.name,
      category: typeFormData.category,
      unit: typeFormData.unit,
      cost_per_unit: typeFormData.cost_per_unit ? parseFloat(typeFormData.cost_per_unit) : null,
      supplier: typeFormData.supplier || null,
      reorder_point: typeFormData.reorder_point ? parseFloat(typeFormData.reorder_point) : null,
      notes: typeFormData.notes || null,
    };

    if (editingType) {
      updateTypeMutation.mutate({ id: editingType.id, ...data });
    } else {
      addTypeMutation.mutate(data);
    }
  };

  const handleInventorySubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      user_id: user!.id,
      feed_type_id: inventoryFormData.feed_type_id,
      quantity: parseFloat(inventoryFormData.quantity),
      purchase_date: inventoryFormData.purchase_date || null,
      expiration_date: inventoryFormData.expiration_date || null,
      lot_number: inventoryFormData.lot_number || null,
      notes: inventoryFormData.notes || null,
    };

    addInventoryMutation.mutate(data);
  };

  const openEditTypeModal = (type: FeedType) => {
    setEditingType(type);
    setTypeFormData({
      name: type.name,
      category: type.category || 'other',
      unit: type.unit || 'lbs',
      cost_per_unit: type.cost_per_unit?.toString() || '',
      supplier: type.supplier || '',
      reorder_point: type.reorder_point?.toString() || '',
      notes: type.notes || '',
    });
    setShowAddTypeModal(true);
  };

  const openAddInventoryModal = (feedTypeId?: string) => {
    resetInventoryForm();
    if (feedTypeId) {
      setInventoryFormData((prev) => ({ ...prev, feed_type_id: feedTypeId }));
    }
    setShowAddInventoryModal(true);
  };

  if (typesLoading || inventoryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (typesError) {
    return (
      <div className="flex items-center justify-center h-64">
        <ErrorState onRetry={() => refetchTypes()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feed & Inventory</h1>
          <p className="text-gray-500">Track feed types, stock levels, and costs</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => { resetUsageForm(); setShowLogUsageModal(true); }}
            leftIcon={<Clipboard className="h-4 w-4" />}
          >
            Log Feed Usage
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              resetTypeForm();
              setEditingType(null);
              setShowAddTypeModal(true);
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Feed Type
          </Button>
          <Button
            onClick={() => openAddInventoryModal()}
            leftIcon={<ShoppingCart className="h-4 w-4" />}
          >
            Add Stock
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { id: 'inventory', label: 'Inventory', icon: Package },
            { id: 'usage', label: 'Feed Usage by Herd', icon: Layers },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'inventory' && (<>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding="sm" className="text-center">
          <Package className="h-5 w-5 mx-auto mb-1 text-primary-600" />
          <p className="text-2xl font-bold">{summaryStats.totalTypes}</p>
          <p className="text-xs text-gray-500">Feed Types</p>
        </Card>
        <Card padding="sm" className="text-center">
          <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
          <p className="text-2xl font-bold text-yellow-600">{summaryStats.lowStockCount}</p>
          <p className="text-xs text-gray-500">Low Stock</p>
        </Card>
        <Card padding="sm" className="text-center">
          <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-600" />
          <p className="text-2xl font-bold text-green-600">
            ${summaryStats.totalValue.toFixed(0)}
          </p>
          <p className="text-xs text-gray-500">Inventory Value</p>
        </Card>
        <Card padding="sm" className="text-center">
          <BarChart3 className="h-5 w-5 mx-auto mb-1 text-blue-600" />
          <p className="text-2xl font-bold">{Object.keys(summaryStats.categoryBreakdown).length}</p>
          <p className="text-xs text-gray-500">Categories</p>
        </Card>
      </div>

      {/* Category Filter */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={selectedCategory === 'all' ? 'primary' : 'outline'}
            onClick={() => setSelectedCategory('all')}
          >
            All ({inventoryStats.length})
          </Button>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const count = inventoryStats.filter((s) => s.category === key).length;
            if (count === 0) return null;
            const Icon = config.icon;
            return (
              <Button
                key={key}
                size="sm"
                variant={selectedCategory === key ? 'primary' : 'outline'}
                onClick={() => setSelectedCategory(key)}
                leftIcon={<Icon className="h-4 w-4" />}
              >
                {config.label} ({count})
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Inventory Cards */}
      {filteredStats.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 mb-4">No feed types found</p>
          <Button
            onClick={() => {
              resetTypeForm();
              setEditingType(null);
              setShowAddTypeModal(true);
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Your First Feed Type
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStats.map((item) => {
            const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
            const Icon = config.icon;

            return (
              <Card key={item.id} className="overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500">{config.label}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditTypeModal(item)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${item.name}"? This will also delete all inventory records.`)) {
                            deleteTypeMutation.mutate(item.id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stock Level */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-500">Current Stock</span>
                    {item.isLowStock && (
                      <Badge variant="warning" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Low Stock
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{item.totalQuantity.toFixed(0)}</span>
                    <span className="text-gray-500">{item.unit}</span>
                  </div>

                  {/* Reorder point indicator */}
                  {item.reorder_point && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Reorder at {item.reorder_point} {item.unit}</span>
                        <span>{Math.round((item.totalQuantity / (item.reorder_point * 2)) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.isLowStock ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (item.totalQuantity / (item.reorder_point * 2)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Value & Cost */}
                  <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                    {item.cost_per_unit && (
                      <>
                        <div>
                          <p className="text-gray-500">Cost/Unit</p>
                          <p className="font-medium">${item.cost_per_unit.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Total Value</p>
                          <p className="font-medium text-green-600">
                            ${item.totalValue?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      </>
                    )}
                    {item.supplier && (
                      <div className="col-span-2">
                        <p className="text-gray-500">Supplier</p>
                        <p className="font-medium">{item.supplier}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 pb-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => openAddInventoryModal(item.id)}
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    Add Stock
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedFeedType(selectedFeedType === item.id ? null : item.id)}
                    leftIcon={<History className="h-4 w-4" />}
                  >
                    History
                  </Button>
                </div>

                {/* Inventory History (Expandable) */}
                {selectedFeedType === item.id && item.inventory.length > 0 && (
                  <div className="border-t bg-gray-50 p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Stock Records</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {item.inventory.map((inv) => (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between bg-white p-2 rounded text-sm"
                        >
                          <div>
                            <span className="font-medium">{inv.quantity} {item.unit}</span>
                            {inv.purchase_date && (
                              <span className="text-gray-400 ml-2">
                                {formatDate(inv.purchase_date)}
                              </span>
                            )}
                            {inv.lot_number && (
                              <span className="text-gray-400 ml-2">
                                Lot: {inv.lot_number}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                const newQty = prompt('Enter new quantity:', inv.quantity.toString());
                                if (newQty && !isNaN(parseFloat(newQty))) {
                                  updateInventoryMutation.mutate({
                                    id: inv.id,
                                    quantity: parseFloat(newQty),
                                  });
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this stock record?')) {
                                  deleteInventoryMutation.mutate(inv.id);
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      </>)}

      {activeTab === 'usage' && (
        <div className="space-y-6">
          {/* Cost by Herd Summary */}
          {costByHerd.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {costByHerd.map((herd) => (
                <Card key={herd.id}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{herd.name}</h3>
                      <span className="text-lg font-bold text-green-600">${herd.totalCost.toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{herd.totalFeedings} feeding{herd.totalFeedings !== 1 ? 's' : ''} logged</p>
                    <div className="space-y-1.5">
                      {Object.values(herd.feedBreakdown).map((feed, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-600">{feed.name}</span>
                          <span className="text-gray-500">{feed.quantity} {feed.unit} · ${feed.cost.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Usage Log Table */}
          <Card padding="none">
            {!feedUsage?.length ? (
              <div className="p-8 text-center">
                <Clipboard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 mb-4">No feed usage logged yet</p>
                <p className="text-sm text-gray-400 mb-4">Log what you feed each herd to track costs</p>
                <Button onClick={() => { resetUsageForm(); setShowLogUsageModal(true); }} leftIcon={<Plus className="h-4 w-4" />}>Log Feed Usage</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-sm text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Herd</th>
                      <th className="px-4 py-3 font-medium">Feed</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Cost</th>
                      <th className="px-4 py-3 font-medium">Notes</th>
                      <th className="px-4 py-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(feedUsage as any[]).map((usage: any) => {
                      const cost = usage.quantity * (usage.feed_types?.cost_per_unit || 0);
                      return (
                        <tr key={usage.id} className="group hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{formatDate(usage.date)}</td>
                          <td className="px-4 py-3 text-sm font-medium">{usage.herds?.name || '—'}</td>
                          <td className="px-4 py-3 text-sm">{usage.feed_types?.name || '—'}</td>
                          <td className="px-4 py-3 text-sm">{usage.quantity} {usage.feed_types?.unit || ''}</td>
                          <td className="px-4 py-3 text-sm">{cost > 0 ? `$${cost.toFixed(2)}` : '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{usage.notes || '—'}</td>
                          <td className="px-4 py-1">
                            <button onClick={() => { if (confirm('Delete this usage record?')) deleteUsageMutation.mutate(usage.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Add/Edit Feed Type Modal */}
      <Modal
        open={showAddTypeModal}
        onClose={() => {
          setShowAddTypeModal(false);
          setEditingType(null);
        }}
        title={editingType ? 'Edit Feed Type' : 'Add Feed Type'}
      >
        <form onSubmit={handleTypeSubmit} className="space-y-4">
          <Input
            label="Name"
            required
            value={typeFormData.name}
            onChange={(e) => setTypeFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Alfalfa Hay"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              options={Object.entries(CATEGORY_CONFIG).map(([value, config]) => ({
                value,
                label: config.label,
              }))}
              value={typeFormData.category}
              onChange={(e) => setTypeFormData((prev) => ({ ...prev, category: e.target.value }))}
            />
            <Select
              label="Unit"
              options={[
                { value: 'lbs', label: 'Pounds (lbs)' },
                { value: 'kg', label: 'Kilograms (kg)' },
                { value: 'oz', label: 'Ounces (oz)' },
                { value: 'tons', label: 'Tons' },
                { value: '50lb_bag', label: '50lb Bags' },
                { value: '25lb_bag', label: '25lb Bags' },
                { value: 'bag', label: 'Bags (other)' },
                { value: 'square_bale', label: 'Square Bales' },
                { value: 'round_bale', label: 'Round Bales' },
                { value: 'flake', label: 'Flakes' },
                { value: 'scoop', label: 'Scoops' },
                { value: 'cup', label: 'Cups' },
                { value: 'tbsp', label: 'Tablespoons' },
              ]}
              value={typeFormData.unit}
              onChange={(e) => setTypeFormData((prev) => ({ ...prev, unit: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cost per Unit ($)"
              type="number"
              step="0.01"
              value={typeFormData.cost_per_unit}
              onChange={(e) => setTypeFormData((prev) => ({ ...prev, cost_per_unit: e.target.value }))}
              placeholder="0.00"
            />
            <Input
              label="Reorder Point"
              type="number"
              value={typeFormData.reorder_point}
              onChange={(e) => setTypeFormData((prev) => ({ ...prev, reorder_point: e.target.value }))}
              placeholder="e.g., 50"
            />
          </div>

          <Input
            label="Supplier"
            value={typeFormData.supplier}
            onChange={(e) => setTypeFormData((prev) => ({ ...prev, supplier: e.target.value }))}
            placeholder="e.g., Local Feed Store"
          />

          <Input
            label="Notes"
            value={typeFormData.notes}
            onChange={(e) => setTypeFormData((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Any additional notes..."
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddTypeModal(false);
                setEditingType(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addTypeMutation.isPending || updateTypeMutation.isPending}
            >
              {editingType ? 'Update' : 'Add Feed Type'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Inventory Modal */}
      <Modal
        open={showAddInventoryModal}
        onClose={() => setShowAddInventoryModal(false)}
        title="Add Stock"
      >
        <form onSubmit={handleInventorySubmit} className="space-y-4">
          <Select
            label="Feed Type"
            required
            options={[
              { value: '', label: 'Select feed type...' },
              ...(feedTypes || []).map((type) => ({
                value: type.id,
                label: `${type.name} (${CATEGORY_CONFIG[type.category]?.label || 'Other'})`,
              })),
            ]}
            value={inventoryFormData.feed_type_id}
            onChange={(e) =>
              setInventoryFormData((prev) => ({ ...prev, feed_type_id: e.target.value }))
            }
          />

          <Input
            label="Quantity"
            type="number"
            step="0.1"
            required
            value={inventoryFormData.quantity}
            onChange={(e) =>
              setInventoryFormData((prev) => ({ ...prev, quantity: e.target.value }))
            }
            placeholder="Enter quantity"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Purchase Date"
              type="date"
              value={inventoryFormData.purchase_date}
              onChange={(e) =>
                setInventoryFormData((prev) => ({ ...prev, purchase_date: e.target.value }))
              }
            />
            <Input
              label="Expiration Date"
              type="date"
              value={inventoryFormData.expiration_date}
              onChange={(e) =>
                setInventoryFormData((prev) => ({ ...prev, expiration_date: e.target.value }))
              }
            />
          </div>

          <Input
            label="Lot Number"
            value={inventoryFormData.lot_number}
            onChange={(e) =>
              setInventoryFormData((prev) => ({ ...prev, lot_number: e.target.value }))
            }
            placeholder="Optional"
          />

          <Input
            label="Notes"
            value={inventoryFormData.notes}
            onChange={(e) =>
              setInventoryFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="Any notes about this stock..."
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddInventoryModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addInventoryMutation.isPending}>
              Add Stock
            </Button>
          </div>
        </form>
      </Modal>

      {/* Log Feed Usage Modal */}
      <Modal
        open={showLogUsageModal}
        onClose={() => setShowLogUsageModal(false)}
        title="Log Feed Usage"
      >
        <form onSubmit={handleUsageSubmit} className="space-y-4">
          <Select
            label="Feed Type"
            required
            options={[
              { value: '', label: 'Select feed type...' },
              ...(feedTypes || []).map((type) => ({
                value: type.id,
                label: `${type.name} (${type.unit})`,
              })),
            ]}
            value={usageFormData.feed_type_id}
            onChange={(e) => setUsageFormData((prev) => ({ ...prev, feed_type_id: e.target.value }))}
          />

          <Select
            label="Herd"
            required
            options={[
              { value: '', label: 'Select herd...' },
              ...(herds || []).map((herd: any) => ({
                value: herd.id,
                label: herd.name,
              })),
            ]}
            value={usageFormData.herd_id}
            onChange={(e) => setUsageFormData((prev) => ({ ...prev, herd_id: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              step="0.1"
              required
              value={usageFormData.quantity}
              onChange={(e) => setUsageFormData((prev) => ({ ...prev, quantity: e.target.value }))}
              placeholder="e.g., 2"
            />
            <Input
              label="Date"
              type="date"
              value={usageFormData.date}
              onChange={(e) => setUsageFormData((prev) => ({ ...prev, date: e.target.value }))}
            />
          </div>

          <Input
            label="Notes"
            value={usageFormData.notes}
            onChange={(e) => setUsageFormData((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Optional notes..."
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowLogUsageModal(false)}>Cancel</Button>
            <Button type="submit" disabled={addUsageMutation.isPending}>Log Usage</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
