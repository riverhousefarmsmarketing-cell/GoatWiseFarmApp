/**
 * GoatWise Resources - Shared Types
 * /src/data/resources/types.ts
 */

// ============ SHARED ENUMS ============

export type Severity = 'Critical' | 'Serious' | 'Watch';

export type Effectiveness = 
  | 'High' 
  | 'Moderate-High' 
  | 'Moderate' 
  | 'Low-Moderate' 
  | 'Low' 
  | 'Debated/Unknown';

export type Prevalence = 'Common' | 'Occasional' | 'Uncommon' | 'Rare';

export type Importance = 'Critical' | 'High' | 'Moderate' | 'Low' | 'Low-Moderate';

// ============ CROSS-LINK SYSTEM ============

export type ResourceType = 
  | 'herb' 
  | 'mineral' 
  | 'medication' 
  | 'essential-oil' 
  | 'condition' 
  | 'myth'
  | 'breed';

export interface ResourceLink {
  type: ResourceType;
  id: number | string;
  label?: string; // Optional display override
}

// ============ STANDARD DISCLAIMERS ============

export const MANAGEMENT_BOUNDARY =
  'Provided as nutritional support. Clinical illness, neurological signs, or suspected toxicity require escalation under the Herd Health Plan.';

export const REFERENCE_DISCLAIMER =
  'Reference only — verify dosing and withdrawals from product label and professional guidance.';

export const HERB_DISCLAIMER =
  'Herbs are not substitutes for veterinary care. Natural does not mean safe - some herbs can be toxic or interact with medications. Always consult a veterinarian for serious conditions. Effectiveness ratings are based on traditional use and limited research.';

export const MEDICATION_DISCLAIMER =
  'Reference only. Verify dosing and withdrawals from product label and professional guidance. Resistance patterns vary by farm and region.';

export const ESSENTIAL_OIL_DISCLAIMER =
  'Essential oils are powerful tools and require informed use. Review safety and experience guidance before considering them.';

// ============ CATEGORY TYPES ============

export type HerbCategory =
  | 'Immune Support'
  | 'Parasite Control'
  | 'Digestive'
  | 'Respiratory'
  | 'Calming'
  | 'Wound Healing'
  | 'Nutritive'
  | 'Lactation'
  | 'Reproductive'
  | 'Antimicrobial'
  | 'Liver Support'
  | 'Anti-inflammatory'
  | 'Pain Relief'
  | 'Circulatory'
  | 'Poisoning'
  | 'General Tonic';

export type MineralCategory = 'Trace Mineral' | 'Macro Mineral' | 'Vitamin';

export type ConditionCategory =
  | 'Parasitic'
  | 'Bacterial'
  | 'Digestive'
  | 'Metabolic'
  | 'Nutritional'
  | 'Respiratory'
  | 'Viral'
  | 'Reproductive'
  | 'Musculoskeletal'
  | 'Neurological'
  | 'Urinary'
  | 'Skin';

export type MedicationClass =
  | 'Anthelmintic'
  | 'Antibiotic'
  | 'Anti-inflammatory'
  | 'Vaccine'
  | 'Coccidiostat'
  | 'Supplement'
  | 'Emergency'
  | 'Other';

// ============ SYMPTOM TAGS (for filtering) ============

export type SymptomTag =
  | 'pale-eyelids-anemia'
  | 'off-feed-lethargy'
  | 'diarrhea-scours'
  | 'bloat'
  | 'coughing-nasal'
  | 'limping'
  | 'neurological'
  | 'post-kidding'
  | 'skin-coat'
  | 'urinary'
  | 'reproductive'
  | 'fever'
  | 'weight-loss'
  | 'sudden-death'
  | 'eye-issues'
  | 'swelling';

export const SYMPTOM_TAG_LABELS: Record<SymptomTag, string> = {
  'pale-eyelids-anemia': 'Pale eyelids / Anemia',
  'off-feed-lethargy': 'Off feed / Lethargy',
  'diarrhea-scours': 'Diarrhea / Scours',
  'bloat': 'Bloat',
  'coughing-nasal': 'Coughing / Nasal discharge',
  'limping': 'Limping / Lameness',
  'neurological': 'Neurological signs',
  'post-kidding': 'Post-kidding issues',
  'skin-coat': 'Skin / Coat issues',
  'urinary': 'Urinary issues',
  'reproductive': 'Reproductive issues',
  'fever': 'Fever',
  'weight-loss': 'Weight loss',
  'sudden-death': 'Sudden death risk',
  'eye-issues': 'Eye problems',
  'swelling': 'Swelling / Edema',
};

