/**
 * GoatWise Resources - Medications Reference Data
 * /src/data/resources/medications.ts
 *
 * REFERENCE ONLY - No dosing numbers
 * Strong guardrails per Field Manual requirements
 */

import { MedicationClass, ResourceLink, MEDICATION_DISCLAIMER } from './types';

// Re-export for convenience
export { MEDICATION_DISCLAIMER };

// ============ MEDICATION TYPES ============

export interface MedicationEntry {
  id: number;
  name: string;
  aliases?: string[];
  class: MedicationClass;

  // REFERENCE ONLY - no dosing numbers
  commonUses: string[];

  // Context (weight-based, resistance varies, etc.)
  context: string;

  // Withdrawal verification required
  withdrawalNote: string;

  // Prominent cautions
  cautions: string[];

  // Resistance concerns (for anthelmintics)
  resistanceNote?: string;

  // Prescription status
  prescriptionRequired: boolean;

  // Cross-links
  relatedConditions?: number[];
}

// ============ MEDICATIONS DATA ============

export const medications: MedicationEntry[] = [
  // ============ ANTHELMINTICS (DEWORMERS) ============
  {
    id: 1,
    name: 'Ivermectin',
    aliases: ['Ivomec', 'Ivermectin Plus'],
    class: 'Anthelmintic',
    commonUses: ['Barber pole worm', 'Roundworms', 'Lungworms', 'External parasites (pour-on)'],
    context:
      'Commonly used avermectin-class dewormer. Weight-based dosing required — goats typically need higher doses than cattle label. Oral administration commonly preferred over injection for efficacy.',
    withdrawalNote:
      'Verify withdrawal times from product label. Withdrawal varies by route of administration and product formulation.',
    cautions: [
      'Resistance is widespread — verify effectiveness on your farm',
      'Do not underdose (contributes to resistance)',
      'Goat doses differ from cattle/sheep — verify externally',
      'Not effective against all parasites',
    ],
    resistanceNote:
      'Ivermectin resistance is common in many areas. Consider fecal egg count reduction testing to verify efficacy on your farm.',
    prescriptionRequired: false,
    relatedConditions: [1], // Barber pole
  },

  {
    id: 2,
    name: 'Moxidectin',
    aliases: ['Cydectin', 'Quest'],
    class: 'Anthelmintic',
    commonUses: ['Barber pole worm', 'Roundworms', 'Inhibited larvae'],
    context:
      'Avermectin-class with longer activity. Often used when ivermectin resistance is suspected. Weight-based dosing required.',
    withdrawalNote:
      'Verify withdrawal times from product label. Generally longer withdrawal than ivermectin.',
    cautions: [
      'Resistance developing in some areas',
      'Higher toxicity potential — accurate dosing critical',
      'Not labeled for goats — verify use externally',
      'Do not use in debilitated animals',
    ],
    resistanceNote:
      'Cross-resistance possible with ivermectin. May still have efficacy when ivermectin fails, but not guaranteed.',
    prescriptionRequired: false,
    relatedConditions: [1], // Barber pole
  },

  {
    id: 3,
    name: 'Amprolium',
    aliases: ['Corid', 'Amprol'],
    class: 'Coccidiostat',
    commonUses: ['Coccidiosis treatment', 'Coccidiosis prevention'],
    context:
      'Thiamine analog that interferes with coccidia. Commonly used for treatment and prevention programs. Treatment and prevention doses differ.',
    withdrawalNote: 'Generally no withdrawal for meat or milk, but verify from product label.',
    cautions: [
      'Can cause thiamine deficiency if used improperly',
      'Treatment dose differs from prevention dose',
      'Complete treatment course important',
      'Not effective against all coccidia species',
    ],
    prescriptionRequired: false,
    relatedConditions: [2], // Coccidiosis
  },

  {
    id: 4,
    name: 'Antibiotics (General)',
    aliases: ['Various'],
    class: 'Antibiotic',
    commonUses: ['Bacterial infections', 'Pneumonia', 'Mastitis', 'Foot rot', 'Wound infections'],
    context:
      'Many antibiotic classes used in goats. Selection depends on infection type and sensitivity. Veterinary guidance recommended for selection and dosing.',
    withdrawalNote:
      'Withdrawal times vary significantly by product. Always verify from product label. Extra-label use may require extended withdrawals.',
    cautions: [
      'Resistance concerns — use appropriately',
      'Complete full treatment course',
      'Many require prescription (VFD)',
      'Not all antibiotics appropriate for all infections',
      'Milk and meat withdrawals critical',
    ],
    prescriptionRequired: true,
    relatedConditions: [3], // Pneumonia
  },

  {
    id: 5,
    name: 'Electrolytes',
    aliases: ['Oral rehydration', 'ORS'],
    class: 'Supplement',
    commonUses: ['Dehydration', 'Scours/diarrhea', 'Heat stress', 'General supportive care'],
    context:
      'Critical for rehydration in sick animals. Various commercial and homemade formulations available. Often first-line treatment for diarrhea.',
    withdrawalNote: 'Generally no withdrawal required for electrolyte products.',
    cautions: [
      'Does not treat underlying cause — address that separately',
      'Severe dehydration may need IV fluids',
      'Some products not appropriate for ruminants',
      'Do not stop milk feeding in young kids',
    ],
    prescriptionRequired: false,
    relatedConditions: [4], // Scours
  },

  {
    id: 6,
    name: 'Bloat Treatment',
    aliases: ['Bloat guard', 'Poloxalene', 'Vegetable oil'],
    class: 'Emergency',
    commonUses: ['Frothy bloat', 'Bloat prevention'],
    context:
      'Surfactant products for frothy bloat. Vegetable oil sometimes used in emergencies. Free gas bloat may need different approach (tubing).',
    withdrawalNote: 'Varies by product. Many have no withdrawal. Verify from product label.',
    cautions: [
      'Differentiate frothy vs free gas bloat',
      'Severe cases may need tubing or trocar',
      'Have supplies on hand before emergency',
      'Do not force animal to lie down',
    ],
    prescriptionRequired: false,
    relatedConditions: [5], // Bloat
  },

  {
    id: 7,
    name: 'Propylene Glycol',
    aliases: ['PG', 'Ketol'],
    class: 'Supplement',
    commonUses: ['Ketosis/pregnancy toxemia', 'Energy supplementation'],
    context:
      'Rapidly absorbed energy source. Commonly used for ketosis treatment and prevention in late pregnancy. Given orally.',
    withdrawalNote: 'Generally no withdrawal required. Verify from product label.',
    cautions: [
      'Can cause rumen upset if given too much',
      'Prevention is better than treatment',
      'Monitor does in late pregnancy',
      'Severe ketosis may need veterinary intervention',
    ],
    prescriptionRequired: false,
    relatedConditions: [6], // Ketosis
  },

  {
    id: 8,
    name: 'CD&T Vaccine',
    aliases: ['Clostridial vaccine', 'Covexin', 'Bar-Vac'],
    class: 'Vaccine',
    commonUses: ['Enterotoxemia prevention', 'Tetanus prevention'],
    context:
      'Core vaccine for goats. Protects against Clostridium perfringens types C & D and tetanus. Requires initial series and boosters.',
    withdrawalNote: 'Generally 21 days. Verify from product label.',
    cautions: [
      'Requires booster for initial immunity',
      'Annual boosters recommended',
      'Boost does before kidding to protect kids',
      'Injection site reactions possible',
      'Does not treat existing infection',
    ],
    prescriptionRequired: false,
    relatedConditions: [7], // Enterotoxemia
  },

  {
    id: 9,
    name: 'Calcium Products',
    aliases: ['Calcium gluconate', 'CMPK', 'Cal-Dex'],
    class: 'Supplement',
    commonUses: ['Hypocalcemia (milk fever)', 'Post-kidding support'],
    context:
      'Injectable and oral calcium products for hypocalcemia. Subcutaneous commonly used in field. IV requires careful administration.',
    withdrawalNote: 'Varies by product. Many have no withdrawal. Verify from product label.',
    cautions: [
      'IV calcium must be given slowly (cardiac risk)',
      'Subcutaneous safer for field use',
      'Monitor for relapse',
      'Address underlying nutrition',
      'Too much calcium pre-kidding can worsen risk',
    ],
    prescriptionRequired: false,
    relatedConditions: [8], // Hypocalcemia
  },

  {
    id: 10,
    name: 'Urinary Treatments',
    aliases: ['Ammonium chloride', 'Various'],
    class: 'Supplement',
    commonUses: ['Urinary calculi prevention', 'Urinary acidification'],
    context:
      'Ammonium chloride commonly used preventively in high-risk diets. Treatment of obstruction typically requires surgical intervention.',
    withdrawalNote: 'Varies by product. Verify from product label.',
    cautions: [
      'Prevention far more effective than treatment',
      'Proper Ca:P ratio essential',
      'Adequate water access critical',
      'Once blocked, often needs surgery',
      'Do not over-supplement',
    ],
    prescriptionRequired: false,
    relatedConditions: [9], // Urinary calculi
  },

  {
    id: 11,
    name: 'BoSe (Selenium/Vitamin E)',
    aliases: ['Mu-Se', 'Selenium injection'],
    class: 'Supplement',
    commonUses: ['White muscle disease', 'Selenium deficiency', 'Weak kid support'],
    context:
      'Injectable selenium/vitamin E product. Prescription required. Used for treatment and prevention of selenium deficiency.',
    withdrawalNote: 'Check product label. Typically 30 days meat. Verify withdrawal.',
    cautions: [
      'Prescription required',
      'Narrow margin of safety — do not overdose',
      'Know your area selenium status',
      'Oral selenium also available (different products)',
      'Toxicity possible with over-supplementation',
    ],
    prescriptionRequired: true,
    relatedConditions: [10], // White muscle disease
  },

  {
    id: 12,
    name: 'Magnesium Products',
    aliases: ['Magnesium sulfate', 'CMPK', 'MagOx'],
    class: 'Supplement',
    commonUses: ['Grass tetany', 'Hypomagnesemia', 'Constipation (epsom salt)'],
    context:
      'Injectable and oral magnesium products. Injectable for emergency treatment. Oral magnesium oxide for prevention during high-risk periods.',
    withdrawalNote: 'Varies by product. Many have no withdrawal. Verify from product label.',
    cautions: [
      'Injectable magnesium for emergency only',
      'Prevention easier than treatment',
      'Manage pasture during high-risk periods',
      'High-magnesium minerals during spring grazing',
    ],
    prescriptionRequired: false,
    relatedConditions: [11], // Grass tetany
  },

  {
    id: 13,
    name: 'Thiamine (Vitamin B1)',
    aliases: ['Fortified Vitamin B Complex', 'Thiamine HCl'],
    class: 'Supplement',
    commonUses: ['Goat polio (PEM)', 'Neurological support', 'Thiamine deficiency'],
    context:
      'High-dose thiamine injection for polio treatment. Time-sensitive — early treatment critical. Higher doses commonly used in goats.',
    withdrawalNote: 'Generally no withdrawal for B vitamins. Verify from product label.',
    cautions: [
      'Must be given EARLY for best outcome',
      'Higher doses needed than standard B-complex',
      'Have on hand before emergency occurs',
      'Brain damage may be permanent if delayed',
      'Repeat doses often needed',
    ],
    prescriptionRequired: false,
    relatedConditions: [12], // Polio
  },

  {
    id: 14,
    name: 'Levamisole',
    aliases: ['Levasole', 'Tramisol', 'Prohibit'],
    class: 'Anthelmintic',
    commonUses: ['Roundworms', 'Lungworms'],
    context:
      'Imidazothiazole-class dewormer. Different drug class from avermectins. Sometimes effective when ivermectin/moxidectin resistance present.',
    withdrawalNote: 'Verify withdrawal from product label. Generally 72 hours milk, varies for meat.',
    cautions: [
      'Narrow margin of safety in goats',
      'Accurate weighing critical',
      'Do not use in debilitated animals',
      'Not as commonly used — resistance patterns vary',
    ],
    resistanceNote:
      'Different drug class than avermectins. May have efficacy when avermectin resistance present, but verify on your farm.',
    prescriptionRequired: false,
    relatedConditions: [1], // Barber pole
  },

  {
    id: 15,
    name: 'Albendazole',
    aliases: ['Valbazen'],
    class: 'Anthelmintic',
    commonUses: ['Roundworms', 'Tapeworms', 'Liver flukes'],
    context:
      'Benzimidazole-class dewormer with broad spectrum. Effective against tapeworms. Do not use in early pregnancy.',
    withdrawalNote: 'Verify withdrawal from product label. Extended withdrawal often applies.',
    cautions: [
      'Do NOT use in first trimester of pregnancy (teratogenic)',
      'Do not use in early pregnancy',
      'Resistance developing in many areas',
      'Weight-based dosing required',
    ],
    resistanceNote:
      'Benzimidazole resistance is common. Often used in rotation with other drug classes.',
    prescriptionRequired: false,
    relatedConditions: [1], // Barber pole
  },

  {
    id: 16,
    name: 'Fenbendazole',
    aliases: ['Safe-Guard', 'Panacur'],
    class: 'Anthelmintic',
    commonUses: ['Roundworms', 'Whipworms', 'Some lungworms'],
    context:
      'Benzimidazole-class dewormer. Considered very safe with wide margin of safety. Often used in dogs as well.',
    withdrawalNote: 'Verify withdrawal from product label. Generally short withdrawal.',
    cautions: [
      'Resistance common in many areas',
      'May need higher doses in goats',
      'Multiple-day protocols sometimes used',
      'Verify efficacy on your farm',
    ],
    resistanceNote:
      'Benzimidazole resistance is widespread. Consider fecal egg count reduction testing.',
    prescriptionRequired: false,
    relatedConditions: [1], // Barber pole
  },

  {
    id: 17,
    name: 'Banamine (Flunixin)',
    aliases: ['Flunixin meglumine', 'Flu-nix'],
    class: 'Anti-inflammatory',
    commonUses: ['Pain relief', 'Fever reduction', 'Inflammation', 'Colic/GI pain'],
    context:
      'NSAID commonly used for pain and fever. Effective for GI pain (colic, bloat). Prescription required.',
    withdrawalNote:
      'Extended withdrawal in food animals. Check current regulations. Not approved for lactating dairy animals.',
    cautions: [
      'Prescription required',
      'Do not use in dehydrated animals (kidney risk)',
      'Extended meat withdrawal',
      'Not for lactating dairy animals',
      'Do not give IM (causes tissue damage)',
    ],
    prescriptionRequired: true,
    relatedConditions: [5], // Bloat
  },

  {
    id: 18,
    name: 'Dexamethasone',
    aliases: ['Dex', 'Azium'],
    class: 'Anti-inflammatory',
    commonUses: ['Inflammation', 'Allergic reactions', 'Cerebral edema', 'Ketosis support'],
    context:
      'Corticosteroid with potent anti-inflammatory effects. Sometimes used with thiamine for polio. Can induce abortion.',
    withdrawalNote: 'Verify withdrawal from product label. Extended withdrawal applies.',
    cautions: [
      'Can induce abortion — do not use in pregnant animals',
      'Immunosuppressive effects',
      'Not for long-term use',
      'Many uses are extra-label',
    ],
    prescriptionRequired: true,
    relatedConditions: [12], // Polio
  },

  {
    id: 19,
    name: 'Penicillin',
    aliases: ['Pen G', 'Procaine penicillin', 'Combi-Pen'],
    class: 'Antibiotic',
    commonUses: ['Bacterial infections', 'Respiratory infections', 'Mastitis', 'Wound infections'],
    context:
      'Common antibiotic for gram-positive bacteria. Often used for respiratory and skin infections. Injection site reactions common.',
    withdrawalNote:
      'Extended withdrawal applies. Verify from product label. Extra-label use may require longer withdrawal.',
    cautions: [
      'Injection site reactions common',
      'Not effective against all bacteria',
      'Complete treatment course',
      'Withdrawal times important',
    ],
    prescriptionRequired: false,
    relatedConditions: [3], // Pneumonia
  },

  {
    id: 20,
    name: 'Oxytetracycline',
    aliases: ['LA-200', 'Bio-Mycin', 'OTC'],
    class: 'Antibiotic',
    commonUses: ['Bacterial infections', 'Respiratory infections', 'Pinkeye', 'Foot rot'],
    context:
      'Broad-spectrum antibiotic. Long-acting formulations available. Commonly used for respiratory and eye infections.',
    withdrawalNote: 'Extended withdrawal applies. Verify from product label — varies by formulation.',
    cautions: [
      'Injection site reactions common with LA formulations',
      'Stains teeth if given to young animals',
      'Withdrawal varies by product',
      'Not effective against all infections',
    ],
    prescriptionRequired: false,
    relatedConditions: [3], // Pneumonia
  },
];

