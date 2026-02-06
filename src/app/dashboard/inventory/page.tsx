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
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Calendar,
  Edit2,
  Trash2,
  ShoppingCart,
  History,
  BarChart3,
  Wheat,
  Pill,
  Sparkles,
  Box,
} from 'lucide-react';

interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  reorder_level: number;
  supplier: string | null;
  notes: string | null;
  last_purchased: string | null;
  created_at: string;
}

interface InventoryTransaction {
  id: string;
  user_id: string;
  inventory_item_id: string;
  type: 'purchase' | 'use' | 'adjustment' | 'waste';
  quantity: number;
  unit_cost: number | null;
  date: string;
  notes: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: 'feed', label: 'Feed', icon: Wheat },
  { value: 'hay', label: 'Hay/Forage', icon: Package },
  { value: 'grain', label: 'Grain/Concentrate', icon: Box },
  { value: 'mineral', label: 'Minerals', icon: Sparkles },
  { value: 'supplement', label: 'Supplements', icon: Pill },
  { value: 'medical', label: 'Medical Supplies', icon: Pill },
  { value: 'bedding', label: 'Bedding', icon: Box },
  { value: 'equipment', label: 'Equipment', icon: Package },
  { value: 'other', label: 'Other', icon: Package },
];

const UNITS = [
  { value: 'lbs', label: 'Pounds (lbs)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'bags', label: 'Bags' },
  { value: 'bales', label: 'Bales' },
  { value: 'tons', label: 'Tons' },
  { value: 'gallons', label: 'Gallons' },
  { value: 'liters', label: 'Liters' },
  { value: 'units', label: 'Units' },
  { value: 'boxes', label: 'Boxes' },
  { value: 'bottles', label: 'Bottles' },
];

export default function InventoryPage() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'inventory' | 'transactions' | 'analytics'>('inventory');
  const [showItemModal, setShowItemModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<string>('');

  // Item form state
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'feed',
    quantity: '',
    unit: 'lbs',
    cost_per_unit: '',
    reorder_level: '',
    supplier: '',
    notes: '',
  });

  // Transaction form state
  const [transactionForm, setTransactionForm] = useState({
    inventory_item_id: '',
    type: 'purchase' as 'purchase' | 'use' | 'adjustment' | 'waste',
    quantity: '',
    unit_cost: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Fetch inventory items
  const { data: inventoryItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['inventory_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('user_id', user!.id)
        .order('name');
      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!user,
  });

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['inventory_transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*')
        .eq('user_id', user!.id)
        .order('date', { ascending: false });
      if (error) throw error;
      return data as InventoryTransaction[];
    },
    enabled: !!user,
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (data: Omit<InventoryItem, 'id' | 'created_at'>) => {
      const { error } = await (supabase as any)
        .from('inventory_items')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      setShowItemModal(false);
      resetItemForm();
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<InventoryItem> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('inventory_items')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      setShowItemModal(false);
      setEditingItem(null);
      resetItemForm();
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('inventory_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
    },
  });

  // Add transaction mutation
  const addTransactionMutation = useMutation({
    mutationFn: async (data: Omit<InventoryTransaction, 'id' | 'created_at'>) => {
      // Insert transaction
      const { error: transError } = await (supabase as any)
        .from('inventory_transactions')
        .insert(data);
      if (transError) throw transError;

      // Update inventory quantity
      const item = (inventoryItems as InventoryItem[])?.find(i => i.id === data.inventory_item_id);
      if (item) {
        let newQuantity = item.quantity;
        if (data.type === 'purchase') {
          newQuantity += data.quantity;
        } else if (data.type === 'use' || data.type === 'waste') {
          newQuantity -= data.quantity;
        } else if (data.type === 'adjustment') {
          newQuantity = data.quantity; // Direct set
        }

        const updateData: any = { quantity: Math.max(0, newQuantity) };
        if (data.type === 'purchase') {
          updateData.last_purchased = data.date;
          if (data.unit_cost) {
            updateData.cost_per_unit = data.unit_cost;
          }
        }

        const { error: updateError } = await (supabase as any)
          .from('inventory_items')
          .update(updateData)
          .eq('id', data.inventory_item_id);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_transactions'] });
      setShowTransactionModal(false);
      resetTransactionForm();
    },
  });

  const resetItemForm = () => {
    setItemForm({
      name: '',
      category: 'feed',
      quantity: '',
      unit: 'lbs',
      cost_per_unit: '',
      reorder_level: '',
      supplier: '',
      notes: '',
    });
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      inventory_item_id: '',
      type: 'purchase',
      quantity: '',
      unit_cost: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  // Calculate stats
  const stats = useMemo(() => {
    const items = (inventoryItems as InventoryItem[]) || [];
    const trans = (transactions as InventoryTransaction[]) || [];

    const totalItems = items.length;
    const lowStock = items.filter(i => i.quantity <= i.reorder_level).length;
    const outOfStock = items.filter(i => i.quantity === 0).length;

    // Total inventory value
    const totalValue = items.reduce((sum, i) => sum + (i.quantity * i.cost_per_unit), 0);

    // This month's spending (purchases)
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const monthlyPurchases = trans
      .filter(t => t.type === 'purchase' && new Date(t.date) >= thisMonth)
      .reduce((sum, t) => sum + (t.quantity * (t.unit_cost || 0)), 0);

    // This month's usage
    const monthlyUsage = trans
      .filter(t => t.type === 'use' && new Date(t.date) >= thisMonth)
      .reduce((sum, t) => sum + t.quantity, 0);

    return {
      totalItems,
      lowStock,
      outOfStock,
      totalValue,
      monthlyPurchases,
      monthlyUsage,
    };
  }, [inventoryItems, transactions]);

  // Filter items
  const filteredItems = useMemo(() => {
    const items = (inventoryItems as InventoryItem[]) || [];
    if (selectedCategory === 'all') return items;
    return items.filter(i => i.category === selectedCategory);
  }, [inventoryItems, selectedCategory]);

  // Low stock items
  const lowStockItems = useMemo(() => {
    const items = (inventoryItems as InventoryItem[]) || [];
    return items.filter(i => i.quantity <= i.reorder_level && i.quantity > 0);
  }, [inventoryItems]);

  // Analytics data
  const analyticsData = useMemo(() => {
    const items = (inventoryItems as InventoryItem[]) || [];
    const trans = (transactions as InventoryTransaction[]) || [];

    // Spending by category
    const byCategory: Record<string, number> = {};
    trans.filter(t => t.type === 'purchase').forEach(t => {
      const item = items.find(i => i.id === t.inventory_item_id);
      if (item) {
        const cat = item.category;
        byCategory[cat] = (byCategory[cat] || 0) + (t.quantity * (t.unit_cost || 0));
      }
    });

    // Monthly spending trend (last 6 months)
    const monthlySpending: Record<string, number> = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    trans
      .filter(t => t.type === 'purchase' && new Date(t.date) >= sixMonthsAgo)
      .forEach(t => {
        const month = t.date.substring(0, 7);
        monthlySpending[month] = (monthlySpending[month] || 0) + (t.quantity * (t.unit_cost || 0));
      });

    // Top items by value
    const topItems = items
      .map(i => ({ ...i, totalValue: i.quantity * i.cost_per_unit }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);

    return {
      byCategory,
      monthlySpending,
      topItems,
    };
  }, [inventoryItems, transactions]);

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      user_id: user!.id,
      name: itemForm.name,
      category: itemForm.category,
      quantity: parseFloat(itemForm.quantity) || 0,
      unit: itemForm.unit,
      cost_per_unit: parseFloat(itemForm.cost_per_unit) || 0,
      reorder_level: parseFloat(itemForm.reorder_level) || 0,
      supplier: itemForm.supplier || null,
      notes: itemForm.notes || null,
      last_purchased: null,
    };

    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, ...data });
    } else {
      addItemMutation.mutate(data);
    }
  };

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    addTransactionMutation.mutate({
      user_id: user!.id,
      inventory_item_id: transactionForm.inventory_item_id,
      type: transactionForm.type,
      quantity: parseFloat(transactionForm.quantity) || 0,
      unit_cost: transactionForm.unit_cost ? parseFloat(transactionForm.unit_cost) : null,
      date: transactionForm.date,
      notes: transactionForm.notes || null,
    });
  };

  const openEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity.toString(),
      unit: item.unit,
      cost_per_unit: item.cost_per_unit.toString(),
      reorder_level: item.reorder_level.toString(),
      supplier: item.supplier || '',
      notes: item.notes || '',
    });
    setShowItemModal(true);
  };

  const openQuickUse = (item: InventoryItem) => {
    setTransactionForm({
      inventory_item_id: item.id,
      type: 'use',
      quantity: '',
      unit_cost: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowTransactionModal(true);
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.icon || Package;
  };

  if (itemsLoading) {
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
          <p className="text-gray-500">Track supplies, feed costs, and stock levels</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { resetTransactionForm(); setShowTransactionModal(true); }}
            leftIcon={<History className="h-4 w-4" />}
          >
            Record Usage
          </Button>
          <Button
            onClick={() => { resetItemForm(); setEditingItem(null); setShowItemModal(true); }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Item
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card padding="sm" className="text-center">
          <Package className="h-5 w-5 mx-auto mb-1 text-primary-600" />
          <p className="text-2xl font-bold">{stats.totalItems}</p>
          <p className="text-xs text-gray-500">Total Items</p>
        </Card>
        <Card padding="sm" className="text-center">
          <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-600" />
          <p className="text-2xl font-bold">${stats.totalValue.toFixed(0)}</p>
          <p className="text-xs text-gray-500">Inventory Value</p>
        </Card>
        <Card padding="sm" className="text-center">
          <ShoppingCart className="h-5 w-5 mx-auto mb-1 text-blue-600" />
          <p className="text-2xl font-bold">${stats.monthlyPurchases.toFixed(0)}</p>
          <p className="text-xs text-gray-500">This Month</p>
        </Card>
        <Card padding="sm" className="text-center">
          <TrendingDown className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
          <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
          <p className="text-xs text-gray-500">Low Stock</p>
        </Card>
        <Card padding="sm" className="text-center">
          <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-red-600" />
          <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
          <p className="text-xs text-gray-500">Out of Stock</p>
        </Card>
        <Card padding="sm" className="text-center">
          <History className="h-5 w-5 mx-auto mb-1 text-gray-600" />
          <p className="text-2xl font-bold">{((transactions as any[]) || []).length}</p>
          <p className="text-xs text-gray-500">Transactions</p>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Low Stock Alert</p>
              <p className="text-sm text-yellow-700">
                {lowStockItems.map(i => i.name).join(', ')} {lowStockItems.length === 1 ? 'is' : 'are'} running low
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 -mb-px">
          {[
            { id: 'inventory', label: 'Inventory', icon: Package },
            { id: 'transactions', label: 'Transactions', icon: History },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
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

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Items
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Items Grid */}
          {filteredItems.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No inventory items yet</p>
              <Button
                className="mt-4"
                onClick={() => { resetItemForm(); setShowItemModal(true); }}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Add First Item
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const Icon = getCategoryIcon(item.category);
                const isLow = item.quantity <= item.reorder_level && item.quantity > 0;
                const isOut = item.quantity === 0;

                return (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isOut ? 'bg-red-100' : isLow ? 'bg-yellow-100' : 'bg-primary-100'
                        }`}>
                          <Icon className={`h-5 w-5 ${
                            isOut ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-primary-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{item.category}</p>
                        </div>
                      </div>
                      {isOut && <Badge variant="danger">Out</Badge>}
                      {isLow && !isOut && <Badge variant="warning">Low</Badge>}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Quantity:</span>
                        <span className={`font-medium ${isOut ? 'text-red-600' : isLow ? 'text-yellow-600' : ''}`}>
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Unit Cost:</span>
                        <span className="font-medium">${item.cost_per_unit.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Value:</span>
                        <span className="font-medium">${(item.quantity * item.cost_per_unit).toFixed(2)}</span>
                      </div>
                      {item.reorder_level > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Reorder At:</span>
                          <span>{item.reorder_level} {item.unit}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openQuickUse(item)}
                        className="flex-1"
                      >
                        Record Use
                      </Button>
                      <button
                        onClick={() => openEditItem(item)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${item.name}?`)) {
                            deleteItemMutation.mutate(item.id);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {transactionsLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : ((transactions as any[]) || []).length === 0 ? (
            <Card className="p-8 text-center">
              <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No transactions recorded yet</p>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-left py-3 px-4 font-medium">Item</th>
                      <th className="text-left py-3 px-4 font-medium">Type</th>
                      <th className="text-right py-3 px-4 font-medium">Quantity</th>
                      <th className="text-right py-3 px-4 font-medium">Cost</th>
                      <th className="text-left py-3 px-4 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((transactions as InventoryTransaction[]) || []).slice(0, 50).map((trans) => {
                      const item = (inventoryItems as InventoryItem[])?.find(i => i.id === trans.inventory_item_id);
                      const totalCost = trans.quantity * (trans.unit_cost || 0);

                      return (
                        <tr key={trans.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{formatDate(trans.date)}</td>
                          <td className="py-3 px-4 font-medium">{item?.name || 'Unknown'}</td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                trans.type === 'purchase' ? 'success' :
                                trans.type === 'use' ? 'info' :
                                trans.type === 'waste' ? 'danger' : 'default'
                              }
                            >
                              {trans.type}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={trans.type === 'purchase' ? 'text-green-600' : 'text-red-600'}>
                              {trans.type === 'purchase' ? '+' : '-'}{trans.quantity} {item?.unit || ''}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {totalCost > 0 ? `$${totalCost.toFixed(2)}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-gray-500 truncate max-w-xs">
                            {trans.notes || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Monthly Spending */}
          <Card>
            <div className="p-4 border-b">
              <h3 className="font-semibold">Monthly Spending (Last 6 Months)</h3>
            </div>
            <div className="p-4">
              {Object.keys(analyticsData.monthlySpending).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(analyticsData.monthlySpending)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([month, amount]) => {
                      const max = Math.max(...Object.values(analyticsData.monthlySpending));
                      const width = max > 0 ? (amount / max) * 100 : 0;

                      return (
                        <div key={month} className="flex items-center gap-4">
                          <span className="text-sm text-gray-600 w-20">{month}</span>
                          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-24 text-right">${amount.toFixed(2)}</span>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No spending data yet</p>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending by Category */}
            <Card>
              <div className="p-4 border-b">
                <h3 className="font-semibold">Spending by Category</h3>
              </div>
              <div className="p-4">
                {Object.keys(analyticsData.byCategory).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(analyticsData.byCategory)
                      .sort((a, b) => (b[1] as number) - (a[1] as number))
                      .map(([category, amount]) => {
                        const max = Math.max(...Object.values(analyticsData.byCategory));
                        const width = max > 0 ? ((amount as number) / max) * 100 : 0;
                        const catLabel = CATEGORIES.find(c => c.value === category)?.label || category;

                        return (
                          <div key={category} className="flex items-center gap-4">
                            <span className="text-sm text-gray-600 w-28 capitalize">{catLabel}</span>
                            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${width}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-20 text-right">${(amount as number).toFixed(0)}</span>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No spending data yet</p>
                )}
              </div>
            </Card>

            {/* Top Items by Value */}
            <Card>
              <div className="p-4 border-b">
                <h3 className="font-semibold">Top Items by Value</h3>
              </div>
              <div className="p-4">
                {analyticsData.topItems.length > 0 ? (
                  <div className="space-y-3">
                    {analyticsData.topItems.map((item: any, idx: number) => (
                      <div key={item.id} className="flex items-center gap-4">
                        <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-medium">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.quantity} {item.unit}</p>
                        </div>
                        <span className="font-medium">${item.totalValue.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No inventory items yet</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      <Modal
        open={showItemModal}
        onClose={() => { setShowItemModal(false); setEditingItem(null); }}
        title={editingItem ? 'Edit Item' : 'Add Inventory Item'}
      >
        <form onSubmit={handleItemSubmit} className="space-y-4">
          <Input
            label="Item Name"
            required
            value={itemForm.name}
            onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Alfalfa Pellets"
          />

          <Select
            label="Category"
            options={CATEGORIES.map(c => ({ value: c.value, label: c.label }))}
            value={itemForm.category}
            onChange={(e) => setItemForm(prev => ({ ...prev, category: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              step="0.01"
              required
              value={itemForm.quantity}
              onChange={(e) => setItemForm(prev => ({ ...prev, quantity: e.target.value }))}
            />
            <Select
              label="Unit"
              options={UNITS}
              value={itemForm.unit}
              onChange={(e) => setItemForm(prev => ({ ...prev, unit: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cost per Unit ($)"
              type="number"
              step="0.01"
              value={itemForm.cost_per_unit}
              onChange={(e) => setItemForm(prev => ({ ...prev, cost_per_unit: e.target.value }))}
            />
            <Input
              label="Reorder Level"
              type="number"
              step="0.01"
              value={itemForm.reorder_level}
              onChange={(e) => setItemForm(prev => ({ ...prev, reorder_level: e.target.value }))}
              placeholder="Alert when below"
            />
          </div>

          <Input
            label="Supplier (optional)"
            value={itemForm.supplier}
            onChange={(e) => setItemForm(prev => ({ ...prev, supplier: e.target.value }))}
            placeholder="e.g., Tractor Supply"
          />

          <Input
            label="Notes (optional)"
            value={itemForm.notes}
            onChange={(e) => setItemForm(prev => ({ ...prev, notes: e.target.value }))}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { setShowItemModal(false); setEditingItem(null); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={addItemMutation.isPending || updateItemMutation.isPending}>
              {editingItem ? 'Update' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Transaction Modal */}
      <Modal
        open={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        title="Record Transaction"
      >
        <form onSubmit={handleTransactionSubmit} className="space-y-4">
          <Select
            label="Item"
            required
            options={[
              { value: '', label: 'Select item...' },
              ...((inventoryItems as InventoryItem[]) || []).map(i => ({
                value: i.id,
                label: `${i.name} (${i.quantity} ${i.unit} in stock)`,
              })),
            ]}
            value={transactionForm.inventory_item_id}
            onChange={(e) => setTransactionForm(prev => ({ ...prev, inventory_item_id: e.target.value }))}
          />

          <Select
            label="Transaction Type"
            options={[
              { value: 'purchase', label: 'Purchase (add to inventory)' },
              { value: 'use', label: 'Use (remove from inventory)' },
              { value: 'waste', label: 'Waste/Loss (remove from inventory)' },
              { value: 'adjustment', label: 'Adjustment (set exact quantity)' },
            ]}
            value={transactionForm.type}
            onChange={(e) => setTransactionForm(prev => ({ ...prev, type: e.target.value as any }))}
          />

          <Input
            label="Date"
            type="date"
            required
            value={transactionForm.date}
            onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={transactionForm.type === 'adjustment' ? 'New Quantity' : 'Quantity'}
              type="number"
              step="0.01"
              required
              value={transactionForm.quantity}
              onChange={(e) => setTransactionForm(prev => ({ ...prev, quantity: e.target.value }))}
            />
            {transactionForm.type === 'purchase' && (
              <Input
                label="Unit Cost ($)"
                type="number"
                step="0.01"
                value={transactionForm.unit_cost}
                onChange={(e) => setTransactionForm(prev => ({ ...prev, unit_cost: e.target.value }))}
              />
            )}
          </div>

          <Input
            label="Notes (optional)"
            value={transactionForm.notes}
            onChange={(e) => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="e.g., Morning feeding"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowTransactionModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addTransactionMutation.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
