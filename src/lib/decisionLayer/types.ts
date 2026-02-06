// Decision Layer Types and Constants
// Location: src/lib/decisionLayer/types.ts

export type DecisionSeverity = 'normal' | 'watching' | 'attention' | 'action';

export type DecisionScope = 'farm' | 'animal' | 'system';

export interface DecisionSignal {
  id: string;
  scope: DecisionScope;
  severity: DecisionSeverity;
  title: string;
  primaryText: string;
  secondaryText?: string;
  cta?: string;
  ctaHref?: string;
  evidence?: string; // e.g., "milk total 12.3 lbs vs 7-day avg 15.0 lbs"
  animalId?: string;
  animalName?: string;
  system: 'health' | 'milk' | 'weight' | 'breeding' | 'financial' | 'guardian';
  ruleId: string;
  timestamp: Date;
}

// EXACT COPY from handoff spec - DO NOT MODIFY
export const SEVERITY_CONFIG = {
  normal: {
    emoji: '🟢',
    label: 'Normal',
    color: 'bg-green-50 border-green-200',
    textColor: 'text-green-800',
    iconColor: 'text-green-600',
    primaryText: "Everything here looks within a typical range.",
    secondaryText: "No action is usually needed right now.",
  },
  watching: {
    emoji: '🟡',
    label: 'Worth Watching',
    color: 'bg-yellow-50 border-yellow-200',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-600',
    primaryText: "This is still common, but it's something many farms keep an eye on.",
    secondaryText: "A quick recheck later is often enough.",
  },
  attention: {
    emoji: '🟠',
    label: 'Needs Attention',
    color: 'bg-orange-50 border-orange-200',
    textColor: 'text-orange-800',
    iconColor: 'text-orange-600',
    primaryText: "This pattern stands out compared to what's usually seen.",
    secondaryText: "Many farms review related factors at this point.",
    defaultCta: "See what farms often check →",
  },
  action: {
    emoji: '🔴',
    label: 'Action Recommended',
    color: 'bg-red-50 border-red-300',
    textColor: 'text-red-800',
    iconColor: 'text-red-600',
    primaryText: "This falls outside what's typically considered safe or stable.",
    secondaryText: "Farms usually take action when they see this.",
    disclaimer: "This isn't a diagnosis — just a common practice pattern.",
  },
} as const;

// System-specific icons
export const SYSTEM_ICONS = {
  health: '❤️',
  milk: '🥛',
  weight: '⚖️',
  breeding: '🐐',
  financial: '💵',
  guardian: '🛡️',
} as const;

// Rule definitions with specific trigger copy
export const DECISION_RULES = {
  // HEALTH: FAMACHA
  'health-famacha-optimal': {
    system: 'health' as const,
    severity: 'normal' as DecisionSeverity,
    title: 'FAMACHA Score Normal',
    primaryText: "FAMACHA scores in this range usually don't require treatment.",
    condition: 'FAMACHA score 1-2',
  },
  'health-famacha-borderline': {
    system: 'health' as const,
    severity: 'watching' as DecisionSeverity,
    title: 'FAMACHA Score Borderline',
    primaryText: "This score is borderline. Many farms recheck within about a week.",
    condition: 'FAMACHA score 3',
  },
  'health-famacha-critical': {
    system: 'health' as const,
    severity: 'action' as DecisionSeverity,
    title: 'FAMACHA Score Critical',
    primaryText: "Scores at this level are commonly treated to prevent further anemia.",
    condition: 'FAMACHA score 4-5',
    cta: 'View deworming options',
    ctaHref: '/dashboard/resources/medications',
  },
  
  // HEALTH: Recurrence
  'health-recurrence': {
    system: 'health' as const,
    severity: 'attention' as DecisionSeverity,
    title: 'Recurring Condition',
    primaryText: "This condition has appeared several times recently.",
    secondaryText: "Recurring issues may indicate an underlying factor worth investigating.",
    condition: 'Same condition ≥3x in 90 days',
  },
  
  // MILK: Sudden Drop
  'milk-sudden-drop': {
    system: 'milk' as const,
    severity: 'attention' as DecisionSeverity,
    title: 'Milk Production Drop',
    primaryText: "This drop is larger than typical daily variation.",
    secondaryText: "Sudden drops can indicate stress, illness, or feed changes.",
    condition: 'Daily total drops >15% vs 7-day avg',
    cta: 'Check health records',
    ctaHref: '/dashboard/health',
  },
  
  // WEIGHT: Slow Loss
  'weight-slow-loss': {
    system: 'weight' as const,
    severity: 'watching' as DecisionSeverity,
    title: 'Gradual Weight Loss',
    primaryText: "Slow weight loss often appears before visible signs.",
    secondaryText: "Consider monitoring feed intake and checking for parasites.",
    condition: 'Decline across 3 weigh-ins',
  },
  
  // WEIGHT: Rapid Loss
  'weight-rapid-loss': {
    system: 'weight' as const,
    severity: 'attention' as DecisionSeverity,
    title: 'Rapid Weight Loss',
    primaryText: "This amount of weight loss is larger than what's usually expected.",
    secondaryText: "Rapid loss often warrants a health check.",
    condition: '>5% loss in <30 days',
    cta: 'Check FAMACHA',
    ctaHref: '/dashboard/health',
  },
  
  // BREEDING: Repeated Failure
  'breeding-repeated-failure': {
    system: 'breeding' as const,
    severity: 'attention' as DecisionSeverity,
    title: 'Breeding Difficulty',
    primaryText: "Multiple unsuccessful breedings stand out.",
    secondaryText: "This may indicate timing issues, buck fertility, or health factors.",
    condition: '2+ unsuccessful breedings in season',
  },
  
  // FINANCIAL: Sustained Loss
  'financial-sustained-loss': {
    system: 'financial' as const,
    severity: 'attention' as DecisionSeverity,
    title: 'Costs Exceeding Revenue',
    primaryText: "Costs have exceeded income for a while.",
    secondaryText: "Many farms review expenses periodically to identify areas to optimize.",
    condition: 'Per-animal costs > revenue over 6 months',
    cta: 'View expense breakdown',
    ctaHref: '/dashboard/finances',
  },
  
  // GUARDIAN: Repeated Incidents
  'guardian-repeated-incidents': {
    system: 'guardian' as const,
    severity: 'attention' as DecisionSeverity,
    title: 'Repeated Predator Activity',
    primaryText: "Repeated incidents in this area suggest a possible coverage gap.",
    secondaryText: "Consider reviewing guardian placement or adding deterrents.",
    condition: '≥2 incidents same type/location in 60 days',
  },
} as const;

export type RuleId = keyof typeof DECISION_RULES;
