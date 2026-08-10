'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  Button,
  Input,
  Select,
  Modal,
  StatCard,
  Badge,
  EmptyState,
  LoadingSpinner,
  ErrorState,
} from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Receipt,
  Filter,
  Download,
  FileText,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { format, parseISO, subMonths, startOfMonth, endOfMonth } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// Categories matching Schedule F
const incomeCategories = [
  { value: 'animal_sales', label: 'Animal Sales' },
  { value: 'milk_sales', label: 'Milk/Dairy Sales' },
  { value: 'breeding_fees', label: 'Breeding/Stud Fees' },
  { value: 'fiber_sales', label: 'Fiber Sales' },
  { value: 'other_income', label: 'Other Farm Income' },
];

const expenseCategories = [
  { value: 'feed', label: 'Feed & Hay' },
  { value: 'veterinary', label: 'Veterinary & Medicine' },
  { value: 'supplies', label: 'Farm Supplies' },
  { value: 'equipment', label: 'Equipment & Repairs' },
  { value: 'breeding', label: 'Breeding Expenses' },
  { value: 'bedding', label: 'Bedding & Straw' },
  { value: 'fencing', label: 'Fencing & Facilities' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'labor', label: 'Hired Labor' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'registration', label: 'Registration & Shows' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'other_expense', label: 'Other Expenses' },
];

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
];

