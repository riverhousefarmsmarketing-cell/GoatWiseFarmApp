import { enqueue } from '@/lib/outbox';

// Shared "create a row, or queue it if offline" used by the create mutations so
// a farmer's entry (milk, health, inspection, animal) survives a dead zone and
// syncs on reconnect. Online failures that are NOT network errors (e.g. a
// validation/constraint error) are re-thrown so they surface normally.

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function isNetworkError(e: unknown): boolean {
  const err = e as { name?: string; message?: string };
  const m = (err?.message || '').toLowerCase();
  return err?.name === 'TypeError' || m.includes('fetch') || m.includes('network') || m.includes('failed to');
}

export interface CreateResult {
  queued: boolean;
  data: Record<string, any>;
}

/**
 * Insert `payload` into `table`. If offline (or the request fails with a network
 * error), queue it to the outbox and return `{queued:true}` with the payload
 * (carrying a client id, which doubles as the row PK for idempotent replay).
 */
export async function createOrQueue(
  supabase: any,
  uid: string,
  table: string,
  payload: Record<string, any>,
  opts: { label?: string } = {},
): Promise<CreateResult> {
  const id = (payload.id as string) || newId();
  const row = { ...payload, id };
  const label = opts.label || table;

  const queue = () =>
    enqueue(uid, { id, table, payload: row, label, createdAt: Date.now() });

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    queue();
    return { queued: true, data: row };
  }

  try {
    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) throw error;
    return { queued: false, data };
  } catch (e) {
    if (isNetworkError(e)) {
      queue();
      return { queued: true, data: row };
    }
    throw e;
  }
}
