// Decision Layer Rules Engine
// Location: src/lib/decisionLayer/rules.ts

import { DecisionSignal, DECISION_RULES, RuleId } from './types';

// ============================================
// HEALTH RULES
// ============================================

interface FamachaData {
  animalId: string;
  animalName: string;
  score: number;
  date: Date;
}

export function evaluateFamacha(data: FamachaData): DecisionSignal | null {
  const { animalId, animalName, score, date } = data;
  
  if (score <= 2) {
    // Normal - only return if explicitly requested
    return null; // Don't clutter with normal signals
  }
  
  if (score === 3) {
    const rule = DECISION_RULES['health-famacha-borderline'];
    return {
      id: `famacha-${animalId}-${date.getTime()}`,
      scope: 'animal',
      severity: rule.severity,
      title: rule.title,
      primaryText: rule.primaryText,
      animalId,
      animalName,
      system: rule.system,
      ruleId: 'health-famacha-borderline',
      timestamp: new Date(),
      evidence: `FAMACHA score: ${score}`,
    };
  }
  
  if (score >= 4) {
    const rule = DECISION_RULES['health-famacha-critical'];
    return {
      id: `famacha-${animalId}-${date.getTime()}`,
      scope: 'animal',
      severity: rule.severity,
      title: rule.title,
      primaryText: rule.primaryText,
      secondaryText: DECISION_RULES['health-famacha-critical'].condition,
      cta: rule.cta,
      ctaHref: rule.ctaHref,
      animalId,
      animalName,
      system: rule.system,
      ruleId: 'health-famacha-critical',
      timestamp: new Date(),
      evidence: `FAMACHA score: ${score} (critical threshold: 4-5)`,
    };
  }
  
  return null;
}

interface HealthRecurrenceData {
  animalId: string;
  animalName: string;
  conditionName: string;
  occurrences: { date: Date }[];
}

export function evaluateHealthRecurrence(data: HealthRecurrenceData): DecisionSignal | null {
  const { animalId, animalName, conditionName, occurrences } = data;
  
  // Check for 3+ occurrences in 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const recentOccurrences = occurrences.filter(o => o.date >= ninetyDaysAgo);
  
  if (recentOccurrences.length >= 3) {
    const rule = DECISION_RULES['health-recurrence'];
    return {
      id: `recurrence-${animalId}-${conditionName}`,
      scope: 'animal',
      severity: rule.severity,
      title: `${rule.title}: ${conditionName}`,
      primaryText: rule.primaryText,
      secondaryText: rule.secondaryText,
      animalId,
      animalName,
      system: rule.system,
      ruleId: 'health-recurrence',
      timestamp: new Date(),
      evidence: `${recentOccurrences.length} occurrences in last 90 days`,
    };
  }
  
  return null;
}

// ============================================
// MILK PRODUCTION RULES
// ============================================

interface MilkProductionData {
  animalId?: string;
  animalName?: string;
  todayTotal: number;
  sevenDayAverage: number;
  scope: 'farm' | 'animal';
}

export function evaluateMilkDrop(data: MilkProductionData): DecisionSignal | null {
  const { animalId, animalName, todayTotal, sevenDayAverage, scope } = data;
  
  if (sevenDayAverage === 0) return null;
  
  const percentDrop = ((sevenDayAverage - todayTotal) / sevenDayAverage) * 100;
  
  if (percentDrop > 15) {
    const rule = DECISION_RULES['milk-sudden-drop'];
    return {
      id: `milk-drop-${animalId || 'farm'}-${Date.now()}`,
      scope,
      severity: rule.severity,
      title: rule.title,
      primaryText: rule.primaryText,
      secondaryText: rule.secondaryText,
      cta: rule.cta,
      ctaHref: rule.ctaHref,
      animalId,
      animalName,
      system: rule.system,
      ruleId: 'milk-sudden-drop',
      timestamp: new Date(),
      evidence: `Today: ${todayTotal.toFixed(1)} lbs vs 7-day avg: ${sevenDayAverage.toFixed(1)} lbs (${percentDrop.toFixed(0)}% drop)`,
    };
  }
  
  return null;
}

// ============================================
// WEIGHT RULES
// ============================================

interface WeightData {
  animalId: string;
  animalName: string;
  weights: { weight: number; date: Date }[];
}

