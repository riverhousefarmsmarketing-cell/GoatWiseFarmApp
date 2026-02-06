// Decision Layer - Main Export & Aggregator
// Location: src/lib/decisionLayer/index.ts

export * from './types';
export * from './rules';

import { DecisionSignal } from './types';
import {
  evaluateFamacha,
  evaluateHealthRecurrence,
  evaluateMilkDrop,
  evaluateWeightLoss,
  evaluateBreedingFailure,
  evaluateFinancialLoss,
  evaluateGuardianIncidents,
} from './rules';

// ============================================
// AGGREGATOR FUNCTION
// ============================================

interface GetDecisionSignalsParams {
  // Health data
  famachaRecords?: Array<{
    animalId: string;
    animalName: string;
    score: number;
    date: Date;
  }>;
  
  healthRecords?: Array<{
    animalId: string;
    animalName: string;
    conditionName: string;
    date: Date;
  }>;
  
  // Milk data
  milkData?: {
    todayTotal: number;
    sevenDayAverage: number;
    byAnimal?: Array<{
      animalId: string;
      animalName: string;
      todayTotal: number;
      sevenDayAverage: number;
    }>;
  };
  
  // Weight data
  weightData?: Array<{
    animalId: string;
    animalName: string;
    weights: Array<{ weight: number; date: Date }>;
  }>;
  
  // Breeding data
  breedingData?: Array<{
    animalId: string;
    animalName: string;
    breedings: Array<{ date: Date; successful: boolean }>;
  }>;
  breedingSeasonStart?: Date;
  
  // Financial data
  financialData?: {
    totalIncome: number;
    totalExpenses: number;
    periodMonths: number;
    animalCount: number;
  };
  
  // Guardian data
  guardianIncidents?: Array<{
    type: string;
    location: string;
    date: Date;
    guardianId?: string;
  }>;
}

export async function getDecisionSignals(
  params: GetDecisionSignalsParams
): Promise<DecisionSignal[]> {
  const signals: DecisionSignal[] = [];
  
  // ---- HEALTH: FAMACHA ----
  if (params.famachaRecords) {
    // Get most recent FAMACHA per animal
    const latestByAnimal = new Map<string, typeof params.famachaRecords[0]>();
    
    params.famachaRecords.forEach(record => {
      const existing = latestByAnimal.get(record.animalId);
      if (!existing || record.date > existing.date) {
        latestByAnimal.set(record.animalId, record);
      }
    });
    
    latestByAnimal.forEach(record => {
      const signal = evaluateFamacha(record);
      if (signal) signals.push(signal);
    });
  }
  
  // ---- HEALTH: RECURRENCE ----
  if (params.healthRecords) {
    // Group by animal + condition
    const grouped = new Map<string, { 
      animalId: string;
      animalName: string;
      conditionName: string;
      occurrences: { date: Date }[];
    }>();
    
    params.healthRecords.forEach(record => {
      const key = `${record.animalId}-${record.conditionName}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          animalId: record.animalId,
          animalName: record.animalName,
          conditionName: record.conditionName,
          occurrences: [],
        });
      }
      grouped.get(key)!.occurrences.push({ date: record.date });
    });
    
    grouped.forEach(data => {
      const signal = evaluateHealthRecurrence(data);
      if (signal) signals.push(signal);
    });
  }
  
  // ---- MILK: SUDDEN DROP ----
  if (params.milkData) {
    // Farm-level
    const farmSignal = evaluateMilkDrop({
      todayTotal: params.milkData.todayTotal,
      sevenDayAverage: params.milkData.sevenDayAverage,
      scope: 'farm',
    });
    if (farmSignal) signals.push(farmSignal);
    
    // Per-animal
    if (params.milkData.byAnimal) {
      params.milkData.byAnimal.forEach(animal => {
        const signal = evaluateMilkDrop({
          animalId: animal.animalId,
          animalName: animal.animalName,
          todayTotal: animal.todayTotal,
          sevenDayAverage: animal.sevenDayAverage,
          scope: 'animal',
        });
        if (signal) signals.push(signal);
      });
    }
  }
  
  // ---- WEIGHT: LOSS ----
  if (params.weightData) {
    params.weightData.forEach(animal => {
      const signal = evaluateWeightLoss(animal);
      if (signal) signals.push(signal);
    });
  }
  
  // ---- BREEDING: FAILURE ----
  if (params.breedingData && params.breedingSeasonStart) {
    params.breedingData.forEach(animal => {
      const signal = evaluateBreedingFailure({
        ...animal,
        seasonStart: params.breedingSeasonStart!,
      });
      if (signal) signals.push(signal);
    });
  }
  
  // ---- FINANCIAL: SUSTAINED LOSS ----
  if (params.financialData) {
    const signal = evaluateFinancialLoss(params.financialData);
    if (signal) signals.push(signal);
  }
  
  // ---- GUARDIAN: REPEATED INCIDENTS ----
  if (params.guardianIncidents) {
    const signal = evaluateGuardianIncidents({ incidents: params.guardianIncidents });
    if (signal) signals.push(signal);
  }
  
  return signals;
}

// ============================================
// HELPER: Get signals for a specific animal
// ============================================

export function getAnimalSignals(
  allSignals: DecisionSignal[],
  animalId: string
): DecisionSignal[] {
  return allSignals.filter(s => s.animalId === animalId);
}

// ============================================
// HELPER: Get signals by system
// ============================================

export function getSystemSignals(
  allSignals: DecisionSignal[],
  system: DecisionSignal['system']
): DecisionSignal[] {
  return allSignals.filter(s => s.system === system);
}

// ============================================
// HELPER: Get highest severity from signals
// ============================================

export function getHighestSeverity(
  signals: DecisionSignal[]
): DecisionSignal['severity'] {
  if (signals.some(s => s.severity === 'action')) return 'action';
  if (signals.some(s => s.severity === 'attention')) return 'attention';
  if (signals.some(s => s.severity === 'watching')) return 'watching';
  return 'normal';
}

// ============================================
// HELPER: Count signals by severity
// ============================================

export function countBySeverity(signals: DecisionSignal[]): {
  action: number;
  attention: number;
  watching: number;
  normal: number;
  total: number;
} {
  return {
    action: signals.filter(s => s.severity === 'action').length,
    attention: signals.filter(s => s.severity === 'attention').length,
    watching: signals.filter(s => s.severity === 'watching').length,
    normal: signals.filter(s => s.severity === 'normal').length,
    total: signals.length,
  };
}
