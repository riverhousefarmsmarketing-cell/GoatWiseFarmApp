/**
 * GoatWise Resources - Essential Oils Data
 * /src/data/resources/essential-oils.ts
 *
 * NEW resource type per Field Manual requirements
 * With safety badges and strong guardrails
 */

import { EOUseBadge, EO_BADGE_LABELS, EO_BADGE_COLORS, ESSENTIAL_OIL_DISCLAIMER } from './types';

// Re-export for convenience

// ============ ESSENTIAL OIL TYPES ============

export interface EssentialOilEntry {
  id: number;
  name: string;
  scientificName?: string;
  useBadge: EOUseBadge;

  // Commonly associated with (no benefit claims)
  commonAssociations: string[];

  // Field context only (no recipes, no dosing)
  context: string;

  // Safety notes (always present)
  cautions: string[];

  // Additional safety info
  dilutionRequired: boolean;
  heatSensitive?: boolean; // "hot" oils that can irritate

  // Excluded oils (Wintergreen, Birch) - marked but not displayed
  excluded?: boolean;
}

// ============ PRINCIPLES CONTENT ============

export const EO_PRINCIPLES = {
  title: 'Principles Before Use',
  intro:
    'Essential oils are concentrated plant compounds that require informed, cautious use. Many experienced goat owners incorporate them as part of their management approach.',
  principles: [
    {
      title: 'More is not better',
      description: 'Essential oils are highly concentrated. Using more does not improve results and can cause harm.',
    },
    {
      title: 'Dilution matters',
      description:
        'Most essential oils must be diluted in a carrier oil before any application. Neat (undiluted) application is rarely appropriate.',
    },
    {
      title: 'Individual tolerance varies',
      description:
        'Animals respond differently. What works for one may cause a reaction in another. Always start with minimal exposure.',
    },
    {
      title: 'Kids, pregnant, and compromised animals require extra caution',
      description:
        'Young animals, pregnant does, and those who are already ill are more sensitive. Use extra caution or avoid entirely.',
    },
    {
      title: 'Stop if adverse response',
      description:
        'If you observe any negative reaction (irritation, behavioral changes, respiratory distress), discontinue immediately.',
    },
  ],
};

// ============ ESSENTIAL OILS DATA ============

