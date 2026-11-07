'use client';

/**
 * Working with poor signal (barn, far pasture).
 *
 * 1. Saving: the everyday barn actions (ticking chores and doses, flagging
 *    restock items, logging minerals, reporting concerns) go through
 *    insertOrQueue(). With no connection the rows are kept on this device and
 *    sent, in order, as soon as it's back. Every row carries its own id, so a
 *    retry can never create a duplicate: the database just says "already
 *    there" and the item is dropped from the queue.
 *
 * 2. Reading: persistCache()/restoreCache() keep the last data the app loaded
 *    on this device (for 3 days), so pages still show animals, chores and
 *    treatments when the app is opened offline. Cleared on sign-out.
 *
 * The rules (who may do what) are still enforced by the database when the
 * queued rows arrive; anything it refuses stays in the queue with the reason,
 * for the person to see and discard.
 */
import { dehydrate, hydrate, type QueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';

export interface QueuedInsert {
  id: string;
  table: string;
  rows: Record<string, unknown>[];
  /** What the person did, for the "waiting to send" list. */
  label: string;
  userId: string;
  createdAt: string;
  tries: number;
  lastError?: string;
}

const QUEUE_KEY = 'goatwise-offline-queue-v1';
const CACHE_KEY = 'goatwise-query-cache-v1';
const CACHE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
/** Tables the queue may write to. */
const QUEUEABLE = new Set(['chore_completions', 'course_doses', 'restock_requests', 'mineral_refills', 'concern_reports', 'health_records', 'milk_records', 'weight_records']);

type Listener = (q: QueuedInsert[]) => void;
const listeners = new Set<Listener>();

function safeGet(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* storage full or blocked */ }
}
function safeRemove(key: string) {
  try { window.localStorage.removeItem(key); } catch { /* ignore */ }
}

export function readQueue(): QueuedInsert[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(safeGet(QUEUE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedInsert[]) {
  safeSet(QUEUE_KEY, JSON.stringify(q));
  listeners.forEach((l) => l(q));
}

export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => { if (e.key === QUEUE_KEY) listener(readQueue()); };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** A failure that means "no connection" rather than "the database said no". */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = String((error as any)?.message ?? error ?? '');
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout/i.test(msg);
}

export type SaveResult = 'sent' | 'queued';

/**
 * Insert rows now, or keep them on this device to send later if there's no
 * connection. Each row gets an id if it doesn't have one.
 */
export async function insertOrQueue(table: string, rows: Record<string, unknown>[], label: string): Promise<SaveResult> {
  if (!QUEUEABLE.has(table)) throw new Error(`insertOrQueue: ${table} can't be saved offline`);
  const withIds = rows.map((r) => ({ id: newId(), ...r }));
  const supabase = getSupabaseClient() as any;

  const queue = async (): Promise<SaveResult> => {
    const { data: { session } } = await supabase.auth.getSession();
    writeQueue([...readQueue(), {
      id: newId(), table, rows: withIds, label, userId: session?.user?.id ?? '', createdAt: new Date().toISOString(), tries: 0,
    }]);
    return 'queued';
  };

  if (typeof navigator !== 'undefined' && navigator.onLine === false) return queue();
  try {
    const { error } = await supabase.from(table).insert(withIds);
    if (!error || error.code === '23505') return 'sent';
    if (isNetworkError(error)) return queue();
    throw new Error(error.message);
  } catch (e) {
    if (isNetworkError(e)) return queue();
    throw e;
  }
}

let flushing: Promise<number> | null = null;

/**
 * Send everything waiting for the signed-in person, oldest first. Stops at
 * the first connection problem. Returns how many items were sent.
 */
export function flushQueue(): Promise<number> {
  if (flushing) return flushing;
  flushing = (async () => {
    const supabase = getSupabaseClient() as any;
    const { data: { session } } = await supabase.auth.getSession();
    const me = session?.user?.id;
    if (!me) return 0;
    let sent = 0;
    for (const item of readQueue()) {
      if (item.userId && item.userId !== me) continue;
      let outcome: 'done' | 'offline' | 'refused' = 'done';
      let reason = '';
      try {
        const { error } = await supabase.from(item.table).insert(item.rows);
        if (error && error.code !== '23505') {
          outcome = isNetworkError(error) ? 'offline' : 'refused';
          reason = error.message;
        }
      } catch (e: any) {
        outcome = isNetworkError(e) ? 'offline' : 'refused';
        reason = e?.message ?? String(e);
      }
      if (outcome === 'offline') break;
      const current = readQueue();
      if (outcome === 'done') {
        writeQueue(current.filter((q) => q.id !== item.id));
        sent++;
      } else {
        writeQueue(current.map((q) => (q.id === item.id ? { ...q, tries: q.tries + 1, lastError: reason } : q)));
      }
    }
    return sent;
  })().finally(() => { flushing = null; });
  return flushing;
}

export function discardQueued(id: string) {
  writeQueue(readQueue().filter((q) => q.id !== id));
}

// ---------------------------------------------------------------------------
// Keeping the last loaded data on this device
// ---------------------------------------------------------------------------

/** Restore saved data for this person into the query cache (if fresh enough). */
export function restoreCache(queryClient: QueryClient, userId: string) {
  try {
    const raw = safeGet(CACHE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.userId !== userId || Date.now() - saved.savedAt > CACHE_MAX_AGE_MS) {
      safeRemove(CACHE_KEY);
      return;
    }
    hydrate(queryClient, saved.state);
  } catch {
    safeRemove(CACHE_KEY);
  }
}

/** Save the current query cache for this person (successful queries only). */
export function persistCache(queryClient: QueryClient, userId: string) {
  try {
    const state = dehydrate(queryClient, {
      shouldDehydrateQuery: (q) => q.state.status === 'success' && q.queryKey[0] !== 'notifications',
    });
    safeSet(CACHE_KEY, JSON.stringify({ userId, savedAt: Date.now(), state }));
  } catch {
    // Too big for storage, or blocked: offline reading just won't have it.
  }
}

export function clearCache() {
  safeRemove(CACHE_KEY);
}
