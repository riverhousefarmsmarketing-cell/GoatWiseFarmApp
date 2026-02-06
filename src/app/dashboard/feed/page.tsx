'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  LoadingSpinner,
  Modal,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
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

  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
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
    purchase_date: new Date().toISOString().split('T')[0],
    expiration_date: '',
    lot_number: '',
    notes: '',
  });

  // Fetch feed types
  const { data: feedTypes, isLoading: typesLoading } = useQuery({
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
      purchase_date: new Date().toISOString().split('T')[0],
      expiration_date: '',
      lot_number: '',
      notes: '',
    });
  };

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
                { value: 'tons', label: 'Tons' },
                { value: 'bales', label: 'Bales' },
                { value: 'bags', label: 'Bags' },
                { value: 'oz', label: 'Ounces (oz)' },
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
    </div>
  );
}
