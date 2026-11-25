import { getSupabaseClient } from '@/lib/supabase';

// Offline write-outbox: records a user creates while offline are queued in
// localStorage and replayed when the connection returns, so a dropped submit
// (e.g. logging milk or adding an animal in a dead-zone barn) is never lost.
//
// Privacy: queues are scoped to the user id, and other users' queues on the
// device are purged (purgeOtherUsers). A user's own pending items are kept
// across sign-out on purpose — deleting them would lose unsynced work.

export interface OutboxItem {
  id: string; // queue-entry id (also the row PK where the table has one), for idempotent replay
  table: string;
  payload: Record<string, unknown>;
  label: string;
  createdAt: number;
  failedReason?: string;
}

const PREFIX = 'goatwise-outbox-';
const FAILED_PREFIX = 'goatwise-outbox-failed-';
const keyFor = (uid: string) => PREFIX + uid;
const failedKeyFor = (uid: string) => FAILED_PREFIX + uid;
export const OUTBOX_EVENT = 'goatwise-outbox-changed';

function readKey(k: string): OutboxItem[] {
  try {
    return JSON.parse(localStorage.getItem(k) || '[]') as OutboxItem[];
  } catch {
    return [];
  }
}
function writeKey(k: string, items: OutboxItem[]) {
  try {
    localStorage.setItem(k, JSON.stringify(items));
  } catch {
    /* storage unavailable; nothing more we can do */
  }
}
function notify() {
  try {
    window.dispatchEvent(new Event(OUTBOX_EVENT));
  } catch {
    /* no window (SSR) */
  }
}

export function enqueue(uid: string, item: OutboxItem) {
  const items = readKey(keyFor(uid));
  items.push(item);
  writeKey(keyFor(uid), items);
  notify();
}

export function outboxCount(uid: string): number {
  return readKey(keyFor(uid)).length;
}
export function failedCount(uid: string): number {
  return readKey(failedKeyFor(uid)).length;
}
export function listFailed(uid: string): OutboxItem[] {
  return readKey(failedKeyFor(uid));
}
export function clearFailed(uid: string) {
  writeKey(failedKeyFor(uid), []);
  notify();
}

/** Remove any other users' queues (pending + failed) left on this device. */
export function purgeOtherUsers(uid: string) {
  try {
    const keep = new Set([keyFor(uid), failedKeyFor(uid)]);
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX) && !keep.has(k))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/**
 * Send queued items in order. Outcomes per item:
 *  - success, or unique-violation (23505 — already sent on a prior attempt): removed, counted synced.
 *  - other DB error (a permanent/validation failure, e.g. a CHECK violation):
 *    moved to the failed list so it CANNOT stall the queue; the user is told.
 *  - a thrown/network failure: stop and keep the rest for the next reconnect.
 */
export async function flushOutbox(
  uid: string,
): Promise<{ synced: number; remaining: number; failed: number }> {
  const supabase = getSupabaseClient();
  let items = readKey(keyFor(uid));
  const failed = readKey(failedKeyFor(uid));
  let synced = 0;

  for (const item of [...items]) {
    try {
      const { error } = await (supabase.from(item.table) as any).insert(item.payload);
      if (error) {
        const code = (error as { code?: string }).code;
        if (code === '23505') {
          items = items.filter((i) => i.id !== item.id);
          synced += 1;
          continue;
        }
        // Permanent failure — set it aside so one bad item can't block the rest.
        items = items.filter((i) => i.id !== item.id);
        failed.push({ ...item, failedReason: (error as { message?: string }).message || code || 'error' });
        continue;
      }
      items = items.filter((i) => i.id !== item.id);
      synced += 1;
    } catch {
      break; // network/throw: keep remaining items, try again on next reconnect
    }
  }

  writeKey(keyFor(uid), items);
  writeKey(failedKeyFor(uid), failed);
  notify();
  return { synced, remaining: items.length, failed: failed.length };
}
