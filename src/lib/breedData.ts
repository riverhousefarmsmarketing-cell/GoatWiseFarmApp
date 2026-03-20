// Breed reference data for HerdSteward
// Goat and sheep breed lists with use and size classification.
// Used in Add Animal form breed dropdowns and Knowledge Base breed profiles.
//
// Location: src/lib/breedData.ts

import { Species } from './speciesConfig'

export type BreedUse = 'dairy' | 'meat' | 'fiber' | 'dual' | 'companion'
export type BreedSize = 'miniature' | 'small' | 'medium' | 'large'

export interface Breed {
  name: string
  use: BreedUse
  size: BreedSize
  notes?: string
}

export const BREEDS: Record<Species, Breed[]> = {
  goat: [
    { name: 'Alpine', use: 'dairy', size: 'large' },
    { name: 'Angora', use: 'fiber', size: 'medium' },
    { name: 'Boer', use: 'meat', size: 'large' },
    { name: 'Kiko', use: 'meat', size: 'large' },
    { name: 'LaMancha', use: 'dairy', size: 'large' },
    { name: 'Mini LaMancha', use: 'dairy', size: 'small' },
    { name: 'Mini Nubian', use: 'dairy', size: 'small' },
    { name: 'Nigerian Dwarf', use: 'dairy', size: 'miniature' },
    { name: 'Nubian', use: 'dairy', size: 'large' },
    { name: 'Oberhasli', use: 'dairy', size: 'medium' },
    { name: 'Pygmy', use: 'companion', size: 'miniature' },
    { name: 'Saanen', use: 'dairy', size: 'large' },
    { name: 'Spanish', use: 'meat', size: 'medium' },
    { name: 'Toggenburg', use: 'dairy', size: 'large' },
  ],
  sheep: [
    { name: 'Border Leicester', use: 'fiber', size: 'large' },
    { name: 'Corriedale', use: 'dual', size: 'large' },
    { name: 'Dorper', use: 'meat', size: 'large' },
    { name: 'Dorset', use: 'dual', size: 'large' },
    { name: 'East Friesian', use: 'dairy', size: 'large', notes: 'Highest milk production of any sheep breed' },
    { name: 'Hampshire', use: 'meat', size: 'large' },
    { name: 'Icelandic', use: 'dual', size: 'medium' },
    { name: 'Jacob', use: 'fiber', size: 'medium' },
    { name: 'Katahdin', use: 'meat', size: 'medium', notes: 'Hair sheep, no shearing required' },
    { name: 'Lacaune', use: 'dairy', size: 'large', notes: 'Primary breed for Roquefort cheese production' },
    { name: 'Merino', use: 'fiber', size: 'medium', notes: 'Finest wool of any breed' },
    { name: 'Rambouillet', use: 'fiber', size: 'large' },
    { name: 'Shetland', use: 'fiber', size: 'small' },
    { name: 'Suffolk', use: 'meat', size: 'large' },
  ],
}

export function getBreedsForSpecies(species: Species): Breed[] {
  return BREEDS[species]
}

export function getBreedNames(species: Species): string[] {
  return BREEDS[species].map(b => b.name).sort()
}

export function getBreedsByUse(species: Species, use: BreedUse): Breed[] {
  return BREEDS[species].filter(b => b.use === use)
}

export function getBreedsBySize(species: Species, size: BreedSize): Breed[] {
  return BREEDS[species].filter(b => b.size === size)
}