// ============ ESSENTIAL OIL USE BADGES ============

export type EOUseBadge =
  | 'external-only'        // 🟢 Green
  | 'external-aromatic'    // 🟡 Yellow
  | 'internal-experienced'; // 🔴 Red

export const EO_BADGE_LABELS: Record<EOUseBadge, string> = {
  'external-only': 'External use only',
  'external-aromatic': 'External + Aromatic',
  'internal-experienced': 'Internal — experienced handlers only',
};

export const EO_BADGE_COLORS: Record<EOUseBadge, string> = {
  'external-only': 'bg-green-100 text-green-700',
  'external-aromatic': 'bg-yellow-100 text-yellow-700',
  'internal-experienced': 'bg-red-100 text-red-700',
};

// ============ UI COLOR MAPPINGS ============

export const SEVERITY_COLORS: Record<Severity, string> = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  Serious: 'bg-orange-100 text-orange-700 border-orange-200',
  Watch: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

export const EFFECTIVENESS_COLORS: Record<string, string> = {
  High: 'bg-green-100 text-green-700',
  'Moderate-High': 'bg-lime-100 text-lime-700',
  Moderate: 'bg-yellow-100 text-yellow-700',
  'Low-Moderate': 'bg-orange-100 text-orange-700',
  Low: 'bg-red-100 text-red-700',
  'Debated/Unknown': 'bg-gray-100 text-gray-700',
};

export const PREVALENCE_COLORS: Record<Prevalence, string> = {
  Common: 'bg-red-50 text-red-700',
  Occasional: 'bg-orange-50 text-orange-700',
  Uncommon: 'bg-yellow-50 text-yellow-700',
  Rare: 'bg-green-50 text-green-700',
};

export const IMPORTANCE_COLORS: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700',
  High: 'bg-orange-100 text-orange-700',
  Moderate: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-green-100 text-green-700',
  'Low-Moderate': 'bg-lime-100 text-lime-700',
};

export const MINERAL_CATEGORY_COLORS: Record<MineralCategory, string> = {
  'Trace Mineral': 'bg-purple-100 text-purple-700',
  'Macro Mineral': 'bg-blue-100 text-blue-700',
  Vitamin: 'bg-teal-100 text-teal-700',
};

export const HERB_CATEGORY_COLORS: Record<string, string> = {
  'Immune Support': 'bg-blue-100 text-blue-700',
  'Parasite Control': 'bg-red-100 text-red-700',
  Digestive: 'bg-green-100 text-green-700',
  Respiratory: 'bg-cyan-100 text-cyan-700',
  Calming: 'bg-purple-100 text-purple-700',
  'Wound Healing': 'bg-pink-100 text-pink-700',
  Nutritive: 'bg-emerald-100 text-emerald-700',
  Lactation: 'bg-amber-100 text-amber-700',
  Reproductive: 'bg-rose-100 text-rose-700',
  Antimicrobial: 'bg-orange-100 text-orange-700',
  'Liver Support': 'bg-yellow-100 text-yellow-700',
  'Anti-inflammatory': 'bg-indigo-100 text-indigo-700',
  'Pain Relief': 'bg-red-100 text-red-700',
  Circulatory: 'bg-fuchsia-100 text-fuchsia-700',
  Poisoning: 'bg-gray-100 text-gray-700',
  'General Tonic': 'bg-teal-100 text-teal-700',
};

export const CONDITION_CATEGORY_COLORS: Record<ConditionCategory, string> = {
  Parasitic: 'bg-red-100 text-red-700',
  Bacterial: 'bg-orange-100 text-orange-700',
  Digestive: 'bg-green-100 text-green-700',
  Metabolic: 'bg-purple-100 text-purple-700',
  Nutritional: 'bg-amber-100 text-amber-700',
  Respiratory: 'bg-cyan-100 text-cyan-700',
  Viral: 'bg-pink-100 text-pink-700',
  Reproductive: 'bg-rose-100 text-rose-700',
  Musculoskeletal: 'bg-blue-100 text-blue-700',
  Neurological: 'bg-indigo-100 text-indigo-700',
  Urinary: 'bg-yellow-100 text-yellow-700',
  Skin: 'bg-teal-100 text-teal-700',
};