export default function FinancesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'reports'>('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [dateRange, setDateRange] = useState('year');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  const [newTransaction, setNewTransaction] = useState({
    type: 'expense' as 'income' | 'expense',
    category: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    vendor: '',
    payment_method: 'cash',
    tax_deductible: true,
    notes: '',
  });

  // Fetch transactions
  const { data: transactions, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ['transactions', typeFilter, dateRange],
    queryFn: async () => {
      let startDate: Date;
      const now = new Date();

      switch (dateRange) {
        case 'month':
          startDate = startOfMonth(now);
          break;
        case 'quarter':
          startDate = subMonths(now, 3);
          break;
        case 'year':
        default:
          startDate = new Date(now.getFullYear(), 0, 1);
      }

      let query = supabase
        .from('transactions')
        .select('*')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Create transaction mutation
  const createTransaction = useMutation({
    mutationFn: async (transaction: any) => {
      const { data, error } = await (supabase
         .from('transactions') as any)
         .insert([{ ...transaction, user_id: user?.id }])
         .select()
         .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // Update transaction mutation
  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase.from('transactions') as any).update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // Delete transaction mutation
  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // Calculate stats
  const totalIncome = transactions?.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
  const totalExpenses = transactions?.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
  const netProfit = totalIncome - totalExpenses;

  // Group by category for charts
  const expensesByCategory = transactions
    ?.filter((t: any) => t.type === 'expense')
    .reduce((acc: Record<string, number>, t: any) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {}) || {};

  const incomeByCategory = transactions
    ?.filter((t: any) => t.type === 'income')
    .reduce((acc: Record<string, number>, t: any) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {}) || {};

  // Monthly data for bar chart. Bucket by the 'YYYY-MM' prefix of the date string
  // (not format(new Date(t.date))) so a transaction on the 1st isn't pushed into the
  // previous month by the UTC-midnight shift, months from different years don't merge,
  // and bars sort chronologically.
  const monthlyData = transactions?.reduce((acc: Record<string, { income: number; expense: number }>, t: any) => {
    const month = (t.date as string).substring(0, 7);
    if (!acc[month]) acc[month] = { income: 0, expense: 0 };
    (acc[month] as any)[t.type] += t.amount;
    return acc;
  }, {}) || {};

  const sortedMonths = Object.keys(monthlyData).sort();

  const barChartData = {
    labels: sortedMonths.map((m) => format(parseISO(`${m}-01`), 'MMM yyyy')),
    datasets: [
      {
        label: 'Income',
        data: sortedMonths.map((m) => monthlyData[m].income),
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
      },
      {
        label: 'Expenses',
        data: sortedMonths.map((m) => monthlyData[m].expense),
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
      },
    ],
  };

  const doughnutData = {
    labels: Object.keys(expensesByCategory).map(k => 
      expenseCategories.find(c => c.value === k)?.label || k
    ),
    datasets: [{
      data: Object.values(expensesByCategory),
      backgroundColor: [
        '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
        '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
        '#d946ef', '#ec4899', '#f43f5e',
      ],
    }],
  };

  const handleSaveTransaction = async () => {
    if (!newTransaction.category || !newTransaction.amount || parseFloat(newTransaction.amount) <= 0) return;

    // Shared fields for both create and update. The transactions table has no
    // `vendor` column (only `vendor_id`), so we never send a `vendor` key.
    const baseFields = {
      type: newTransaction.type,
      category: newTransaction.category,
      amount: parseFloat(newTransaction.amount),
      date: newTransaction.date,
      description: newTransaction.description || null,
      payment_method: newTransaction.payment_method,
      tax_deductible: newTransaction.tax_deductible,
    };

    try {
      setSaveError(null);
      if (editingTransactionId) {
        // Editing: send notes exactly as typed -- do NOT re-fold a Vendor line,
        // since the stored notes were prefilled verbatim (vendor field is empty).
        await updateTransaction.mutateAsync({
          id: editingTransactionId,
          ...baseFields,
          notes: newTransaction.notes || null,
        });
      } else {
        // Creating: fold the vendor name into notes (as the import flow does).
        const notesWithVendor = [
          newTransaction.vendor ? `Vendor: ${newTransaction.vendor}` : null,
          newTransaction.notes || null,
        ].filter(Boolean).join('\n') || null;

        await createTransaction.mutateAsync({
          ...baseFields,
          notes: notesWithVendor,
        });
      }
    } catch (err: any) {
      setSaveError(err?.message || 'Could not save the transaction. Please try again.');
      return;
    }

    setShowAddModal(false);
    setEditingTransactionId(null);
    setNewTransaction({
      type: 'expense',
      category: '',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      vendor: '',
      payment_method: 'cash',
      tax_deductible: true,
      notes: '',
    });
  };

  const openCreateTransaction = () => {
    setEditingTransactionId(null);
    setSaveError(null);
    setNewTransaction({
      type: 'expense',
      category: '',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      vendor: '',
      payment_method: 'cash',
      tax_deductible: true,
      notes: '',
    });
    setShowAddModal(true);
  };

  const openEditTransaction = (t: any) => {
    setEditingTransactionId(t.id);
    setSaveError(null);
    setNewTransaction({
      type: t.type,
      category: t.category,
      amount: String(t.amount),
      date: t.date,
      description: t.description || '',
      vendor: '',
      payment_method: t.payment_method || 'cash',
      tax_deductible: t.tax_deductible,
      notes: t.notes || '',
    });
    setShowAddModal(true);
  };

  const closeTransactionModal = () => {
    setShowAddModal(false);
    setEditingTransactionId(null);
    setSaveError(null);
  };

  const getCategoryLabel = (type: string, category: string) => {
    const list = type === 'income' ? incomeCategories : expenseCategories;
    return list.find(c => c.value === category)?.label || category;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Tracking</h1>
          <p className="text-gray-500">Track income, expenses, and generate reports</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateTransaction}>
          Add Transaction
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Income"
          value={formatCurrency(totalIncome)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(totalExpenses)}
          icon={<TrendingDown className="h-5 w-5" />}
        />
        <StatCard
          title="Net Profit"
          value={formatCurrency(netProfit)}
          icon={<PiggyBank className="h-5 w-5" />}
        />
        <StatCard
          title="Transactions"
          value={transactions?.length || 0}
          subtitle={`${dateRange === 'year' ? 'This year' : dateRange === 'month' ? 'This month' : 'Last 3 months'}`}
          icon={<Receipt className="h-5 w-5" />}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { id: 'overview', label: 'Overview', icon: DollarSign },
            { id: 'transactions', label: 'Transactions', icon: Receipt },
            { id: 'reports', label: 'Reports', icon: FileText },
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Bar Chart */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Income vs Expenses</h3>
            <div className="h-64">
              <Bar
                data={barChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'top' } },
                }}
              />
            </div>
          </Card>

          {/* Expense Breakdown */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
            {Object.keys(expensesByCategory).length > 0 ? (
              <div className="h-64">
                <Doughnut
                  data={doughnutData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right' } },
                  }}
                />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No expense data yet
              </div>
            )}
          </Card>

          {/* Top Expenses */}
          <Card>
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">Top Expense Categories</h3>
            </div>
            <div className="divide-y">
              {Object.entries(expensesByCategory)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([category, amount]) => (
                  <div key={category} className="p-4 flex items-center justify-between">
                    <span className="text-gray-700">
                      {getCategoryLabel('expense', category)}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(amount as number)}
                    </span>
                  </div>
                ))}
              {Object.keys(expensesByCategory).length === 0 && (
                <div className="p-4 text-center text-gray-500">No expenses recorded</div>
              )}
            </div>
          </Card>

          {/* Income Sources */}
          <Card>
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">Income Sources</h3>
            </div>
            <div className="divide-y">
              {Object.entries(incomeByCategory)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([category, amount]) => (
                  <div key={category} className="p-4 flex items-center justify-between">
                    <span className="text-gray-700">
                      {getCategoryLabel('income', category)}
                    </span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(amount as number)}
                    </span>
                  </div>
                ))}
              {Object.keys(incomeByCategory).length === 0 && (
                <div className="p-4 text-center text-gray-500">No income recorded</div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card padding="sm">
            <div className="flex flex-wrap gap-3">
              <Select
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'income', label: 'Income' },
                  { value: 'expense', label: 'Expense' },
                ]}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-36"
              />
              <Select
                options={[
                  { value: 'month', label: 'This Month' },
                  { value: 'quarter', label: 'Last 3 Months' },
                  { value: 'year', label: 'This Year' },
                ]}
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-40"
              />
            </div>
          </Card>

          {/* Transaction List */}
          <Card padding="none">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : isError ? (
              <ErrorState onRetry={() => refetch()} />
            ) : !transactions?.length ? (
              <EmptyState
                icon={<Receipt className="h-12 w-12" />}
                title="No transactions"
                description="Start tracking your farm finances"
                action={<Button onClick={openCreateTransaction}>Add Transaction</Button>}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-sm text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium text-right">Amount</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.map((t: any) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{formatDate(t.date)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={t.type === 'income' ? 'success' : 'danger'}>
                            {t.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {getCategoryLabel(t.type, t.category)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {t.description || '—'}
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${
                          t.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => openEditTransaction(t)}
                              className="text-gray-400 hover:text-gray-600"
                              aria-label="Edit transaction"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => { if (confirm('Delete this transaction?')) deleteTransaction.mutate(t.id); }}
                              className="text-gray-400 hover:text-red-600"
                              aria-label="Delete transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-6 w-6 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Schedule F Summary</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Generate a summary of your farm income and expenses organized by Schedule F categories for tax purposes.
            </p>
            <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />}>
              Export Schedule F Report
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Receipt className="h-6 w-6 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Transaction Export</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Export all transactions to CSV for use in spreadsheets or accounting software.
            </p>
            <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />}>
              Export to CSV
            </Button>
          </Card>

          {/* Tax Summary */}
          <Card className="lg:col-span-2">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">Tax Deductible Summary</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-700">Total Income</p>
                  <p className="text-2xl font-bold text-green-800">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-700">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-800">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700">Tax Deductible</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {formatCurrency(
                      transactions?.filter((t: any) => t.type === 'expense' && t.tax_deductible).reduce((sum: number, t: any) => sum + t.amount, 0) || 0
                    )}
                  </p>
                </div>
                <div className={`rounded-lg p-4 ${netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className={`text-sm ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>Net Profit/Loss</p>
                  <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                    {formatCurrency(netProfit)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Add Transaction Modal */}
      <Modal
        open={showAddModal}
        onClose={closeTransactionModal}
        title={editingTransactionId ? 'Edit Transaction' : 'Add Transaction'}
        footer={
          <>
            <Button variant="ghost" onClick={closeTransactionModal}>
              Cancel
            </Button>
            <Button onClick={handleSaveTransaction} loading={editingTransactionId ? updateTransaction.isPending : createTransaction.isPending}>
              {editingTransactionId ? 'Save Changes' : 'Add Transaction'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {saveError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              {saveError}
            </div>
          )}
          {/* Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setNewTransaction({ ...newTransaction, type: 'expense', category: '' })}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  newTransaction.type === 'expense'
                    ? 'bg-red-100 text-red-700 border-2 border-red-300'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Expense
              </button>
              <button
                onClick={() => setNewTransaction({ ...newTransaction, type: 'income', category: '' })}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  newTransaction.type === 'income'
                    ? 'bg-green-100 text-green-700 border-2 border-green-300'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Income
              </button>
            </div>
          </div>

          <Select
            label="Category"
            options={[
              { value: '', label: 'Select category...' },
              ...(newTransaction.type === 'income' ? incomeCategories : expenseCategories),
            ]}
            value={newTransaction.category}
            onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
            required
          />

          <Input
            label="Amount ($)"
            type="number"
            min="0"
            step="0.01"
            value={newTransaction.amount}
            onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
            placeholder="0.00"
            required
          />

          <Input
            label="Date"
            type="date"
            value={newTransaction.date}
            onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
            required
          />

          <Input
            label="Description"
            value={newTransaction.description}
            onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
            placeholder="e.g., Monthly hay delivery"
          />

          {newTransaction.type === 'expense' && (
            <Input
              label="Vendor"
              value={newTransaction.vendor}
              onChange={(e) => setNewTransaction({ ...newTransaction, vendor: e.target.value })}
              placeholder="e.g., Tractor Supply"
            />
          )}

          <Select
            label="Payment Method"
            options={paymentMethods}
            value={newTransaction.payment_method}
            onChange={(e) => setNewTransaction({ ...newTransaction, payment_method: e.target.value })}
          />

          {newTransaction.type === 'expense' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="tax_deductible"
                checked={newTransaction.tax_deductible}
                onChange={(e) => setNewTransaction({ ...newTransaction, tax_deductible: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor="tax_deductible" className="text-sm text-gray-700">
                Tax Deductible
              </label>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={2}
              value={newTransaction.notes}
              onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
              placeholder="Additional notes..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
