'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  Button,
  Select,
  Badge,
  LoadingSpinner,
  AnimalLink,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { isFemale, isIntactMale } from '@/lib/animalVocab';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Milk,
  Baby,
  Users,
  Calendar,
  Download,
  PieChart,
  Activity,
} from 'lucide-react';

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

export default function ReportsPage() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [activeReport, setActiveReport] = useState<'overview' | 'milk' | 'financial' | 'breeding' | 'herd'>('overview');

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    
    switch (timeRange) {
      case '7d': start.setDate(end.getDate() - 7); break;
      case '30d': start.setDate(end.getDate() - 30); break;
      case '90d': start.setDate(end.getDate() - 90); break;
      case '1y': start.setFullYear(end.getFullYear() - 1); break;
      case 'all': start.setFullYear(2000); break;
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }, [timeRange]);

  const { data: animals } = useQuery({
    queryKey: ['animals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: milkRecords, isLoading: milkLoading } = useQuery({
    queryKey: ['milk_records_report', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milk_records')
        .select('*')
        .eq('user_id', user!.id)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: transactions, isLoading: financialLoading } = useQuery({
    queryKey: ['transactions_report', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user!.id)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: breedingRecords } = useQuery({
    queryKey: ['breeding_records_report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('breeding_records')
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Milk Stats
  const milkStats = useMemo(() => {
    const records = milkRecords as any[];
    if (!records?.length) return null;

    const totalMilk = records.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
    const uniqueDates = new Set(records.map((r: any) => r.date)).size;
    const avgDaily = uniqueDates > 0 ? totalMilk / uniqueDates : 0;

    const byDate = records.reduce((acc: any, r: any) => {
      if (!acc[r.date]) acc[r.date] = { date: r.date, am: 0, pm: 0, once: 0, total: 0 };
      acc[r.date].total += r.amount || 0;
      if (r.session === 'AM') acc[r.date].am += r.amount || 0;
      if (r.session === 'PM') acc[r.date].pm += r.amount || 0;
      if (r.session === 'once_daily') acc[r.date].once += r.amount || 0;
      return acc;
    }, {} as Record<string, any>);

    const dailyData = Object.values(byDate).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const byAnimal = records.reduce((acc: any, r: any) => {
      if (!acc[r.animal_id]) acc[r.animal_id] = { animal_id: r.animal_id, total: 0, count: 0 };
      acc[r.animal_id].total += r.amount || 0;
      acc[r.animal_id].count += 1;
      return acc;
    }, {} as Record<string, any>);

    const animalsList = animals as any[];
    const topProducers = Object.values(byAnimal)
      .map((p: any) => ({
        ...p,
        animal: animalsList?.find((a: any) => a.id === p.animal_id),
        avgPerSession: p.count > 0 ? p.total / p.count : 0,
      }))
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 5);

    return {
      totalMilk,
      avgDaily,
      recordCount: records.length,
      dailyData,
      topProducers,
    };
  }, [milkRecords, animals]);

  // Financial Stats
  const financialStats = useMemo(() => {
    const trans = transactions as any[];
    if (!trans?.length) return null;

    const income = trans
      .filter((t: any) => t.type === 'income')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    const expenses = trans
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    const profit = income - expenses;

    const byCategory = trans.reduce((acc: any, t: any) => {
      const key = `${t.type}-${t.category}`;
      if (!acc[key]) acc[key] = { type: t.type, category: t.category, total: 0, count: 0 };
      acc[key].total += t.amount || 0;
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, any>);

    const categoryBreakdown = Object.values(byCategory).sort((a: any, b: any) => b.total - a.total);

    const byMonth = trans.reduce((acc: any, t: any) => {
      const month = t.date.substring(0, 7);
      if (!acc[month]) acc[month] = { month, income: 0, expenses: 0 };
      if (t.type === 'income') acc[month].income += t.amount || 0;
      else acc[month].expenses += t.amount || 0;
      return acc;
    }, {} as Record<string, any>);

    const monthlyData = Object.values(byMonth).sort((a: any, b: any) => 
      a.month.localeCompare(b.month)
    );

    return {
      income,
      expenses,
      profit,
      categoryBreakdown,
      monthlyData,
    };
  }, [transactions]);

  // Breeding Stats
  const breedingStats = useMemo(() => {
    const records = breedingRecords as any[];
    if (!records?.length) return null;

    const total = records.length;
    const kidded = records.filter((r: any) => r.status === 'kidded').length;
    const open = records.filter((r: any) => r.status === 'open').length;
    const pregnant = records.filter((r: any) => 
      r.status === 'confirmed_pregnant' || r.status === 'bred'
    ).length;
    const aborted = records.filter((r: any) => r.status === 'aborted').length;

    const successRate = total > 0 ? ((kidded / (kidded + open + aborted)) * 100) : 0;

    const totalKids = records
      .filter((r: any) => r.status === 'kidded')
      .reduce((sum: number, r: any) => sum + (r.number_of_kids || 0), 0);

    const avgKidsPerKidding = kidded > 0 ? totalKids / kidded : 0;

    const byYear = records.reduce((acc: any, r: any) => {
      const year = r.breeding_date?.substring(0, 4) || 'Unknown';
      if (!acc[year]) acc[year] = { year, total: 0, kidded: 0, kids: 0 };
      acc[year].total += 1;
      if (r.status === 'kidded') {
        acc[year].kidded += 1;
        acc[year].kids += r.number_of_kids || 0;
      }
      return acc;
    }, {} as Record<string, any>);

    const yearlyData = Object.values(byYear).sort((a: any, b: any) => a.year.localeCompare(b.year));

    return {
      total,
      kidded,
      open,
      pregnant,
      aborted,
      successRate,
      totalKids,
      avgKidsPerKidding,
      yearlyData,
    };
  }, [breedingRecords]);

  // Herd Stats
  const herdStats = useMemo(() => {
    const animalsList = animals as any[];
    if (!animalsList?.length) return null;

    const total = animalsList.length;
    const active = animalsList.filter((a: any) => a.status === 'active').length;
    const sold = animalsList.filter((a: any) => a.status === 'sold').length;
    const deceased = animalsList.filter((a: any) => a.status === 'deceased').length;

    const byCategory = animalsList.reduce((acc: any, a: any) => {
      if (!acc[a.category]) acc[a.category] = 0;
      acc[a.category] += 1;
      return acc;
    }, {} as Record<string, number>);

    const byBreed = animalsList.reduce((acc: any, a: any) => {
      const breed = a.breed || 'Unknown';
      if (!acc[breed]) acc[breed] = 0;
      acc[breed] += 1;
      return acc;
    }, {} as Record<string, number>);

    const does = animalsList.filter((a: any) => isFemale(a) && a.status === 'active').length;
    const bucks = animalsList.filter((a: any) => isIntactMale(a) && a.status === 'active').length;
    const wethers = animalsList.filter((a: any) => (a.sex === 'wether' || a.sex === 'castrated') && a.status === 'active').length;

    return {
      total,
      active,
      sold,
      deceased,
      byCategory,
      byBreed,
      does,
      bucks,
      wethers,
    };
  }, [animals]);

  const renderBarChart = (data: { label: string; value: number; color?: string; animalId?: string }[], maxValue: number) => (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-sm text-gray-600 w-32 truncate">
            {item.animalId ? (
              <AnimalLink 
                animalId={item.animalId} 
                name={item.label}
                variant="subtle"
              />
            ) : (
              item.label
            )}
          </span>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${item.color || 'bg-primary-500'}`}
              style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
            />
          </div>
          <span className="text-sm font-medium w-20 text-right">{item.value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );

  const reports = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'milk', label: 'Milk Production', icon: Milk },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'breeding', label: 'Breeding', icon: Baby },
    { id: 'herd', label: 'Herd Demographics', icon: Users },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500">Insights into your farm performance</p>
        </div>
        <div className="flex gap-2">
          <Select
            options={[
              { value: '7d', label: 'Last 7 Days' },
              { value: '30d', label: 'Last 30 Days' },
              { value: '90d', label: 'Last 90 Days' },
              { value: '1y', label: 'Last Year' },
              { value: 'all', label: 'All Time' },
            ]}
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="w-40"
          />
        </div>
      </div>

      {/* Report Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 -mb-px overflow-x-auto">
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeReport === report.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <report.icon className="h-4 w-4" />
              {report.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Report */}
      {activeReport === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card padding="sm" className="text-center">
              <Milk className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{milkStats?.totalMilk.toFixed(1) || '0'}</p>
              <p className="text-sm text-gray-500">lbs Milk</p>
            </Card>
            <Card padding="sm" className="text-center">
              <DollarSign className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <p className={`text-2xl font-bold ${(financialStats?.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${Math.abs(financialStats?.profit || 0).toFixed(0)}
              </p>
              <p className="text-sm text-gray-500">{(financialStats?.profit || 0) >= 0 ? 'Profit' : 'Loss'}</p>
            </Card>
            <Card padding="sm" className="text-center">
              <Baby className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold">{breedingStats?.totalKids || 0}</p>
              <p className="text-sm text-gray-500">Kids Born</p>
            </Card>
            <Card padding="sm" className="text-center">
              <Users className="h-6 w-6 mx-auto mb-2 text-cyan-600" />
              <p className="text-2xl font-bold">{herdStats?.active || 0}</p>
              <p className="text-sm text-gray-500">Active Animals</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold">Milk Production</h3>
                <button onClick={() => setActiveReport('milk')} className="text-sm text-primary-600 hover:underline">
                  View Details →
                </button>
              </div>
              <div className="p-4">
                {milkStats ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-3xl font-bold text-green-600">{milkStats.avgDaily.toFixed(1)}</p>
                        <p className="text-sm text-gray-500">lbs/day avg</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold">{milkStats.recordCount}</p>
                        <p className="text-sm text-gray-500">milkings</p>
                      </div>
                    </div>
                    {milkStats.topProducers.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Top Producer</p>
                        <p className="text-lg font-semibold">
                          {milkStats.topProducers[0].animal?.id ? (
                            <>
                              <AnimalLink 
                                animalId={milkStats.topProducers[0].animal.id} 
                                name={milkStats.topProducers[0].animal.name}
                                variant="bold"
                              />
                              {' - '}{milkStats.topProducers[0].total.toFixed(1)} lbs
                            </>
                          ) : (
                            `${milkStats.topProducers[0].animal?.name || 'Unknown'} - ${milkStats.topProducers[0].total.toFixed(1)} lbs`
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No milk data for this period</p>
                )}
              </div>
            </Card>

            <Card>
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold">Financial Summary</h3>
                <button onClick={() => setActiveReport('financial')} className="text-sm text-primary-600 hover:underline">
                  View Details →
                </button>
              </div>
              <div className="p-4">
                {financialStats ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Income</span>
                      <span className="font-semibold text-green-600">+${financialStats.income.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Expenses</span>
                      <span className="font-semibold text-red-600">-${financialStats.expenses.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between items-center">
                      <span className="font-medium">Net</span>
                      <span className={`text-lg font-bold ${financialStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {financialStats.profit >= 0 ? '+' : '-'}${Math.abs(financialStats.profit).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No financial data for this period</p>
                )}
              </div>
            </Card>

            <Card>
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold">Breeding Performance</h3>
                <button onClick={() => setActiveReport('breeding')} className="text-sm text-primary-600 hover:underline">
                  View Details →
                </button>
              </div>
              <div className="p-4">
                {breedingStats ? (
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600">{breedingStats.successRate.toFixed(0)}%</p>
                      <p className="text-xs text-gray-500">Success Rate</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{breedingStats.avgKidsPerKidding.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">Avg Kids/Birth</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{breedingStats.pregnant}</p>
                      <p className="text-xs text-gray-500">Currently Pregnant</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No breeding data</p>
                )}
              </div>
            </Card>

            <Card>
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold">Herd Composition</h3>
                <button onClick={() => setActiveReport('herd')} className="text-sm text-primary-600 hover:underline">
                  View Details →
                </button>
              </div>
              <div className="p-4">
                {herdStats ? (
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-pink-600">{herdStats.does}</p>
                      <p className="text-xs text-gray-500">Does</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{herdStats.bucks}</p>
                      <p className="text-xs text-gray-500">Bucks</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-600">{herdStats.wethers}</p>
                      <p className="text-xs text-gray-500">Wethers</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No herd data</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Milk Report */}
      {activeReport === 'milk' && (
        <div className="space-y-6">
          {milkLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : !milkStats ? (
            <Card className="p-8 text-center">
              <Milk className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No milk production data for this period</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card padding="sm" className="text-center">
                  <p className="text-sm text-gray-500">Total Production</p>
                  <p className="text-2xl font-bold text-green-600">{milkStats.totalMilk.toFixed(1)} lbs</p>
                </Card>
                <Card padding="sm" className="text-center">
                  <p className="text-sm text-gray-500">Daily Average</p>
                  <p className="text-2xl font-bold">{milkStats.avgDaily.toFixed(1)} lbs</p>
                </Card>
                <Card padding="sm" className="text-center">
                  <p className="text-sm text-gray-500">Milking Sessions</p>
                  <p className="text-2xl font-bold">{milkStats.recordCount}</p>
                </Card>
                <Card padding="sm" className="text-center">
                  <p className="text-sm text-gray-500">Days Recorded</p>
                  <p className="text-2xl font-bold">{milkStats.dailyData.length}</p>
                </Card>
              </div>

              <Card>
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Daily Production</h3>
                </div>
                <div className="p-4">
                  {milkStats.dailyData.length > 0 ? (
                    <div className="h-64 flex items-end gap-1">
                      {milkStats.dailyData.slice(-30).map((day: any, i: number) => {
                        const maxTotal = Math.max(...milkStats.dailyData.map((d: any) => d.total));
                        const height = maxTotal > 0 ? (day.total / maxTotal) * 100 : 0;
                        
                        return (
                          <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                              {formatDate(day.date)}: {day.total.toFixed(1)} lbs
                            </div>
                            <div 
                              className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors"
                              style={{ height: `${height}%`, minHeight: day.total > 0 ? '4px' : '0' }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No data to display</p>
                  )}
                </div>
              </Card>

              <Card>
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Top Producers</h3>
                </div>
                <div className="p-4">
                  {milkStats.topProducers.length > 0 ? (
                    renderBarChart(
                      milkStats.topProducers.map((p: any) => ({
                        label: p.animal?.name || 'Unknown',
                        value: p.total,
                        color: 'bg-green-500',
                        animalId: p.animal?.id,
                      })),
                      milkStats.topProducers[0]?.total || 1
                    )
                  ) : (
                    <p className="text-gray-500 text-center py-4">No production data</p>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Financial Report */}
      {activeReport === 'financial' && (
        <div className="space-y-6">
          {financialLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : !financialStats ? (
            <Card className="p-8 text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No financial data for this period</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card padding="sm" className="text-center">
                  <p className="text-sm text-gray-500">Total Income</p>
                  <p className="text-2xl font-bold text-green-600">${financialStats.income.toFixed(2)}</p>
                </Card>
                <Card padding="sm" className="text-center">
                  <p className="text-sm text-gray-500">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">${financialStats.expenses.toFixed(2)}</p>
                </Card>
                <Card padding="sm" className="text-center">
                  <p className="text-sm text-gray-500">Net Profit/Loss</p>
                  <p className={`text-2xl font-bold ${financialStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {financialStats.profit >= 0 ? '+' : '-'}${Math.abs(financialStats.profit).toFixed(2)}
                  </p>
                </Card>
                <Card padding="sm" className="text-center">
                  <p className="text-sm text-gray-500">Transactions</p>
                  <p className="text-2xl font-bold">{(transactions as any[])?.length || 0}</p>
                </Card>
              </div>

              {financialStats.monthlyData.length > 0 && (
                <Card>
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">Monthly Income vs Expenses</h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      {(financialStats.monthlyData as any[]).map((month: any) => {
                        const max = Math.max(
                          ...(financialStats.monthlyData as any[]).map((m: any) => Math.max(m.income, m.expenses))
                        );
                        
                        return (
                          <div key={month.month} className="space-y-1">
                            <p className="text-sm text-gray-600">{month.month}</p>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <div
                                  className="h-4 bg-green-500 rounded"
                                  style={{ width: `${max > 0 ? (month.income / max) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-xs w-16 text-right text-green-600">${month.income.toFixed(0)}</span>
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <div
                                  className="h-4 bg-red-400 rounded"
                                  style={{ width: `${max > 0 ? (month.expenses / max) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-xs w-16 text-right text-red-600">${month.expenses.toFixed(0)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-center gap-6 mt-4 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded" /> Income
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-red-400 rounded" /> Expenses
                      </span>
                    </div>
                  </div>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">Income by Category</h3>
                  </div>
                  <div className="p-4">
                    {renderBarChart(
                      (financialStats.categoryBreakdown as any[])
                        .filter((c: any) => c.type === 'income')
                        .map((c: any) => ({
                          label: c.category.replace('_', ' '),
                          value: c.total,
                          color: 'bg-green-500',
                        })),
                      Math.max(...(financialStats.categoryBreakdown as any[]).filter((c: any) => c.type === 'income').map((c: any) => c.total), 1)
                    )}
                  </div>
                </Card>

                <Card>
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">Expenses by Category</h3>
                  </div>
                  <div className="p-4">
                    {renderBarChart(
                      (financialStats.categoryBreakdown as any[])
                        .filter((c: any) => c.type === 'expense')
                        .map((c: any) => ({
                          label: c.category.replace('_', ' '),
                          value: c.total,
                          color: 'bg-red-400',
                        })),
                      Math.max(...(financialStats.categoryBreakdown as any[]).filter((c: any) => c.type === 'expense').map((c: any) => c.total), 1)
                    )}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* Breeding Report */}
      {activeReport === 'breeding' && (
        <div className="space-y-6">
          {!breedingStats ? (
            <Card className="p-8 text-center">
              <Baby className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No breeding data available</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <Card padding="sm" className="text-center">
                  <p className="text-sm text-gray-500">Success Rate</p>
                  <p className="text-2xl font-bold text-green-600">{breedingStats.successRate.toFixed(0)}%</p>
                </Card>
                <Card padding="sm" className="text-center">
                  <p className="text-sm text-gray-500">Total Breedings</p>
                  <p className="text-2xl font-bold">{breedingStats.total}</p>
                </Card>
                <Card padding="sm" className="text-center">
                  <p className="text-sm text-gray-500">Kidded</p>
                  <p className="text-2xl font-bold text-green-600">{breedingStats.kidded}</p>
                </Card>
                <Card padding="sm" className="text-center">
                  <p className="text-sm text-gray-500">Total Kids Born</p>
                  <p className="text-2xl font-bold text-purple-600">{breedingStats.totalKids}</p>
                </Card>
                <Card padding="sm" className="text-center">
                  <p className="text-sm text-gray-500">Avg Kids/Birth</p>
                  <p className="text-2xl font-bold">{breedingStats.avgKidsPerKidding.toFixed(1)}</p>
                </Card>
              </div>

              <Card>
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Breeding Status Breakdown</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                    <div>
                      <p className="text-3xl font-bold text-purple-600">{breedingStats.pregnant}</p>
                      <p className="text-sm text-gray-500">Pregnant</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-green-600">{breedingStats.kidded}</p>
                      <p className="text-sm text-gray-500">Kidded</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-yellow-600">{breedingStats.open}</p>
                      <p className="text-sm text-gray-500">Open</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-red-600">{breedingStats.aborted}</p>
                      <p className="text-sm text-gray-500">Aborted</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-600">{breedingStats.total}</p>
                      <p className="text-sm text-gray-500">Total</p>
                    </div>
                  </div>
                </div>
              </Card>

              {(breedingStats.yearlyData as any[]).length > 0 && (
                <Card>
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">Yearly Performance</h3>
                  </div>
                  <div className="p-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Year</th>
                          <th className="text-right py-2">Breedings</th>
                          <th className="text-right py-2">Kidded</th>
                          <th className="text-right py-2">Kids Born</th>
                          <th className="text-right py-2">Avg/Birth</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(breedingStats.yearlyData as any[]).map((year: any) => (
                          <tr key={year.year} className="border-b">
                            <td className="py-2 font-medium">{year.year}</td>
                            <td className="text-right py-2">{year.total}</td>
                            <td className="text-right py-2">{year.kidded}</td>
                            <td className="text-right py-2">{year.kids}</td>
                            <td className="text-right py-2">
                              {year.kidded > 0 ? (year.kids / year.kidded).toFixed(1) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Herd Report */}
      {activeReport === 'herd' && (
        <div className="space-y-6">
          {!herdStats ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No herd data available</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card padding="sm" className="text-center">
                  <p className="text-sm text-gray-500">Total Animals</p>
                  <p className="text-2xl font-bold">{herdStats.total}</p>
                </Card>
                <Card padding="sm" className="text-center">
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-2xl font-bold text-green-600">{herdStats.active}</p>
                </Card>
                <Card padding="sm" className="text-center">
                  <p className="text-sm text-gray-500">Sold</p>
                  <p className="text-2xl font-bold text-blue-600">{herdStats.sold}</p>
                </Card>
                <Card padding="sm" className="text-center">
                  <p className="text-sm text-gray-500">Deceased</p>
                  <p className="text-2xl font-bold text-gray-600">{herdStats.deceased}</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">By Category</h3>
                  </div>
                  <div className="p-4">
                    {renderBarChart(
                      Object.entries(herdStats.byCategory).map(([cat, count]: [string, any]) => ({
                        label: cat.replace('_', ' '),
                        value: count,
                        color: 'bg-primary-500',
                      })),
                      Math.max(...Object.values(herdStats.byCategory).map((v: any) => v), 1)
                    )}
                  </div>
                </Card>

                <Card>
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">By Breed</h3>
                  </div>
                  <div className="p-4">
                    {renderBarChart(
                      Object.entries(herdStats.byBreed)
                        .sort((a: any, b: any) => b[1] - a[1])
                        .slice(0, 8)
                        .map(([breed, count]: [string, any]) => ({
                          label: breed,
                          value: count,
                          color: 'bg-cyan-500',
                        })),
                      Math.max(...Object.values(herdStats.byBreed).map((v: any) => v), 1)
                    )}
                  </div>
                </Card>
              </div>

              <Card>
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Sex Distribution (Active Animals)</h3>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-center gap-8">
                    <div className="text-center">
                      <div className="w-24 h-24 rounded-full bg-pink-100 flex items-center justify-center mb-2">
                        <span className="text-3xl font-bold text-pink-600">{herdStats.does}</span>
                      </div>
                      <p className="text-sm text-gray-600">Does</p>
                    </div>
                    <div className="text-center">
                      <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                        <span className="text-3xl font-bold text-blue-600">{herdStats.bucks}</span>
                      </div>
                      <p className="text-sm text-gray-600">Bucks</p>
                    </div>
                    <div className="text-center">
                      <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                        <span className="text-3xl font-bold text-gray-600">{herdStats.wethers}</span>
                      </div>
                      <p className="text-sm text-gray-600">Wethers</p>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
