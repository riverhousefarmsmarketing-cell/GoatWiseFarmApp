import { getSupabaseClient } from '@/lib/supabase';

/**
 * Microchip numbers arrive from many places: typed by hand, pasted from a vet
 * record, or "typed" by a Bluetooth scanner paired in keyboard (HID) mode. The
 * same chip can show up as "840 003 123 456 789", "840-003123456789" or
 * "840003123456789". Store and compare one canonical form: no spaces,
 * dashes, dots or underscores, upper-case (some non-ISO chips are hex).
 */
export function normalizeMicrochip(raw: string | null | undefined): string {
  return (raw || '').replace(/[\s\-._]/g, '').toUpperCase();
}

export interface ChipOwner {
  id: string;
  name: string;
  status: string | null;
}

/**
 * Find the animal (any status, including outside/reference animals) that
 * already carries this chip, ignoring formatting differences. Returns null
 * when no animal has it. `excludeId` skips the animal being edited.
 */
export async function findAnimalByMicrochip(
  raw: string,
  excludeId?: string,
): Promise<ChipOwner | null> {
  const chip = normalizeMicrochip(raw);
  if (!chip) return null;

  const supabase = getSupabaseClient();
  // Older rows may hold formatted numbers, so compare normalized values on the
  // client rather than relying on an exact-match query. RLS scopes this to the
  // signed-in user's animals.
  const { data, error } = await (supabase.from('animals') as any)
    .select('id, name, status, microchip_id')
    .not('microchip_id', 'is', null);
  if (error) throw error;

  const match = (data as Array<ChipOwner & { microchip_id: string | null }> | null)?.find(
    (a) => a.id !== excludeId && normalizeMicrochip(a.microchip_id) === chip,
  );
  return match ? { id: match.id, name: match.name, status: match.status } : null;
}
