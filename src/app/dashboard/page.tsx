'use client';

import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  Button,
  Badge,
  LoadingSpinner,
  AnimalLink,
  ErrorState,
} from '@/components/ui';
import { formatDate, weightToLbs } from '@/lib/utils';
import { milkAmountToLbs } from '@/hooks/useMilk';
import {
  Users,
  Heart,
  Baby,
  Milk,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Plus,
  ChevronRight,
  Activity,
  Syringe,
  Scale,
  Droplets,
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO, differenceInCalendarDays, startOfToday } from 'date-fns';

// Decision Layer imports
import {
  getDecisionSignals,
  DecisionSignal,
} from '@/lib/decisionLayer';
import {
  DecisionSummaryBar,
  DecisionSignalList,
} from '@/lib/decisionLayer/decision-status';
import {
  isIntactMale,
  categoryIs,
  toCanonicalCategory,
} from '@/lib/animalVocab';

export default function DashboardPage() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  // Fetch animals
  const { data: animals, isLoading: animalsLoading, isError: animalsError, refetch: refetchAnimals } = useQuery({
    queryKey: ['animals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_reference', false); // exclude outside animals from herd counts
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch breeding records
  const { data: breedingRecords, isError: breedingError } = useQuery({
    queryKey: ['breeding_records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('breeding_records')
        .select(`
          *,
          doe:animals!breeding_records_doe_id_fkey(id, name)
        `)
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch health records (last 90 days). The recurrence signal looks for 3+ of the
  // same condition within 90 days, so the window has to reach back that far; the
  // recent-activity list still just takes the newest few.
  const { data: healthRecords, isError: healthError } = useQuery({
    queryKey: ['health_records_recent'],
    queryFn: async () => {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const { data, error } = await supabase
        .from('health_records')
        .select(`
          *,
          animal:animals(id, name)
        `)
        .eq('user_id', user!.id)
        .gte('date', format(ninetyDaysAgo, 'yyyy-MM-dd'))
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch inspections (for FAMACHA scores). Bounded to the last year -- the
  // signal only needs each animal's latest inspection, so loading the entire
  // history on the landing page was wasted work.
  const { data: inspections, isError: inspectionsError } = useQuery({
    queryKey: ['inspections_all'],
    queryFn: async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          *,
          animal:animals(id, name)
        `)
        .eq('user_id', user!.id)
        .gte('date', format(oneYearAgo, 'yyyy-MM-dd'))
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch milk records (last 7 days)
  const { data: milkRecords, isError: milkError } = useQuery({
    queryKey: ['milk_records_week'],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data, error } = await supabase
        .from('milk_records')
        .select('*, animal:animals(id, name)')
        .eq('user_id', user!.id)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch weight records (last year). The weight-loss signal only needs each
  // animal's most recent readings, so loading the full history on the landing
  // page was wasteful. The key is ['weight_records','dashboard'] -- distinct
  // from the Weight page's ['weight_records'] (which selects a different shape)
  // so the two don't collide in the cache, while the Weight page's
  // invalidateQueries(['weight_records']) still refreshes this by prefix.
  const { data: weightRecords, isError: weightError } = useQuery({
    queryKey: ['weight_records', 'dashboard'],
    queryFn: async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const { data, error } = await supabase
        .from('weight_records')
        .select('*, animal:animals(id, name)')
        .eq('user_id', user!.id)
        .gte('date', format(oneYearAgo, 'yyyy-MM-dd'))
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch transactions (last 30 days)
  const { data: transactions, isError: transactionsError } = useQuery({
    queryKey: ['transactions_recent'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user!.id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch transactions (6 months for financial signals)
  const { data: transactionsSixMonths, isError: sixMonthError } = useQuery({
    queryKey: ['transactions_six_months'],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user!.id)
        .gte('date', sixMonthsAgo.toISOString().split('T')[0]);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch guardian incidents. The table is predation_events -- there has never
  // been a guardian_incidents table, so this query failed on every dashboard
  // load and the Decision Layer always saw zero incidents.
  const { data: guardianIncidents, isError: incidentsError } = useQuery({
    queryKey: ['predation_events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('predation_events')
        .select('*')
        .eq('user_id', user!.id)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // ============================================
  // DECISION LAYER SIGNALS
  // ============================================
  const signalParams = useMemo(() => {
    // Prepare FAMACHA data from inspections
    const famachaRecords = ((inspections as any[]) || [])
      .filter((i: any) => i.famacha != null)
      .map((i: any) => ({
        animalId: i.animal?.id || i.animal_id,
        animalName: i.animal?.name || 'Unknown',
        score: i.famacha,
        date: new Date(i.date),
      }));

    // Prepare health records for the recurrence rule (3+ of the same condition in
    // 90 days). The health query is widened to 90 days to match.
    const healthRecordsForSignals = ((healthRecords as any[]) || []).map((h: any) => ({
      animalId: h.animal?.id || h.animal_id,
      animalName: h.animal?.name || 'Unknown',
      conditionName: h.type || h.condition || 'Unknown',
      date: new Date(h.date),
    }));

    // Prepare milk data
    const milkList = (milkRecords as any[]) || [];
    // Local calendar day -- milk records store their date in local time, so a
    // UTC-derived "today" would miss today's entries in the evening west of UTC.
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    // Normalize every amount to lbs before summing -- the milk page can store
    // kg/liters/gallons/quarts, and adding those to lbs raw makes the totals,
    // averages, and the milk-drop signal compare incomparable units.
    const todayMilk = milkList
      .filter((m: any) => m.date === todayStr)
      .reduce((sum: number, m: any) => sum + milkAmountToLbs(m.amount, m.amount_unit), 0);

    const sevenDayTotal = milkList.reduce((sum: number, m: any) => sum + milkAmountToLbs(m.amount, m.amount_unit), 0);
    const uniqueDays = new Set(milkList.map((m: any) => m.date)).size;
    const sevenDayAvg = uniqueDays > 0 ? sevenDayTotal / uniqueDays : 0;

    // The milk-drop rule reads a 0 total as a 100% drop, but "not milked yet" is
    // not a drop -- so evaluate milk drop only once something is entered today
    // (farm level) and only for animals actually milked today (per-animal).
    const todayMilkAnimalIds = new Set(
      milkList.filter((m: any) => m.date === todayStr).map((m: any) => m.animal?.id || m.animal_id)
    );
    const hasTodayMilkEntry = todayMilkAnimalIds.size > 0;

    // Per-animal milk data (normalized to lbs)
    const milkByAnimal: Record<string, { id: string; name: string; today: number; total: number; days: Set<string> }> = {};
    milkList.forEach((m: any) => {
      const id = m.animal?.id || m.animal_id;
      const name = m.animal?.name || 'Unknown';
      if (!milkByAnimal[id]) {
        milkByAnimal[id] = { id, name, today: 0, total: 0, days: new Set() };
      }
      const lbs = milkAmountToLbs(m.amount, m.amount_unit);
      milkByAnimal[id].total += lbs;
      milkByAnimal[id].days.add(m.date);
      if (m.date === todayStr) {
        milkByAnimal[id].today += lbs;
      }
    });

    const milkByAnimalArray = Object.values(milkByAnimal)
      .filter((a) => todayMilkAnimalIds.has(a.id))
      .map((a) => ({
        animalId: a.id,
        animalName: a.name,
        todayTotal: a.today,
        sevenDayAverage: a.days.size > 0 ? a.total / a.days.size : 0,
      }));

    // Prepare weight data (normalized to lbs)
    const weightList = (weightRecords as any[]) || [];
    const weightByAnimal: Record<string, { id: string; name: string; weights: { weight: number; date: Date }[] }> = {};
    weightList.forEach((w: any) => {
      const id = w.animal?.id || w.animal_id;
      const name = w.animal?.name || 'Unknown';
      if (!weightByAnimal[id]) {
        weightByAnimal[id] = { id, name, weights: [] };
      }
      weightByAnimal[id].weights.push({
        weight: weightToLbs(w.weight, w.weight_unit) ?? 0,
        date: new Date(w.date),
      });
    });

    const weightDataArray = Object.values(weightByAnimal).map((a) => ({
      animalId: a.id,
      animalName: a.name,
      weights: a.weights,
    }));

    // Prepare breeding data. Only RESOLVED breedings feed the failure rule -- a
    // still-pending 'bred'/'planned' row is not a failure, and scoring it as one
    // raised a false "breeding difficulty" alarm for does simply mid-cycle.
    const breedingList = (breedingRecords as any[]) || [];
    const RESOLVED_SUCCESS = new Set(['confirmed_pregnant', 'kidded']);
    const RESOLVED_FAILURE = new Set(['open', 'aborted', 'not_pregnant']);
    const breedingByAnimal: Record<string, { id: string; name: string; breedings: { date: Date; successful: boolean }[] }> = {};
    breedingList.forEach((b: any) => {
      const isSuccess = RESOLVED_SUCCESS.has(b.status);
      const isFailure = RESOLVED_FAILURE.has(b.status);
      if (!isSuccess && !isFailure) return; // pending -- don't score yet
      const id = b.doe?.id || b.doe_id;
      const name = b.doe?.name || 'Unknown';
      if (!breedingByAnimal[id]) {
        breedingByAnimal[id] = { id, name, breedings: [] };
      }
      breedingByAnimal[id].breedings.push({
        date: new Date(b.breeding_date || b.date),
        successful: isSuccess,
      });
    });

    const breedingDataArray = Object.values(breedingByAnimal).map((a) => ({
      animalId: a.id,
      animalName: a.name,
      breedings: a.breedings,
    }));

    // Breeding season start (assume September 1 of current year or previous if we're before Sept)
    const now = new Date();
    const breedingSeasonStart = new Date(
      now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1,
      8, // September
      1
    );

    // Prepare financial data (6 months)
    const txList = (transactionsSixMonths as any[]) || [];
    const animalCount = ((animals as any[]) || []).filter((a: any) => a.status === 'active').length;
    const totalIncome = txList
      .filter((t: any) => t.type === 'income')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const totalExpenses = txList
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    // Prepare guardian incidents
    const incidentList = ((guardianIncidents as any[]) || []).map((i: any) => ({
      type: i.predator_type || i.type || 'Unknown',
      location: i.location || 'Unknown',
      date: new Date(i.date),
      guardianId: i.guardian_id,
    }));

    return {
      famachaRecords,
      healthRecords: healthRecordsForSignals,
      milkData: hasTodayMilkEntry
        ? { todayTotal: todayMilk, sevenDayAverage: sevenDayAvg, byAnimal: milkByAnimalArray }
        : undefined,
      weightData: weightDataArray,
      breedingData: breedingDataArray,
      breedingSeasonStart,
      financialData: animalCount > 0
        ? { totalIncome, totalExpenses, periodMonths: 6, animalCount }
        : undefined,
      guardianIncidents: incidentList,
    };
  }, [inspections, healthRecords, milkRecords, weightRecords, breedingRecords, transactionsSixMonths, animals, guardianIncidents]);

  // getDecisionSignals has an async signature, so compute in an effect and hold
  // the result in state. This runs the FULL aggregator -- including the breeding,
  // guardian-incident, and health-recurrence signals the old inline
  // reimplementation silently omitted.
  const [decisionSignals, setDecisionSignals] = useState<DecisionSignal[]>([]);
  useEffect(() => {
    let cancelled = false;
    getDecisionSignals(signalParams)
      .then((s) => { if (!cancelled) setDecisionSignals(s); })
      .catch((err) => { console.error('Failed to compute decision signals:', err); });
    return () => { cancelled = true; };
  }, [signalParams]);

  // Calculate stats
  const stats = useMemo(() => {
    const animalsList = (animals as any[]) || [];
    const breedingList = (breedingRecords as any[]) || [];
    const milkList = (milkRecords as any[]) || [];
    const transactionsList = (transactions as any[]) || [];

    const activeAnimals = animalsList.filter((a: any) => a.status === 'active').length;
    const milkingDoes = animalsList.filter((a: any) => categoryIs(a, 'milking_female') && a.status === 'active').length;
    const bucks = animalsList.filter((a: any) => isIntactMale(a) && a.status === 'active').length;
    const kids = animalsList.filter((a: any) => (categoryIs(a, 'young_female') || categoryIs(a, 'young_male') || categoryIs(a, 'young')) && a.status === 'active').length;

    // Pregnant does -- count DISTINCT does, not breeding rows. A doe with more
    // than one open breeding row (e.g. a stale 'bred' plus a 'confirmed_pregnant')
    // was counted multiple times, overstating the herd.
    const pregnantDoes = new Set(
      breedingList
        .filter((b: any) => b.status === 'confirmed_pregnant' || b.status === 'bred')
        .map((b: any) => b.doe_id)
    ).size;

    // Upcoming due dates (next 30 days). Compare on date STRINGS ('YYYY-MM-DD',
    // where lexicographic order == chronological) so a doe due TODAY isn't misfiled
    // as overdue by the current time-of-day: new Date(due_date) is UTC midnight, and
    // comparing it to a local `now` that carries a time made "due today" read < now.
    const pad = (n: number) => String(n).padStart(2, '0');
    const d0 = new Date();
    const todayStr = `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}-${pad(d0.getDate())}`;
    const d30 = new Date();
    d30.setDate(d0.getDate() + 30);
    const in30Str = `${d30.getFullYear()}-${pad(d30.getMonth() + 1)}-${pad(d30.getDate())}`;

    const upcomingDues = breedingList.filter((b: any) => {
      if (!b.due_date || (b.status !== 'confirmed_pregnant' && b.status !== 'bred')) return false;
      return b.due_date >= todayStr && b.due_date <= in30Str;
    }).sort((a: any, b: any) => (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0));

    // Overdue does
    const overdueDoes = breedingList.filter((b: any) => {
      if (!b.due_date || (b.status !== 'confirmed_pregnant' && b.status !== 'bred')) return false;
      return b.due_date < todayStr;
    });

    // Milk production this week (normalized to lbs)
    const totalMilkWeek = milkList.reduce((sum: number, r: any) => sum + milkAmountToLbs(r.amount, r.amount_unit), 0);
    const milkDays = new Set(milkList.map((r: any) => r.date)).size;
    const avgDailyMilk = milkDays > 0 ? totalMilkWeek / milkDays : 0;

    // Financial this month
    const income = transactionsList
      .filter((t: any) => t.type === 'income')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const expenses = transactionsList
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    return {
      activeAnimals,
      milkingDoes,
      bucks,
      kids,
      pregnantDoes,
      upcomingDues,
      overdueDoes,
      totalMilkWeek,
      avgDailyMilk,
      income,
      expenses,
      profit: income - expenses,
    };
  }, [animals, breedingRecords, milkRecords, transactions]);

  // Recent activity
  const recentActivity = useMemo(() => {
    const activities: any[] = [];
    
    // Add health records
    ((healthRecords as any[]) || []).slice(0, 5).forEach((r: any) => {
      activities.push({
        type: 'health',
        icon: Heart,
        color: 'text-red-500',
        bgColor: 'bg-red-100',
        title: r.type,
        subtitle: r.animal?.name || 'Unknown',
        animalId: r.animal?.id || r.animal_id,
        date: r.date,
      });
    });

    // Add milk records (last entry per day)
    const milkByDate: any = {};
    ((milkRecords as any[]) || []).forEach((r: any) => {
      if (!milkByDate[r.date]) {
        milkByDate[r.date] = { total: 0, date: r.date };
      }
      milkByDate[r.date].total += milkAmountToLbs(r.amount, r.amount_unit);
    });
    Object.values(milkByDate).slice(0, 3).forEach((r: any) => {
      activities.push({
        type: 'milk',
        icon: Milk,
        color: 'text-green-500',
        bgColor: 'bg-green-100',
        title: `${r.total.toFixed(1)} lbs milk`,
        subtitle: 'Daily total',
        date: r.date,
      });
    });

    // Sort by date
    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  }, [healthRecords, milkRecords]);

  // Tasks/Alerts (keeping existing logic)
  const tasks = useMemo(() => {
    const taskList: any[] = [];

    // Overdue does
    stats.overdueDoes.forEach((b: any) => {
      const daysOverdue = differenceInCalendarDays(startOfToday(), parseISO(String(b.due_date).slice(0, 10)));
      taskList.push({
        type: 'urgent',
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        title: `${b.doe?.name || 'Doe'} is ${daysOverdue} days overdue`,
        animalId: b.doe?.id || b.doe_id,
        animalName: b.doe?.name,
        link: '/dashboard/kidding',
        priority: 1,
      });
    });

    // Due this week -- compare in whole calendar days on the local date, matching
    // how upcomingDues itself was filtered (a raw `new Date(due_date)` here parsed
    // as UTC and drifted the 7-day cutoff versus the badge below).
    stats.upcomingDues.filter((b: any) => differenceInCalendarDays(parseISO(String(b.due_date).slice(0, 10)), startOfToday()) <= 7).forEach((b: any) => {
      const daysUntil = differenceInCalendarDays(parseISO(String(b.due_date).slice(0, 10)), startOfToday());
      taskList.push({
        type: 'warning',
        icon: Baby,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        title: `${b.doe?.name || 'Doe'} due in ${daysUntil} days`,
        animalId: b.doe?.id || b.doe_id,
        animalName: b.doe?.name,
        link: '/dashboard/kidding',
        priority: 2,
      });
    });

    return taskList.sort((a, b) => a.priority - b.priority).slice(0, 6);
  }, [stats]);

  if (animalsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (animalsError) {
    return (
      <div className="space-y-6">
        <ErrorState onRetry={() => refetchAnimals()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Today</h1>
          <p className="text-gray-500">Welcome back! Here's what's happening on your farm.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/add-animal">
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
              Add Animal
            </Button>
          </Link>
        </div>
      </div>

      {/* Some data failed to load. The dashboard degrades to zeros/absent signals
          when a secondary query errors, which reads as a false "all clear" -- warn
          so the figures below aren't mistaken for a complete picture. */}
      {(breedingError || healthError || inspectionsError || milkError || weightError || transactionsError || sixMonthError || incidentsError) && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Some data couldn't be loaded, so the figures and alerts below may be incomplete. Please refresh.
          </p>
        </div>
      )}

      {/* ============================================ */}
      {/* DECISION LAYER - Farm Status Summary */}
      {/* ============================================ */}
      <DecisionSummaryBar signals={decisionSignals} />

      {/* Decision Signals List (if any non-normal signals) */}
      {decisionSignals.length > 0 && (
        <DecisionSignalList
          signals={decisionSignals}
          title="What Needs Your Attention"
          maxVisible={3}
          compact={false}
        />
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card padding="sm" className="text-center">
          <Users className="h-5 w-5 mx-auto mb-1 text-primary-600" />
          <p className="text-2xl font-bold">{stats.activeAnimals}</p>
          <p className="text-xs text-gray-500">Active Animals</p>
        </Card>
        <Card padding="sm" className="text-center">
          <Droplets className="h-5 w-5 mx-auto mb-1 text-green-600" />
          <p className="text-2xl font-bold">{stats.milkingDoes}</p>
          <p className="text-xs text-gray-500">Milking Does</p>
        </Card>
        <Card padding="sm" className="text-center">
          <Baby className="h-5 w-5 mx-auto mb-1 text-purple-600" />
          <p className="text-2xl font-bold">{stats.pregnantDoes}</p>
          <p className="text-xs text-gray-500">Pregnant</p>
        </Card>
        <Card padding="sm" className="text-center">
          <Milk className="h-5 w-5 mx-auto mb-1 text-cyan-600" />
          <p className="text-2xl font-bold">{stats.avgDailyMilk.toFixed(1)}</p>
          <p className="text-xs text-gray-500">lbs/day avg</p>
        </Card>
        <Card padding="sm" className="text-center">
          <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-600" />
          <p className="text-2xl font-bold text-green-600">${stats.income.toFixed(0)}</p>
          <p className="text-xs text-gray-500">Income (30d)</p>
        </Card>
        <Card padding="sm" className="text-center">
          <DollarSign className="h-5 w-5 mx-auto mb-1 text-red-500" />
          <p className="text-2xl font-bold text-red-500">${stats.expenses.toFixed(0)}</p>
          <p className="text-xs text-gray-500">Expenses (30d)</p>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks & Alerts */}
        <Card className="lg:col-span-2">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              Upcoming Events
            </h3>
            <span className="text-sm text-gray-500">{tasks.length} items</span>
          </div>
          <div className="divide-y">
            {tasks.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p className="text-gray-600 font-medium">All caught up!</p>
                <p className="text-sm text-gray-500">No upcoming events</p>
              </div>
            ) : (
              tasks.map((task, i) => (
                <div key={i} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                  <div className={`w-10 h-10 rounded-full ${task.bgColor} flex items-center justify-center`}>
                    <task.icon className={`h-5 w-5 ${task.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">
                      {task.animalId && task.animalName ? (
                        <>
                          <AnimalLink 
                            animalId={task.animalId} 
                            name={task.animalName}
                            variant="bold"
                          />
                          <span className="font-normal text-gray-700">
                            {task.title.replace(task.animalName, '').trim()}
                          </span>
                        </>
                      ) : (
                        task.title
                      )}
                    </p>
                    {task.subtitle && (
                      <p className="text-sm text-gray-500 truncate">{task.subtitle}</p>
                    )}
                  </div>
                  <Link href={task.link}>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </Link>
                </div>
              ))
            )}
          </div>
          {tasks.length > 0 && (
            <div className="p-3 border-t bg-gray-50">
              <Link href="/dashboard/breeding" className="text-sm text-primary-600 hover:underline">
                View breeding calendar →
              </Link>
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card>
          <div className="p-4 border-b">
            <h3 className="font-semibold">Quick Actions</h3>
          </div>
          <div className="p-4 space-y-2">
            <Link href="/dashboard/add-animal" className="block">
              <Button variant="outline" className="w-full justify-start" leftIcon={<Plus className="h-4 w-4" />}>
                Add Animal
              </Button>
            </Link>
            <Link href="/dashboard/milk" className="block">
              <Button variant="outline" className="w-full justify-start" leftIcon={<Milk className="h-4 w-4" />}>
                Record Milk
              </Button>
            </Link>
            <Link href="/dashboard/health" className="block">
              <Button variant="outline" className="w-full justify-start" leftIcon={<Heart className="h-4 w-4" />}>
                Add Health Record
              </Button>
            </Link>
            <Link href="/dashboard/breeding" className="block">
              <Button variant="outline" className="w-full justify-start" leftIcon={<Baby className="h-4 w-4" />}>
                Record Breeding
              </Button>
            </Link>
            <Link href="/dashboard/finances" className="block">
              <Button variant="outline" className="w-full justify-start" leftIcon={<DollarSign className="h-4 w-4" />}>
                Add Transaction
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Recent Activity
            </h3>
          </div>
          <div className="divide-y">
            {recentActivity.length === 0 ? (
              <div className="p-6 text-center">
                <Clock className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            ) : (
              recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <div className={`w-8 h-8 rounded-full ${activity.bgColor} flex items-center justify-center`}>
                    <activity.icon className={`h-4 w-4 ${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{activity.title}</p>
                    <p className="text-xs text-gray-500">
                      {activity.animalId ? (
                        <AnimalLink 
                          animalId={activity.animalId} 
                          name={activity.subtitle}
                          variant="subtle"
                        />
                      ) : (
                        activity.subtitle
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(activity.date)}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Upcoming Due Dates */}
        <Card>
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2">
              <Baby className="h-5 w-5 text-purple-500" />
              Upcoming Due Dates
            </h3>
          </div>
          <div className="divide-y">
            {stats.upcomingDues.length === 0 ? (
              <div className="p-6 text-center">
                <Baby className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">No upcoming due dates</p>
              </div>
            ) : (
              stats.upcomingDues.slice(0, 5).map((breeding: any, i: number) => {
                const daysUntil = differenceInCalendarDays(parseISO(String(breeding.due_date).slice(0, 10)), startOfToday());
                const isUrgent = daysUntil <= 7;
                
                return (
                  <div key={i} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {breeding.doe?.id ? (
                          <AnimalLink 
                            animalId={breeding.doe.id} 
                            name={breeding.doe.name}
                            variant="bold"
                          />
                        ) : (
                          breeding.doe?.name || 'Unknown'
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(breeding.due_date)}</p>
                    </div>
                    <Badge className={isUrgent ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}>
                      {daysUntil} days
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
          {stats.upcomingDues.length > 0 && (
            <div className="p-3 border-t bg-gray-50">
              <Link href="/dashboard/breeding" className="text-sm text-primary-600 hover:underline">
                View all →
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Milk Production Chart */}
      <Card>
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2">
            <Milk className="h-5 w-5 text-green-500" />
            Milk Production (Last 7 Days)
          </h3>
          <Link href="/dashboard/reports" className="text-sm text-primary-600 hover:underline">
            View Reports →
          </Link>
        </div>
        <div className="p-4">
          {(() => {
            const milkList = (milkRecords as any[]) || [];
            if (milkList.length === 0) {
              return (
                <div className="text-center py-8">
                  <Milk className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No milk records this week</p>
                  <Link href="/dashboard/milk">
                    <Button size="sm" variant="secondary" className="mt-3">
                      Record Milk
                    </Button>
                  </Link>
                </div>
              );
            }

            // Group by date (normalized to lbs)
            const byDate: Record<string, number> = {};
            milkList.forEach((r: any) => {
              if (!byDate[r.date]) byDate[r.date] = 0;
              byDate[r.date] += milkAmountToLbs(r.amount, r.amount_unit);
            });

            const dates = Object.keys(byDate).sort();
            const maxMilk = Math.max(...Object.values(byDate));

            return (
              <div className="flex items-end justify-between gap-2 h-40">
                {dates.map((date) => {
                  const amount = byDate[date];
                  const height = maxMilk > 0 ? (amount / maxMilk) * 100 : 0;
                  // parseISO keeps the label on the record's local date; new Date on a
                  // 'YYYY-MM-DD' string is UTC midnight and prints the prior weekday west of UTC.
                  const dayName = format(parseISO(date), 'EEE');

                  return (
                    <div key={date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-500">{amount.toFixed(1)}</span>
                      <div className="w-full bg-gray-100 rounded-t flex-1 flex items-end">
                        <div
                          className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                          style={{ height: `${height}%`, minHeight: amount > 0 ? '8px' : '0' }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{dayName}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </Card>

      {/* Herd Summary */}
      <Card>
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-500" />
            Herd Summary
          </h3>
          <Link href="/dashboard/herd" className="text-sm text-primary-600 hover:underline">
            View Herd →
          </Link>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {(() => {
              const animalsList = (animals as any[]) || [];
              const categories: Record<string, { count: number; color: string }> = {
                'milking_female': { count: 0, color: 'bg-green-500' },
                'dry_female': { count: 0, color: 'bg-yellow-500' },
                'bred_female': { count: 0, color: 'bg-purple-500' },
                'male': { count: 0, color: 'bg-blue-500' },
                'castrated': { count: 0, color: 'bg-slate-500' },
                'young_female': { count: 0, color: 'bg-pink-400' },
                'young_male': { count: 0, color: 'bg-cyan-400' },
                'young': { count: 0, color: 'bg-teal-400' },
                'other': { count: 0, color: 'bg-gray-400' },
              };

              animalsList.filter((a: any) => a.status === 'active').forEach((a: any) => {
                const canonical = toCanonicalCategory(a.category);
                if (categories[canonical]) {
                  categories[canonical].count++;
                } else if (isIntactMale(a)) {
                  categories['male'].count++;
                } else {
                  // Anything that doesn't map to a named bucket (unknown/blank
                  // category) still gets counted, so the summary reconciles with
                  // the Active Animals total instead of silently dropping animals.
                  categories['other'].count++;
                }
              });

              const categoryLabels: Record<string, string> = {
                'milking_female': 'Milking Does',
                'dry_female': 'Dry Does',
                'bred_female': 'Bred Does',
                'male': 'Bucks',
                'castrated': 'Wethers',
                'young_female': 'Doelings',
                'young_male': 'Bucklings',
                'young': 'Kids',
                'other': 'Other',
              };

              // Show only non-empty buckets (the added Wethers/Kids/Other rows
              // would otherwise render as a wall of zeros); if the herd is empty
              // fall back to showing the core buckets.
              const entries = Object.entries(categories).filter(([, data]) => data.count > 0);
              const shown = entries.length > 0
                ? entries
                : Object.entries(categories).slice(0, 6);
              return shown.map(([cat, data]) => (
                <div key={cat} className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full ${data.color} bg-opacity-20 flex items-center justify-center mb-2`}>
                    <span className={`text-lg font-bold ${data.color.replace('bg-', 'text-')}`}>
                      {data.count}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{categoryLabels[cat]}</p>
                </div>
              ));
            })()}
          </div>
        </div>
      </Card>
    </div>
  );
}
