import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, formatDistanceToNow, differenceInDays, differenceInYears, differenceInMonths } from 'date-fns';
import { getCategoryLabel } from './animalVocab';
import type { Species } from './speciesConfig';

/**
 * Merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize a stored weight to pounds. weight_records / birth weights can be
 * entered in lbs, kg, oz, or g (the kidding form writes oz), but every chart,
 * threshold, and total in the app is expressed in lbs -- so summing or comparing
 * raw values mixes incomparable units. Returns null for a null/NaN weight so
 * callers can distinguish "no reading" from zero.
 */
const WEIGHT_TO_LBS: Record<string, number> = {
  lbs: 1,
  kg: 2.20462,
  oz: 1 / 16,
  g: 0.00220462,
};

export function weightToLbs(weight: number | null | undefined, unit?: string | null): number | null {
  if (weight == null) return null;
  const n = Number(weight);
  if (!Number.isFinite(n)) return null;
  return n * (WEIGHT_TO_LBS[unit || 'lbs'] ?? 1);
}

/**
 * Format a date string
 */
export function formatDate(date: string | Date | null | undefined, formatStr: string = 'MMM d, yyyy'): string {
  if (!date) return '—';
  // Parse date-only strings ('YYYY-MM-DD') as LOCAL midnight. `new Date('2026-08-09')`
  // parses as UTC midnight, which formats to the PREVIOUS day for west-of-UTC users --
  // so every stored date used to display one day early. Full timestamps keep their TZ.
  const d = typeof date === 'string'
    ? (/^\d{4}-\d{2}-\d{2}$/.test(date) ? parseISO(date) : new Date(date))
    : date;
  if (isNaN(d.getTime())) return '—';
  return format(d, formatStr);
}

/**
 * Format a date relative to now
 */
export function formatRelativeDate(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: string | Date): string {
  const birth = new Date(birthDate);
  const now = new Date();
  
  const years = differenceInYears(now, birth);
  const months = differenceInMonths(now, birth) % 12;
  const days = differenceInDays(now, birth);
  
  if (days < 7) {
    return `${days}d`;
  } else if (days < 30) {
    return `${Math.floor(days / 7)}w`;
  } else if (years === 0) {
    return `${months}mo`;
  } else if (months === 0) {
    return `${years}yr`;
  } else {
    return `${years}yr ${months}mo`;
  }
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format weight
 */
export function formatWeight(amount: number, unit: string = 'lbs'): string {
  return `${amount.toFixed(1)} ${unit}`;
}

/**
 * Get status color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    sold: 'bg-blue-100 text-blue-800',
    deceased: 'bg-gray-100 text-gray-800',
    culled: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get category display name. Accepts both the goat and species-neutral
 * vocabularies and is species-aware; see src/lib/animalVocab.ts.
 */
export function getCategoryDisplay(category: string, species: Species = 'goat'): string {
  return getCategoryLabel(category, species);
}

/**
 * Get FAMACHA color
 */
export function getFamachaColor(score: number): string {
  const colors: Record<number, string> = {
    1: 'bg-red-600',
    2: 'bg-red-400',
    3: 'bg-orange-400',
    4: 'bg-pink-300',
    5: 'bg-pink-100',
  };
  return colors[score] || 'bg-gray-300';
}

/**
 * Get FAMACHA status
 */
export function getFamachaStatus(score: number): { label: string; color: string } {
  // FAMACHA: 1 = red/robust (no anemia), 5 = pale/white (severe anemia -> deworm).
  // Low scores are healthy; high scores need treatment. This was previously
  // inverted, flagging anemic goats (4-5) as "Healthy" and healthy goats (1-2)
  // as "Deworm Immediately".
  if (score >= 4) return { label: 'Deworm Immediately', color: 'text-red-600' };
  if (score === 3) return { label: 'Monitor Closely', color: 'text-orange-600' };
  return { label: 'Healthy', color: 'text-green-600' };
}

/**
 * Calculate gestation progress
 */
export function getGestationProgress(breedingDate: string): number {
  const GESTATION_DAYS = 150;
  const days = differenceInDays(new Date(), new Date(breedingDate));
  return Math.min(Math.round((days / GESTATION_DAYS) * 100), 100);
}

/**
 * Calculate due date
 */
export function calculateDueDate(breedingDate: string): Date {
  const GESTATION_DAYS = 150;
  const date = new Date(breedingDate);
  date.setDate(date.getDate() + GESTATION_DAYS);
  return date;
}

/**
 * Get days until due
 */
export function getDaysUntilDue(dueDate: string): number {
  return differenceInDays(new Date(dueDate), new Date());
}
