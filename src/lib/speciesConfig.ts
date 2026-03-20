// Species configuration for HerdSteward
// This is the single source of truth for all species-specific terminology,
// categories, and reference data. Add a new species here and it flows
// through the entire UI automatically.
//
// Location: src/lib/speciesConfig.ts

export type Species = 'goat' | 'sheep'

export interface SpeciesConfig {
  label: string
  plural: string

  // Animal terminology
  female: string        // doe / ewe
  male: string          // buck / ram
  youngFemale: string   // doeling / ewe lamb
  youngMale: string     // buckling / ram lamb
  youngNeutral: string  // kid / lamb
  castrated: string     // wether / wether (same)
  birthEvent: string    // kidding / lambing
  offspring: string     // kids / lambs

  // Categories (maps to DB enum values)
  categories: {
    milkingFemale: string
    dryFemale: string
    bredFemale: string
    youngFemale: string
    male: string
    youngMale: string
    castrated: string
    young: string
  }

  // UI labels
  addAnimalLabel: string
  herdLabel: string      // herd / flock
  breedingLabel: string  // breeding / tupping
}

export const SPECIES_CONFIG: Record<Species, SpeciesConfig> = {
  goat: {
    label: 'Goat',
    plural: 'Goats',
    female: 'Doe',
    male: 'Buck',
    youngFemale: 'Doeling',
    youngMale: 'Buckling',
    youngNeutral: 'Kid',
    castrated: 'Wether',
    birthEvent: 'Kidding',
    offspring: 'Kids',
    categories: {
      milkingFemale: 'Milking Doe',
      dryFemale: 'Dry Doe',
      bredFemale: 'Bred Doe',
      youngFemale: 'Doeling',
      male: 'Buck',
      youngMale: 'Buckling',
      castrated: 'Wether',
      young: 'Kid',
    },
    addAnimalLabel: 'Add Goat',
    herdLabel: 'Herd',
    breedingLabel: 'Breeding',
  },
  sheep: {
    label: 'Sheep',
    plural: 'Sheep',
    female: 'Ewe',
    male: 'Ram',
    youngFemale: 'Ewe Lamb',
    youngMale: 'Ram Lamb',
    youngNeutral: 'Lamb',
    castrated: 'Wether',
    birthEvent: 'Lambing',
    offspring: 'Lambs',
    categories: {
      milkingFemale: 'Milking Ewe',
      dryFemale: 'Dry Ewe',
      bredFemale: 'Bred Ewe',
      youngFemale: 'Ewe Lamb',
      male: 'Ram',
      youngMale: 'Ram Lamb',
      castrated: 'Wether',
      young: 'Lamb',
    },
    addAnimalLabel: 'Add Sheep',
    herdLabel: 'Flock',
    breedingLabel: 'Tupping',
  },
}

export function getSpeciesConfig(species: Species): SpeciesConfig {
  return SPECIES_CONFIG[species]
}

// Returns config for an animal's species, defaulting to goat
export function useSpeciesLabel(species: Species | null | undefined): SpeciesConfig {
  return getSpeciesConfig(species ?? 'goat')
}

// Returns all category values for a given species as an array
export function getSpeciesCategories(species: Species): string[] {
  const config = getSpeciesConfig(species)
  return Object.values(config.categories)
}