export const essentialOils: EssentialOilEntry[] = [
  // ============ INTERNAL - EXPERIENCED HANDLERS ONLY (🔴) ============
  {
    id: 1,
    name: 'Oregano',
    scientificName: 'Origanum vulgare',
    useBadge: 'internal-experienced',
    commonAssociations: ['Digestive support', 'Respiratory support', 'General wellness'],
    context:
      'Oregano oil is commonly used by experienced handlers for immune and digestive support. It is a "hot" oil that requires careful handling and proper dilution.',
    cautions: [
      'Hot oil — can cause significant irritation',
      'Dilution is critical for any application',
      'Not for routine use without experience',
      'Can irritate mucous membranes',
      'Internal use requires experienced handling',
    ],
    dilutionRequired: true,
    heatSensitive: true,
  },

  {
    id: 2,
    name: 'Clove',
    scientificName: 'Syzygium aromaticum',
    useBadge: 'internal-experienced',
    commonAssociations: ['Pain support (topical)', 'Digestive support', 'Antimicrobial support'],
    context:
      'Clove oil contains eugenol and is commonly used topically for its numbing properties. Internal use requires experienced handling due to potency.',
    cautions: [
      'Very potent — always dilute heavily',
      'Can irritate mucous membranes',
      'Internal use only by experienced handlers',
      'Test small area for sensitivity',
    ],
    dilutionRequired: true,
    heatSensitive: true,
  },

  {
    id: 3,
    name: 'Cinnamon Bark',
    scientificName: 'Cinnamomum verum',
    useBadge: 'internal-experienced',
    commonAssociations: ['Warming support', 'Digestive support', 'Antimicrobial support'],
    context:
      'Cinnamon bark oil is very potent and warming. Considered a "hot" oil that requires significant dilution and experienced handling.',
    cautions: [
      'Very hot oil — significant irritation risk',
      'Heavy dilution required',
      'Not for inexperienced handlers',
      'Use Ceylon cinnamon when possible',
      'Can sensitize skin with repeated use',
    ],
    dilutionRequired: true,
    heatSensitive: true,
  },

  {
    id: 4,
    name: 'Thyme',
    scientificName: 'Thymus vulgaris',
    useBadge: 'internal-experienced',
    commonAssociations: ['Respiratory support', 'Immune support', 'Antimicrobial support'],
    context:
      'Thyme oil contains thymol and is commonly used for respiratory support. It is a strong oil that requires careful handling.',
    cautions: [
      'Strong oil — requires proper dilution',
      'Internal use requires experience',
      'Can irritate skin and mucous membranes',
      'Not for continuous use',
    ],
    dilutionRequired: true,
    heatSensitive: true,
  },

  {
    id: 5,
    name: 'Lemongrass',
    scientificName: 'Cymbopogon citratus',
    useBadge: 'internal-experienced',
    commonAssociations: ['Insect deterrent', 'Digestive support', 'Calming support'],
    context:
      'Lemongrass oil is commonly used as an insect deterrent. Internal use requires caution due to potential for irritation.',
    cautions: [
      'Can cause skin irritation — always dilute',
      'Internal use requires experienced handling',
      'Test small area first',
      'Avoid in early pregnancy',
    ],
    dilutionRequired: true,
  },

  // ============ EXTERNAL + AROMATIC (🟡) ============
  {
    id: 6,
    name: 'Lavender',
    scientificName: 'Lavandula angustifolia',
    useBadge: 'external-aromatic',
    commonAssociations: ['Calming support', 'Skin support', 'Minor wound care', 'Stress support'],
    context:
      'Lavender is one of the gentler essential oils. Commonly used aromatically for calming and topically for skin support.',
    cautions: [
      'Still requires dilution for topical use',
      'Not for ingestion',
      'Some animals may be sensitive',
    ],
    dilutionRequired: true,
  },

  {
    id: 7,
    name: 'Sweet Orange',
    scientificName: 'Citrus sinensis',
    useBadge: 'external-aromatic',
    commonAssociations: ['Uplifting aromatic', 'Calming support', 'Cleaning applications'],
    context:
      'Sweet orange oil is commonly used aromatically and in cleaning applications. Generally considered one of the gentler citrus oils.',
    cautions: [
      'Phototoxic — avoid sun exposure after topical application',
      'Dilute for any topical use',
      'Not for ingestion',
    ],
    dilutionRequired: true,
  },

  {
    id: 8,
    name: 'Lemon',
    scientificName: 'Citrus limon',
    useBadge: 'external-aromatic',
    commonAssociations: ['Uplifting aromatic', 'Cleaning applications', 'Freshening'],
    context:
      'Lemon oil is commonly used aromatically and in cleaning. All citrus oils have phototoxicity concerns.',
    cautions: [
      'Phototoxic — avoid sun exposure after topical application',
      'Dilute for any topical use',
      'Not for ingestion',
      'Can degrade plastic containers',
    ],
    dilutionRequired: true,
  },

  {
    id: 9,
    name: 'Frankincense',
    scientificName: 'Boswellia carterii',
    useBadge: 'external-aromatic',
    commonAssociations: ['Skin support', 'Calming aromatic', 'General wellness support'],
    context:
      'Frankincense is commonly used aromatically and topically. Generally considered one of the gentler oils but still requires dilution.',
    cautions: [
      'Dilute for topical use',
      'Not for ingestion',
      'Quality varies significantly by source',
    ],
    dilutionRequired: true,
  },

  {
    id: 10,
    name: 'Geranium',
    scientificName: 'Pelargonium graveolens',
    useBadge: 'external-aromatic',
    commonAssociations: ['Skin support', 'Insect deterrent', 'Calming support'],
    context:
      'Geranium oil is commonly used topically for skin support and as an insect deterrent. Considered relatively gentle.',
    cautions: [
      'Dilute for topical use',
      'Not for ingestion',
      'Some animals may be sensitive',
    ],
    dilutionRequired: true,
  },

  {
    id: 11,
    name: 'Cedarwood',
    scientificName: 'Cedrus atlantica',
    useBadge: 'external-aromatic',
    commonAssociations: ['Insect deterrent', 'Calming aromatic', 'Skin support'],
    context:
      'Cedarwood oil is commonly used as an insect deterrent and calming aromatic. Generally considered gentle.',
    cautions: [
      'Dilute for topical use',
      'Not for ingestion',
      'Avoid in pregnancy',
    ],
    dilutionRequired: true,
  },

  {
    id: 12,
    name: 'Rosemary',
    scientificName: 'Rosmarinus officinalis',
    useBadge: 'external-aromatic',
    commonAssociations: ['Circulation support (topical)', 'Mental alertness (aromatic)', 'Insect deterrent'],
    context:
      'Rosemary oil is stimulating and commonly used aromatically or topically (diluted). Has circulation-supporting properties.',
    cautions: [
      'Avoid in pregnancy',
      'Dilute for topical use',
      'Not for ingestion',
      'Can be stimulating — avoid in seizure-prone animals',
    ],
    dilutionRequired: true,
  },

  // ============ EXTERNAL ONLY (🟢) ============
  {
    id: 13,
    name: 'Peppermint',
    scientificName: 'Mentha piperita',
    useBadge: 'external-only',
    commonAssociations: ['Cooling (topical)', 'Respiratory support (aromatic)', 'Insect deterrent'],
    context:
      'Peppermint oil is cooling and commonly used topically (diluted) or aromatically. External use only due to potency.',
    cautions: [
      'Can cause cooling/tingling sensation',
      'Keep away from eyes and sensitive areas',
      'External use only',
      'Always dilute',
      'May affect milk supply',
    ],
    dilutionRequired: true,
  },

  {
    id: 14,
    name: 'Eucalyptus',
    scientificName: 'Eucalyptus globulus',
    useBadge: 'external-only',
    commonAssociations: ['Respiratory support (aromatic)', 'Cooling (topical)', 'Insect deterrent'],
    context:
      'Eucalyptus oil is commonly used aromatically for respiratory support. External use only — toxic if ingested.',
    cautions: [
      'Toxic if ingested — external use only',
      'Keep away from face of young animals',
      'Always dilute for topical use',
      'Can be overwhelming — use sparingly',
    ],
    dilutionRequired: true,
  },

  {
    id: 15,
    name: 'Tea Tree',
    scientificName: 'Melaleuca alternifolia',
    useBadge: 'external-only',
    commonAssociations: ['Skin support (topical)', 'Antifungal support (topical)', 'Wound care (diluted)'],
    context:
      'Tea tree oil is commonly used topically for skin and wound support. Strong antifungal properties. External use only.',
    cautions: [
      'Toxic if ingested — external use only',
      'Always dilute for topical use',
      'Can cause skin irritation if used undiluted',
      'Keep away from eyes',
    ],
    dilutionRequired: true,
  },

  {
    id: 16,
    name: 'Citronella',
    scientificName: 'Cymbopogon nardus',
    useBadge: 'external-only',
    commonAssociations: ['Insect deterrent', 'Outdoor applications'],
    context:
      'Citronella oil is primarily used as an insect deterrent. Common in outdoor and environmental applications.',
    cautions: [
      'External use only',
      'Dilute for any topical application',
      'Can cause skin irritation in some animals',
      'Primarily for environmental use',
    ],
    dilutionRequired: true,
  },

  {
    id: 17,
    name: 'Camphor',
    scientificName: 'Cinnamomum camphora',
    useBadge: 'external-only',
    commonAssociations: ['Respiratory support (aromatic)', 'Cooling (topical)', 'Insect deterrent'],
    context:
      'Camphor oil is commonly used aromatically or in very diluted topical applications. External use only — toxic if ingested.',
    cautions: [
      'Toxic if ingested — external use only',
      'Use only in very diluted amounts',
      'Can cause seizures if misused',
      'Keep away from young animals',
    ],
    dilutionRequired: true,
  },

  // ============ EXCLUDED OILS (DO NOT DISPLAY) ============
  {
    id: 98,
    name: 'Wintergreen',
    scientificName: 'Gaultheria procumbens',
    useBadge: 'external-only',
    excluded: true,
    commonAssociations: [],
    context: 'EXCLUDED — Contains methyl salicylate which poses significant toxicity risk.',
    cautions: [
      'EXCLUDED from GoatWise — methyl salicylate toxicity risk',
      'Do not use on goats',
      'Toxic if ingested',
      'Can be absorbed through skin',
    ],
    dilutionRequired: true,
  },

  {
    id: 99,
    name: 'Birch',
    scientificName: 'Betula lenta',
    useBadge: 'external-only',
    excluded: true,
    commonAssociations: [],
    context: 'EXCLUDED — Contains methyl salicylate which poses significant toxicity risk.',
    cautions: [
      'EXCLUDED from GoatWise — methyl salicylate toxicity risk',
      'Do not use on goats',
      'Toxic if ingested',
      'Can be absorbed through skin',
    ],
    dilutionRequired: true,
  },
];