export function evaluateWeightLoss(data: WeightData): DecisionSignal | null {
  const { animalId, animalName, weights } = data;
  
  if (weights.length < 3) return null;
  
  // Sort by date, most recent first
  const sorted = [...weights].sort((a, b) => b.date.getTime() - a.date.getTime());
  const recent = sorted.slice(0, 3);
  
  // Check for consistent decline
  const isDecline = recent[0].weight < recent[1].weight && recent[1].weight < recent[2].weight;
  
  if (!isDecline) return null;
  
  // Calculate total loss percentage
  const oldestWeight = recent[2].weight;
  const newestWeight = recent[0].weight;
  const percentLoss = ((oldestWeight - newestWeight) / oldestWeight) * 100;
  
  // Calculate days between oldest and newest
  const daysBetween = Math.ceil(
    (recent[0].date.getTime() - recent[2].date.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Same-day re-weighs are scale/handling jitter, not a trend.
  if (daysBetween <= 0) return null;

  // Rapid loss: >5% in <30 days
  if (percentLoss > 5 && daysBetween < 30) {
    const rule = DECISION_RULES['weight-rapid-loss'];
    return {
      id: `weight-rapid-${animalId}`,
      scope: 'animal',
      severity: rule.severity,
      title: rule.title,
      primaryText: rule.primaryText,
      secondaryText: rule.secondaryText,
      cta: rule.cta,
      ctaHref: rule.ctaHref,
      animalId,
      animalName,
      system: rule.system,
      ruleId: 'weight-rapid-loss',
      timestamp: new Date(),
      evidence: `Lost ${percentLoss.toFixed(1)}% (${(oldestWeight - newestWeight).toFixed(1)} lbs) in ${daysBetween} days`,
    };
  }

  // Slow loss: a consistent decline of at least 2% across the 3 weigh-ins. The
  // magnitude floor keeps normal weigh-to-weigh drift (e.g. a fraction of a pound
  // of gut fill) from raising a false alarm on every monotonic dip.
  if (percentLoss >= 2) {
    const rule = DECISION_RULES['weight-slow-loss'];
    return {
      id: `weight-slow-${animalId}`,
      scope: 'animal',
      severity: rule.severity,
      title: rule.title,
      primaryText: rule.primaryText,
      secondaryText: rule.secondaryText,
      animalId,
      animalName,
      system: rule.system,
      ruleId: 'weight-slow-loss',
      timestamp: new Date(),
      evidence: `Declined ${percentLoss.toFixed(1)}% across 3 weigh-ins over ${daysBetween} days`,
    };
  }

  return null;
}

// ============================================
// BREEDING RULES
// ============================================

interface BreedingData {
  animalId: string;
  animalName: string;
  breedings: { date: Date; successful: boolean }[];
  seasonStart: Date;
}

export function evaluateBreedingFailure(data: BreedingData): DecisionSignal | null {
  const { animalId, animalName, breedings, seasonStart } = data;
  
  // Filter to current season
  const seasonBreedings = breedings.filter(b => b.date >= seasonStart);
  const failures = seasonBreedings.filter(b => !b.successful);
  
  if (failures.length >= 2) {
    const rule = DECISION_RULES['breeding-repeated-failure'];
    return {
      id: `breeding-failure-${animalId}`,
      scope: 'animal',
      severity: rule.severity,
      title: rule.title,
      primaryText: rule.primaryText,
      secondaryText: rule.secondaryText,
      animalId,
      animalName,
      system: rule.system,
      ruleId: 'breeding-repeated-failure',
      timestamp: new Date(),
      evidence: `${failures.length} unsuccessful breedings this season`,
    };
  }
  
  return null;
}

// ============================================
// FINANCIAL RULES
// ============================================

interface FinancialData {
  totalIncome: number;
  totalExpenses: number;
  periodMonths: number;
  animalCount: number;
}

export function evaluateFinancialLoss(data: FinancialData): DecisionSignal | null {
  const { totalIncome, totalExpenses, periodMonths, animalCount } = data;
  
  if (periodMonths < 6) return null;
  
  const perAnimalCost = totalExpenses / animalCount;
  const perAnimalRevenue = totalIncome / animalCount;
  
  if (perAnimalCost > perAnimalRevenue) {
    const rule = DECISION_RULES['financial-sustained-loss'];
    return {
      id: `financial-loss-${Date.now()}`,
      scope: 'farm',
      severity: rule.severity,
      title: rule.title,
      primaryText: rule.primaryText,
      secondaryText: rule.secondaryText,
      cta: rule.cta,
      ctaHref: rule.ctaHref,
      system: rule.system,
      ruleId: 'financial-sustained-loss',
      timestamp: new Date(),
      evidence: `Per-animal: $${perAnimalRevenue.toFixed(2)} revenue vs $${perAnimalCost.toFixed(2)} cost over ${periodMonths} months`,
    };
  }
  
  return null;
}

// ============================================
// GUARDIAN RULES
// ============================================

interface GuardianIncidentData {
  incidents: { 
    type: string;
    location: string;
    date: Date;
    guardianId?: string;
  }[];
}

export function evaluateGuardianIncidents(data: GuardianIncidentData): DecisionSignal | null {
  const { incidents } = data;
  
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  // Group by type+location
  const grouped: Record<string, typeof incidents> = {};
  
  incidents.filter(i => i.date >= sixtyDaysAgo).forEach(incident => {
    const key = `${incident.type}-${incident.location}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(incident);
  });
  
  // Find any group with 2+ incidents
  for (const [key, group] of Object.entries(grouped)) {
    if (group.length >= 2) {
      const [type, location] = key.split('-');
      const rule = DECISION_RULES['guardian-repeated-incidents'];
      return {
        id: `guardian-incidents-${key}`,
        scope: 'farm',
        severity: rule.severity,
        title: rule.title,
        primaryText: rule.primaryText,
        secondaryText: rule.secondaryText,
        system: rule.system,
        ruleId: 'guardian-repeated-incidents',
        timestamp: new Date(),
        evidence: `${group.length} ${type} incidents at ${location} in last 60 days`,
      };
    }
  }
  
  return null;
}
