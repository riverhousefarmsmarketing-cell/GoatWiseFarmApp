// Central vocabulary for animal sex & category.
//
// The app was generalized from goat-only terms (doe/buck/doeling/…) to
// species-neutral ones (female/male/young_female/…). The Add Animal form now
// writes the NEUTRAL vocabulary, while older rows and kidding-created kids still
// use the GOAT words — and the database CHECK constraints allow both. So every
// read-side (stats, filters, labels, dropdowns) must accept BOTH vocabularies.
//
// That logic was previously copy-pasted (and half-updated) across a dozen files,
// which is why stat cards read 0, category labels showed raw strings, and
// breeding dropdowns came up empty. Define it ONCE here and import it everywhere.

import { getSpeciesConfig, type Species } from './speciesConfig';

export type Animalish = { sex?: string | null; category?: string | null; species?: string | null };

// ---- sex value groups (goat word + neutral word) ----
export const FEMALE_SEXES = ['doe', 'female'];
export const MALE_SEXES = ['buck', 'male'];
export const CASTRATED_SEXES = ['wether', 'castrated'];

// ---- category groups: canonical (neutral) key -> every DB value that means it ----
export const CATEGORY_ALIASES = {
  milking_female: ['milking_doe', 'milking_female'],
  dry_female: ['dry_doe', 'dry_female'],
  bred_female: ['bred_doe', 'bred_female'],
  young_female: ['doeling', 'young_female'],
  male: ['buck', 'male'],
  young_male: ['buckling', 'young_male'],
  castrated: ['wether', 'castrated'],
  young: ['kid', 'young'],
} as const;

export type CanonicalCategory = keyof typeof CATEGORY_ALIASES;

const FEMALE_CATEGORIES: string[] = [
  ...CATEGORY_ALIASES.milking_female,
  ...CATEGORY_ALIASES.dry_female,
  ...CATEGORY_ALIASES.bred_female,
  ...CATEGORY_ALIASES.young_female,
];
const MALE_CATEGORIES: string[] = [...CATEGORY_ALIASES.male, ...CATEGORY_ALIASES.young_male];

// reverse lookup: any DB category value -> its canonical key
const CATEGORY_TO_CANONICAL: Record<string, CanonicalCategory> = Object.entries(CATEGORY_ALIASES)
  .reduce((acc, [canon, values]) => {
    (values as readonly string[]).forEach((v) => { acc[v] = canon as CanonicalCategory; });
    return acc;
  }, {} as Record<string, CanonicalCategory>);

// ---- predicates (accept either vocabulary) ----
export function isFemale(a: Animalish): boolean {
  return (!!a.sex && FEMALE_SEXES.includes(a.sex)) ||
         (!!a.category && FEMALE_CATEGORIES.includes(a.category));
}

/** Intact male (excludes wether/castrated). Use for sire/buck eligibility. */
export function isIntactMale(a: Animalish): boolean {
  return (!!a.sex && MALE_SEXES.includes(a.sex)) ||
         (!!a.category && MALE_CATEGORIES.includes(a.category));
}

/** True when the animal's category belongs to the given canonical group. */
export function categoryIs(a: Animalish, canonical: CanonicalCategory): boolean {
  return !!a.category && (CATEGORY_ALIASES[canonical] as readonly string[]).includes(a.category);
}

// Breeding eligibility — mirrors the corrected breeding page filters.
export const isBreedableDoe = isFemale;
export const isBreedableBuck = isIntactMale;

/** Normalize any (possibly goat-word) category to its neutral canonical value. */
export function toCanonicalCategory(category?: string | null): string {
  if (!category) return '';
  return CATEGORY_TO_CANONICAL[category] ?? category;
}

// ---- sex <-> category consistency ----
// Which canonical categories are consistent with a given sex value (accepts
// either vocabulary). 'young' (an unsexed kid/lamb) is allowed for any sex.
// Without this coupling a user could save sex='female' with category='male',
// which made the animal count as both a doe and a buck in stats and appear in
// both breeding pickers.
const SEX_TO_CATEGORIES: Record<string, CanonicalCategory[]> = {
  female: ['milking_female', 'dry_female', 'bred_female', 'young_female', 'young'],
  doe: ['milking_female', 'dry_female', 'bred_female', 'young_female', 'young'],
  male: ['male', 'young_male', 'young'],
  buck: ['male', 'young_male', 'young'],
  castrated: ['castrated', 'young'],
  wether: ['castrated', 'young'],
};

/** Canonical categories consistent with a sex, or null if sex is unknown (no constraint). */
export function categoriesForSex(sex?: string | null): CanonicalCategory[] | null {
  if (!sex) return null;
  return SEX_TO_CATEGORIES[sex] ?? null;
}

/** True when a category is compatible with a sex (or when either is unknown). */
export function isCategoryConsistentWithSex(
  sex?: string | null,
  category?: string | null
): boolean {
  const allowed = categoriesForSex(sex);
  if (!allowed || !category) return true;
  return allowed.includes(toCanonicalCategory(category) as CanonicalCategory);
}

// ---- labels (species-aware, accept either vocabulary) ----
export function getCategoryLabel(category?: string | null, species: Species = 'goat'): string {
  if (!category) return '';
  const canon = CATEGORY_TO_CANONICAL[category];
  if (!canon) return category;
  const c = getSpeciesConfig(species).categories;
  const labels: Record<CanonicalCategory, string> = {
    milking_female: c.milkingFemale,
    dry_female: c.dryFemale,
    bred_female: c.bredFemale,
    young_female: c.youngFemale,
    male: c.male,
    young_male: c.youngMale,
    castrated: c.castrated,
    young: c.young,
  };
  return labels[canon];
}

/**
 * Select options for the category field, using canonical (neutral) values.
 * When `sex` is provided, only categories consistent with that sex are offered
 * so the two fields can't be saved contradictorily.
 */
export function getCategoryOptions(species: Species = 'goat', sex?: string | null) {
  const c = getSpeciesConfig(species).categories;
  const all = [
    { value: 'milking_female', label: c.milkingFemale },
    { value: 'dry_female', label: c.dryFemale },
    { value: 'bred_female', label: c.bredFemale },
    { value: 'young_female', label: c.youngFemale },
    { value: 'male', label: c.male },
    { value: 'young_male', label: c.youngMale },
    { value: 'castrated', label: c.castrated },
    { value: 'young', label: c.young },
  ];
  const allowed = categoriesForSex(sex);
  if (!allowed) return all;
  return all.filter((o) => allowed.includes(o.value as CanonicalCategory));
}
