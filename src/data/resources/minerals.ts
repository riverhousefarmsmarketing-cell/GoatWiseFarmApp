/**
 * GoatWise Resources - Minerals & Vitamins Data
 * /src/data/resources/minerals.ts
 * 
 * Extracted from minerals.tsx V2 schema
 */

import {
  MineralCategory,
  Importance,
  Prevalence,
  MANAGEMENT_BOUNDARY,
  ResourceLink,
} from './types';

// ============ MINERAL TYPES ============

type CommonSource = 'Water' | 'Forage' | 'Feed' | 'Soil' | 'Other';

interface Antagonist {
  mineral: string;
  commonSource?: CommonSource;
  note?: string;
}

export interface MineralEntry {
  id: number;
  name: string;
  category: MineralCategory;
  importance: Importance;
  species: string;

  primaryFunctions: string[];

  deficiency: {
    prevalence: Prevalence;
    indicators: string[];
    notes?: string;
  };

  toxicity: {
    prevalence: Prevalence;
    indicators: string[];
    warning?: string;
  };

  interactions: {
    antagonists: Antagonist[];
    complementaryContext?: string;
  };

  speciesNotes?: string[];
  managementBoundary: string;

  // Cross-links (NEW)
  relatedConditions?: number[];
  breedSensitivity?: {
    warning: string;
    breeds?: string[];
  };
}

// ============ MINERALS DATA ============