// ============ HELPER FUNCTIONS ============

export function getMedicationById(id: number): MedicationEntry | undefined {
  return medications.find((m) => m.id === id);
}

export function getMedicationsByClass(medicationClass: MedicationClass): MedicationEntry[] {
  return medications.filter((m) => m.class === medicationClass);
}

export function getPrescriptionMedications(): MedicationEntry[] {
  return medications.filter((m) => m.prescriptionRequired);
}

export function getOTCMedications(): MedicationEntry[] {
  return medications.filter((m) => !m.prescriptionRequired);
}

export function searchMedications(query: string): MedicationEntry[] {
  const lowerQuery = query.toLowerCase();
  return medications.filter(
    (m) =>
      m.name.toLowerCase().includes(lowerQuery) ||
      m.aliases?.some((a) => a.toLowerCase().includes(lowerQuery)) ||
      m.commonUses.some((u) => u.toLowerCase().includes(lowerQuery)) ||
      m.context.toLowerCase().includes(lowerQuery)
  );
}

export function getMedicationClasses(): MedicationClass[] {
  return Array.from(new Set(medications.map((m) => m.class)));
}

/**
 * Get medications for a specific condition
 */
export function getMedicationsForCondition(conditionId: number): MedicationEntry[] {
  return medications.filter((m) => m.relatedConditions?.includes(conditionId));
}