// ============ HELPER FUNCTIONS ============

/**
 * Get all displayable essential oils (excludes Wintergreen, Birch)
 */
export function getDisplayableEssentialOils(): EssentialOilEntry[] {
  return essentialOils.filter((eo) => !eo.excluded);
}

export function getEssentialOilById(id: number): EssentialOilEntry | undefined {
  return essentialOils.find((eo) => eo.id === id);
}

export function getEssentialOilsByBadge(badge: EOUseBadge): EssentialOilEntry[] {
  return essentialOils.filter((eo) => eo.useBadge === badge && !eo.excluded);
}

export function getHotOils(): EssentialOilEntry[] {
  return essentialOils.filter((eo) => eo.heatSensitive && !eo.excluded);
}

export function searchEssentialOils(query: string): EssentialOilEntry[] {
  const lowerQuery = query.toLowerCase();
  return essentialOils.filter(
    (eo) =>
      !eo.excluded &&
      (eo.name.toLowerCase().includes(lowerQuery) ||
        eo.scientificName?.toLowerCase().includes(lowerQuery) ||
        eo.commonAssociations.some((a) => a.toLowerCase().includes(lowerQuery)) ||
        eo.context.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get badge display info
 */
export function getEOBadgeInfo(badge: EOUseBadge): { label: string; color: string; emoji: string } {
  const emojis: Record<EOUseBadge, string> = {
    'external-only': '🟢',
    'external-aromatic': '🟡',
    'internal-experienced': '🔴',
  };

  return {
    label: EO_BADGE_LABELS[badge],
    color: EO_BADGE_COLORS[badge],
    emoji: emojis[badge],
  };
}

/**
 * Standard note for condition pages that reference EOs
 */
export const EO_CONDITION_NOTE =
  'Essential oils are powerful tools and require informed use. Review safety and experience guidance before considering them.';