export const minerals: MineralEntry[] = [
  {
    id: 1,
    name: 'Copper (Cu)',
    category: 'Trace Mineral',
    importance: 'Critical',
    species: 'Goats (with sheep context)',
    primaryFunctions: [
      'Immune system function',
      'Red blood cell formation',
      'Coat color and hair quality',
      'Reproductive performance',
      'Nervous system function',
      'Connective tissue development',
    ],
    deficiency: {
      prevalence: 'Common',
      indicators: [
        'Faded or discolored coat',
        'Poor thrift or growth',
        'Reduced fertility',
        'Increased stress sensitivity',
      ],
      notes: 'Deficiency is often functional and driven by antagonists rather than low copper intake.',
    },
    toxicity: {
      prevalence: 'Uncommon',
      indicators: ['Weakness or depression', 'Jaundice', 'Dark red/brown urine', 'Sudden death'],
      warning: 'Toxicity can be sudden after long-term accumulation.',
    },
    interactions: {
      antagonists: [
        { mineral: 'Iron (Fe)', commonSource: 'Water', note: 'Common in well water' },
        { mineral: 'Sulfur (S)', commonSource: 'Water' },
        { mineral: 'Molybdenum (Mo)', commonSource: 'Soil' },
        { mineral: 'Zinc (Zn)', commonSource: 'Feed', note: 'High levels can compete with copper' },
      ],
      complementaryContext: 'Copper status reflects the overall mineral environment, not copper intake alone.',
    },
    speciesNotes: [
      'Goats generally require more copper than many sheep breeds.',
      'Copper tolerance varies widely by sheep breed and management system.',
    ],
    managementBoundary: MANAGEMENT_BOUNDARY,
    breedSensitivity: {
      warning: 'Sheep breeds vary dramatically in copper tolerance. Some sheep breeds are extremely sensitive to copper toxicity.',
      breeds: ['Texel', 'Suffolk', 'North Ronaldsay'],
    },
    relatedConditions: [1], // Barber Pole (copper bolus use)
  },

  {
    id: 2,
    name: 'Selenium (Se)',
    category: 'Trace Mineral',
    importance: 'Critical',
    species: 'Goats',
    primaryFunctions: [
      'Antioxidant protection (with Vitamin E)',
      'Muscle function and integrity',
      'Immune support',
      'Reproductive performance',
      'Thyroid hormone metabolism',
    ],
    deficiency: {
      prevalence: 'Common',
      indicators: [
        'Weak kids / poor vigor',
        'Poor growth',
        'Reproductive problems (e.g., retained placenta)',
        'Increased stress sensitivity',
      ],
      notes: 'Regional deficiency is common; forage/soil status drives risk.',
    },
    toxicity: {
      prevalence: 'Uncommon',
      indicators: ['Hair loss (mane/tail)', 'Hoof problems / lameness', 'Weight loss', 'Severe weakness'],
      warning: 'Narrow margin between deficiency and toxicity.',
    },
    interactions: {
      antagonists: [{ mineral: 'Sulfur (S)', commonSource: 'Water', note: 'Can reduce selenium availability' }],
      complementaryContext: 'Vitamin E status strongly influences how selenium-related issues present.',
    },
    managementBoundary: MANAGEMENT_BOUNDARY,
    relatedConditions: [10], // White Muscle Disease
  },

  {
    id: 3,
    name: 'Zinc (Zn)',
    category: 'Trace Mineral',
    importance: 'High',
    species: 'Goats',
    primaryFunctions: [
      'Skin and hoof integrity',
      'Wound healing',
      'Immune function',
      'Protein synthesis and growth',
      'Male fertility',
    ],
    deficiency: {
      prevalence: 'Occasional',
      indicators: ['Poor hoof quality', 'Skin lesions / hair loss', 'Poor wound healing', 'Reduced appetite'],
      notes: 'Deficiency risk increases when calcium is high or diet is imbalanced.',
    },
    toxicity: {
      prevalence: 'Rare',
      indicators: ['Secondary copper deficiency signs', 'Reduced appetite'],
      warning: 'Very high zinc can drive functional copper deficiency.',
    },
    interactions: {
      antagonists: [
        { mineral: 'Calcium (Ca)', commonSource: 'Forage', note: 'High calcium can reduce zinc availability' },
        { mineral: 'Copper (Cu)', commonSource: 'Feed', note: 'Competes for absorption at high levels' },
      ],
      complementaryContext: 'Balanced trace minerals matter more than single-mineral focus.',
    },
    managementBoundary: MANAGEMENT_BOUNDARY,
  },

  {
    id: 4,
    name: 'Calcium (Ca)',
    category: 'Macro Mineral',
    importance: 'Critical',
    species: 'Goats',
    primaryFunctions: [
      'Bone and teeth structure',
      'Muscle contraction',
      'Nerve signaling',
      'Milk production',
      'Blood clotting',
    ],
    deficiency: {
      prevalence: 'Occasional',
      indicators: ['Weakness in heavy milkers', 'Poor growth / bone strength issues', 'Low milk production'],
      notes: 'Risk rises with high demand (late pregnancy/lactation) and dietary imbalance.',
    },
    toxicity: {
      prevalence: 'Uncommon',
      indicators: ['Urinary calculi risk in males (when Ca:P is imbalanced)', 'Reduced absorption of other minerals'],
      warning: 'Imbalance (not just amount) is the common problem.',
    },
    interactions: {
      antagonists: [
        { mineral: 'Phosphorus (P)', commonSource: 'Feed', note: 'Balance matters (Ca:P ratio)' },
        { mineral: 'Magnesium (Mg)', commonSource: 'Feed' },
        { mineral: 'Zinc (Zn)', commonSource: 'Feed' },
      ],
      complementaryContext: 'Calcium should be interpreted alongside phosphorus balance, especially for males.',
    },
    managementBoundary: MANAGEMENT_BOUNDARY,
    relatedConditions: [8, 9], // Milk Fever, Urinary Calculi
  },

  {
    id: 5,
    name: 'Phosphorus (P)',
    category: 'Macro Mineral',
    importance: 'Critical',
    species: 'Goats',
    primaryFunctions: [
      'Energy metabolism (ATP)',
      'Bone and teeth (with calcium)',
      'Cell membranes',
      'Genetic material (DNA/RNA)',
    ],
    deficiency: {
      prevalence: 'Occasional',
      indicators: ['Poor growth', 'Poor appetite', 'Pica (chewing wood/bones)', 'Lower milk production'],
      notes: 'More likely when forage is poor and diets lack balanced mineral support.',
    },
    toxicity: {
      prevalence: 'Occasional',
      indicators: ['Urinary calculi risk in males (especially grain-heavy diets)', 'Secondary calcium imbalance'],
      warning: 'Excess phosphorus is a common driver of urinary stone risk in males.',
    },
    interactions: {
      antagonists: [{ mineral: 'Calcium (Ca)', commonSource: 'Forage', note: 'Balance matters (Ca:P ratio)' }],
      complementaryContext: 'Evaluate in the context of calcium balance and feeding pattern.',
    },
    managementBoundary: MANAGEMENT_BOUNDARY,
    relatedConditions: [9], // Urinary Calculi
  },

  {
    id: 6,
    name: 'Magnesium (Mg)',
    category: 'Macro Mineral',
    importance: 'High',
    species: 'Goats',
    primaryFunctions: ['Nerve function', 'Muscle function', 'Energy metabolism', 'Enzyme activation'],
    deficiency: {
      prevalence: 'Occasional',
      indicators: ['Muscle tremors', 'Staggering / excitability', 'Poor appetite', 'Sudden collapse in severe cases'],
      notes: 'Seasonal risk increases on lush pasture due to antagonists.',
    },
    toxicity: {
      prevalence: 'Rare',
      indicators: ['Diarrhea', 'Lethargy'],
      warning: 'Most issues are deficiency or antagonism-driven.',
    },
    interactions: {
      antagonists: [
        { mineral: 'Potassium (K)', commonSource: 'Forage', note: 'High spring pasture potassium reduces Mg availability' },
      ],
      complementaryContext: 'Pasture mineral profile can matter more than supplementation amount in high-risk seasons.',
    },
    managementBoundary: MANAGEMENT_BOUNDARY,
    relatedConditions: [11], // Grass Tetany
  },

  {
    id: 7,
    name: 'Iron (Fe)',
    category: 'Trace Mineral',
    importance: 'Moderate',
    species: 'Goats',
    primaryFunctions: ['Oxygen transport (hemoglobin)', 'Energy metabolism', 'Immune function'],
    deficiency: {
      prevalence: 'Rare',
      indicators: ['Pale membranes (anemia)', 'Weakness', 'Poor growth'],
      notes: 'Many anemia cases relate to parasite burden rather than dietary iron deficiency.',
    },
    toxicity: {
      prevalence: 'Common',
      indicators: ['Functional copper deficiency signs', 'Poor thrift despite adequate copper intake'],
      warning: 'Excess iron commonly appears via water and can block copper availability.',
    },
    interactions: {
      antagonists: [{ mineral: 'Copper (Cu)', commonSource: 'Water', note: 'High-iron water is a common copper antagonist' }],
      complementaryContext: 'Iron is often an environmental driver (water/soil), not a supplementation target.',
    },
    managementBoundary: MANAGEMENT_BOUNDARY,
  },

  {
    id: 8,
    name: 'Iodine (I)',
    category: 'Trace Mineral',
    importance: 'High',
    species: 'Goats',
    primaryFunctions: [
      'Thyroid hormone production',
      'Metabolic regulation',
      'Growth and development',
      'Reproductive performance',
    ],
    deficiency: {
      prevalence: 'Occasional',
      indicators: ['Poor growth', 'Reproductive problems', 'Weak kids', 'Goiter risk in newborns'],
      notes: 'Dietary goitrogens can worsen functional deficiency.',
    },
    toxicity: {
      prevalence: 'Rare',
      indicators: ['Reduced appetite', 'Thyroid imbalance signs'],
      warning: 'Both deficiency and toxicity can disrupt thyroid function.',
    },
    interactions: {
      antagonists: [{ mineral: 'Goitrogens (plants)', commonSource: 'Forage', note: 'Brassicas can impair iodine utilization' }],
      complementaryContext: 'Iodine and selenium both influence thyroid function through different pathways.',
    },
    managementBoundary: MANAGEMENT_BOUNDARY,
  },

  {
    id: 9,
    name: 'Cobalt (Co)',
    category: 'Trace Mineral',
    importance: 'Moderate',
    species: 'Goats',
    primaryFunctions: ['Rumen microbial Vitamin B12 synthesis', 'Energy metabolism', 'Appetite and growth'],
    deficiency: {
      prevalence: 'Occasional',
      indicators: ['Poor appetite', 'Wasting / poor thrift', 'Anemia-like signs', 'Rough coat'],
      notes: 'Cobalt supports rumen microbes; issues often present as low energy and poor growth.',
    },
    toxicity: {
      prevalence: 'Rare',
      indicators: ['Reduced feed intake', 'Weight loss'],
    },
    interactions: {
      antagonists: [],
      complementaryContext: 'Rumen health strongly influences how cobalt-related issues present.',
    },
    managementBoundary: MANAGEMENT_BOUNDARY,
  },

  {
    id: 10,
    name: 'Manganese (Mn)',
    category: 'Trace Mineral',
    importance: 'Moderate',
    species: 'Goats',
    primaryFunctions: ['Bone/cartilage formation', 'Reproductive performance', 'Carbohydrate and fat metabolism'],
    deficiency: {
      prevalence: 'Rare',
      indicators: ['Poor conception', 'Weak or abnormal kids', 'Poor growth'],
      notes: 'More likely in imbalanced diets with inadequate mineral support.',
    },
    toxicity: {
      prevalence: 'Rare',
      indicators: ['Reduced growth', 'Anemia-like signs'],
    },
    interactions: {
      antagonists: [
        { mineral: 'Calcium (Ca)', commonSource: 'Forage' },
        { mineral: 'Iron (Fe)', commonSource: 'Water' },
        { mineral: 'Phosphorus (P)', commonSource: 'Feed' },
      ],
      complementaryContext: 'Absorption is influenced by overall mineral load—balance matters.',
    },
    managementBoundary: MANAGEMENT_BOUNDARY,
  },

  {
    id: 11,
    name: 'Sulfur (S)',
    category: 'Macro Mineral',
    importance: 'Moderate',
    species: 'Goats',
    primaryFunctions: ['Amino acids (methionine/cysteine)', 'Rumen microbial function', 'Hair/hoof/horn structure'],
    deficiency: {
      prevalence: 'Rare',
      indicators: ['Poor growth', 'Rough coat', 'Reduced appetite'],
      notes: 'Most diets supply adequate sulfur via protein.',
    },
    toxicity: {
      prevalence: 'Occasional',
      indicators: ['Functional copper deficiency signs', 'Reduced feed intake', 'Neurologic risk (PEM context)'],
      warning: 'High sulfur is commonly environmental (water) and can create functional copper deficiency.',
    },
    interactions: {
      antagonists: [
        { mineral: 'Copper (Cu)', commonSource: 'Water', note: 'High sulfur reduces copper availability' },
        { mineral: 'Thiamine (B1)', commonSource: 'Feed', note: 'High-sulfur context is associated with thiamine-related neurologic risk' },
      ],
      complementaryContext: 'Sulfur level is often driven by water; interpret copper status accordingly.',
    },
    managementBoundary: MANAGEMENT_BOUNDARY,
    relatedConditions: [12], // Polioencephalomalacia
  },

  {
    id: 12,
    name: 'Potassium (K)',
    category: 'Macro Mineral',
    importance: 'High',
    species: 'Goats',
    primaryFunctions: ['Fluid balance', 'Nerve function', 'Muscle contraction', 'Acid-base balance'],
    deficiency: {
      prevalence: 'Rare',
      indicators: ['Muscle weakness', 'Poor appetite', 'Reduced milk production'],
      notes: 'Most forage supplies adequate potassium.',
    },
    toxicity: {
      prevalence: 'Occasional',
      indicators: ['Functional magnesium deficiency risk', 'Muscle tremors in susceptible animals'],
      warning: 'High potassium forage can precipitate magnesium-related issues.',
    },
    interactions: {
      antagonists: [{ mineral: 'Magnesium (Mg)', commonSource: 'Forage', note: 'High potassium reduces Mg availability' }],
      complementaryContext: 'Pasture mineral surges can create functional deficiencies in other minerals.',
    },
    managementBoundary: MANAGEMENT_BOUNDARY,
  },

  {
    id: 13,
    name: 'Sodium (Na) / Salt',
    category: 'Macro Mineral',
    importance: 'High',
    species: 'Goats',
    primaryFunctions: ['Fluid balance', 'Nerve signaling', 'Appetite regulation', 'Nutrient absorption'],
    deficiency: {
      prevalence: 'Occasional',
      indicators: ['Reduced appetite', 'Poor thrift', 'Licking soil/wood', 'Reduced milk production'],
      notes: 'Deficiency is usually management-related (inadequate access).',
    },
    toxicity: {
      prevalence: 'Rare',
      indicators: ['Excessive thirst', 'Weakness / staggering'],
      warning: 'Toxicity risk rises if water access is restricted.',
    },
    interactions: {
      antagonists: [],
      complementaryContext: 'Sodium balance depends on water availability and overall electrolyte balance.',
    },
    managementBoundary: MANAGEMENT_BOUNDARY,
  },

  {
    id: 14,
    name: 'Molybdenum (Mo)',
    category: 'Trace Mineral',
    importance: 'Low',
    species: 'Goats (with sheep context)',
    primaryFunctions: ['Enzyme systems (trace)', 'Nitrogen metabolism (trace)'],
    deficiency: {
      prevalence: 'Rare',
      indicators: ['Not well characterized'],
    },
    toxicity: {
      prevalence: 'Occasional',
      indicators: ['Functional copper deficiency signs', 'Poor thrift', 'Diarrhea'],
      warning: 'Primary risk is copper antagonism.',
    },
    interactions: {
      antagonists: [{ mineral: 'Copper (Cu)', commonSource: 'Soil', note: 'Higher Mo soils/forage reduce copper availability' }],
      complementaryContext: 'Mo effects are usually indirect via copper interactions.',
    },
    managementBoundary: MANAGEMENT_BOUNDARY,
  },

  {
    id: 15,
    name: 'Chlorine (Cl)',
    category: 'Macro Mineral',
    importance: 'Moderate',
    species: 'Goats',
    primaryFunctions: ['Fluid balance (with sodium)', 'Stomach acid production', 'Digestion'],
    deficiency: {
      prevalence: 'Rare',
      indicators: ['Poor digestion', 'Reduced growth'],
      notes: 'Usually occurs alongside sodium deficiency.',
    },
    toxicity: {
      prevalence: 'Rare',
      indicators: ['Salt toxicity signs (if severe)'],
    },
    interactions: {
      antagonists: [],
      complementaryContext: 'Chlorine status is usually addressed when salt access is adequate.',
    },
    managementBoundary: MANAGEMENT_BOUNDARY,
  },

  {
    id: 16,
    name: 'Chromium (Cr)',
    category: 'Trace Mineral',
    importance: 'Low-Moderate',
    species: 'Goats',
    primaryFunctions: ['Glucose metabolism (insulin function)', 'Stress response support (context-dependent)'],
    deficiency: {
      prevalence: 'Rare',
      indicators: ['Not well characterized in goats'],
    },
    toxicity: {
      prevalence: 'Rare',
      indicators: ['Not well characterized at typical supplementation levels'],
    },
    interactions: {
      antagonists: [],
      complementaryContext: 'Evidence in goats is limited; interpret as supportive context rather than a primary driver.',
    },
    managementBoundary: MANAGEMENT_BOUNDARY,
  },

  // ============ VITAMINS ============

  {
    id: 17,
    name: 'Vitamin A',
    category: 'Vitamin',
    importance: 'High',
    species: 'Goats',
    primaryFunctions: ['Vision', 'Immune function', 'Reproduction', 'Epithelial tissue integrity', 'Growth'],
    deficiency: {
      prevalence: 'Occasional',
      indicators: ['Night vision issues', 'Poor growth', 'Rough coat', 'Reproductive problems'],
      notes: 'Risk increases when diets rely heavily on dry hay with limited green forage.',
    },
    toxicity: {
      prevalence: 'Rare',
      indicators: ['Bone abnormalities', 'Birth defect risk (context)'],
      warning: 'Usually associated with extreme over-supplementation.',
    },
    interactions: {
      antagonists: [],
      complementaryContext: 'Fat is required for absorption; overall diet quality influences status.',
    },
    managementBoundary: MANAGEMENT_BOUNDARY,
  },

  {
    id: 18,
    name: 'Vitamin D',
    category: 'Vitamin',
    importance: 'High',
    species: 'Goats',
    primaryFunctions: ['Calcium absorption', 'Phosphorus metabolism', 'Bone health', 'Immune support (context)'],
    deficiency: {
      prevalence: 'Occasional',
      indicators: ['Poor bone development (kids)', 'Stiff gait', 'Weakness', 'Poor growth'],
      notes: 'Risk increases with limited direct sunlight exposure and low-quality stored forage.',
    },
    toxicity: {
      prevalence: 'Rare',
      indicators: ['Soft tissue calcification context', 'Poor appetite / weakness (context)'],
      warning: 'Usually associated with extreme over-supplementation.',
    },
    interactions: {
      antagonists: [{ mineral: 'Calcium/Phosphorus imbalance', commonSource: 'Feed', note: 'D status affects Ca/P utilization' }],
      complementaryContext: 'Vitamin D status and Ca/P balance should be interpreted together.',
    },
    managementBoundary: MANAGEMENT_BOUNDARY,
  },

  {
    id: 19,
    name: 'Vitamin E',
    category: 'Vitamin',
    importance: 'High',
    species: 'Goats',
    primaryFunctions: [
      'Antioxidant protection',
      'Muscle integrity (with selenium)',
      'Immune support',
      'Reproductive performance',
    ],
    deficiency: {
      prevalence: 'Occasional',
      indicators: ['Weak kids', 'Poor thrift on stored feed', 'Muscle weakness context'],
      notes: 'Risk increases when fresh green forage is limited.',
    },
    toxicity: {
      prevalence: 'Rare',
      indicators: ['Generally well tolerated'],
    },
    interactions: {
      antagonists: [],
      complementaryContext: 'Vitamin E and selenium are commonly interpreted together in muscle/weakness contexts.',
    },
    managementBoundary: MANAGEMENT_BOUNDARY,
    relatedConditions: [10], // White Muscle Disease
  },

  {
    id: 20,
    name: 'B Vitamins (Thiamine/B1)',
    category: 'Vitamin',
    importance: 'High',
    species: 'Goats',
    primaryFunctions: ['Nervous system function', 'Energy metabolism', 'Appetite and rumen stability (context)'],
    deficiency: {
      prevalence: 'Occasional',
      indicators: ['Neurologic signs (stargazing/circling)', 'Blindness context', 'Sudden appetite loss'],
      notes: 'Risk increases with rumen disruption, sudden diet changes, or high-sulfur contexts.',
    },
    toxicity: {
      prevalence: 'Rare',
      indicators: ['Generally well tolerated'],
    },
    interactions: {
      antagonists: [
        { mineral: 'Sulfur (S)', commonSource: 'Water', note: 'High sulfur context increases thiamine-related neurologic risk' },
        { mineral: 'Thiamine antagonists (e.g., amprolium)', commonSource: 'Feed', note: 'Some products can antagonize thiamine' },
      ],
      complementaryContext: 'Rumen stability strongly influences B vitamin status.',
    },
    managementBoundary: MANAGEMENT_BOUNDARY,
    relatedConditions: [12], // Polioencephalomalacia
  },
];

// ============ HELPER FUNCTIONS ============

export function getMineralById(id: number): MineralEntry | undefined {
  return minerals.find((m) => m.id === id);
}

export function getMineralsByCategory(category: MineralCategory): MineralEntry[] {
  return minerals.filter((m) => m.category === category);
}

export function getMineralsByImportance(importance: Importance): MineralEntry[] {
  return minerals.filter((m) => m.importance === importance);
}

export function searchMinerals(query: string): MineralEntry[] {
  const lowerQuery = query.toLowerCase();
  return minerals.filter(
    (m) =>
      m.name.toLowerCase().includes(lowerQuery) ||
      m.primaryFunctions.some((f) => f.toLowerCase().includes(lowerQuery)) ||
      m.deficiency.indicators.some((i) => i.toLowerCase().includes(lowerQuery)) ||
      m.toxicity.indicators.some((i) => i.toLowerCase().includes(lowerQuery))
  );
}

export function buildMineralPreview(mineral: MineralEntry): string {
  return mineral.primaryFunctions.slice(0, 3).join(' • ');
}

export function buildMineralDescription(mineral: MineralEntry): string {
  return `Supports: ${mineral.primaryFunctions.slice(0, 4).join(', ')}.`;
}
