/**
 * GoatWise Resources - Central Export
 * /src/data/resources/index.ts
 *
 * Re-exports all resource data and types for easy importing
 */

// ============ TYPES ============
export * from './types';

// ============ MINERALS ============
export {
  minerals,
  getMineralById,
  getMineralsByCategory,
  getMineralsByImportance,
  searchMinerals,
  buildMineralPreview,
  buildMineralDescription,
} from './minerals';
export type { MineralEntry } from './minerals';

// ============ HERBS ============
export {
  herbs,
  HERB_DISCLAIMER,
  getHerbById,
  getHerbsByCategory,
  getHerbsWithPregnancyWarning,
  getTopicalOnlyHerbs,
  searchHerbs,
  getHerbCategories,
} from './herbs';
export type { HerbEntry } from './herbs';

// ============ ESSENTIAL OILS ============
export {
  essentialOils,
  EO_PRINCIPLES,
  EO_CONDITION_NOTE,
  getDisplayableEssentialOils,
  getEssentialOilById,
  getEssentialOilsByBadge,
  getHotOils,
  searchEssentialOils,
  getEOBadgeInfo,
} from './essential-oils';
export type { EssentialOilEntry } from './essential-oils';

// ============ CONDITIONS ============
export {
  conditions,
  getConditionById,
  getConditionsByCategory,
  getConditionsBySeverity,
  getConditionsBySymptomTag,
  getEmergencyConditions,
  searchConditions,
  getConditionCategories,
  getConditionsBySymptomTags,
} from './conditions';
export type { ConditionEntry, SupportPathway } from './conditions';

// ============ MEDICATIONS ============
export {
  medications,
  MEDICATION_DISCLAIMER,
  getMedicationById,
  getMedicationsByClass,
  getPrescriptionMedications,
  getOTCMedications,
  searchMedications,
  getMedicationClasses,
  getMedicationsForCondition,
} from './medications';
export type { MedicationEntry } from './medications';

// ============ CONVENIENCE FUNCTIONS ============

import { herbs } from './herbs';
import { minerals } from './minerals';
import { essentialOils, getDisplayableEssentialOils } from './essential-oils';
import { conditions } from './conditions';
import { medications } from './medications';

/**
 * Get counts of all resource types
 */
export function getResourceCounts() {
  return {
    herbs: herbs.length,
    minerals: minerals.length,
    essentialOils: getDisplayableEssentialOils().length,
    conditions: conditions.length,
    medications: medications.length,
  };
}

/**
 * Global search across all resource types
 */
export function searchAllResources(query: string) {
  const lowerQuery = query.toLowerCase();

  return {
    herbs: herbs.filter(
      (h) =>
        h.name.toLowerCase().includes(lowerQuery) ||
        h.scientificName.toLowerCase().includes(lowerQuery) ||
        h.commonlyUsedFor.some((u) => u.toLowerCase().includes(lowerQuery))
    ),
    minerals: minerals.filter(
      (m) =>
        m.name.toLowerCase().includes(lowerQuery) ||
        m.primaryFunctions.some((f) => f.toLowerCase().includes(lowerQuery))
    ),
    essentialOils: getDisplayableEssentialOils().filter(
      (eo) =>
        eo.name.toLowerCase().includes(lowerQuery) ||
        eo.commonAssociations.some((a) => a.toLowerCase().includes(lowerQuery))
    ),
    conditions: conditions.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.aliases?.some((a) => a.toLowerCase().includes(lowerQuery)) ||
        c.signs.some((s) => s.toLowerCase().includes(lowerQuery))
    ),
    medications: medications.filter(
      (m) =>
        m.name.toLowerCase().includes(lowerQuery) ||
        m.aliases?.some((a) => a.toLowerCase().includes(lowerQuery)) ||
        m.commonUses.some((u) => u.toLowerCase().includes(lowerQuery))
    ),
  };
}
