import { getSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/database';

type TableName = keyof Database['public']['Tables'];

// Offline write-outbox: records a user creates while offline are queued in
// localStorage and replayed when the connection returns, so a dropped submit
// (e.g. adding an animal in a dead-zone barn) is never lost.
//
// Privacy: the queue is scoped to the user id, and other users' queues on the
// device are purged (purgeOtherUsers). A user's own pending items are kept
// across sign-out on purpose — deleting them would lose unsynced work — and
// flush when that same user signs back in.

export interface OutboxItem {
  id: string; // client-generated; also used as the row's primary key for idempotent replay
  table: string;
  payload: Record<string, unknown>;
  label: string;
  createdAt: number;
}

const PREFIX = 'goatwise-outbox-';
const keyFor = (uid: string) => PREFIX + uid;
export const OUTBOX_EVENT = 'goatwise-outbox-changed';

function read(uid: string): OutboxItem[] {
  try {
    return JSON.parse(localStorage.getItem(keyFor(uid)) || '[]') as OutboxItem[];
  } catch {
    return [];
  }
}

function write(uid: string, items: OutboxItem[]) {
  try {
    localStorage.setItem(keyFor(uid), JSON.stringify(items));
  } catch {
    /* storage unavailable (private mode / quota); nothing more we can do */
  }
  try {
    window.dispatchEvent(new Event(OUTBOX_EVENT));
  } catch {
    /* no window (SSR) */
  }
}

export function enqueue(uid: string, item: OutboxItem) {
  const items = read(uid);
  items.push(item);
  write(uid, items);
}

export function outboxCount(uid: string): number {
  return read(uid).length;
}

/** Remove any other users' queues left on this device (call on load). */
export function purgeOtherUsers(uid: string) {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX) && k !== keyFor(uid))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/**
 * Try to send every queued item in order. Items sent (or already present
 * server-side, detected via a unique-violation) are removed; on the first
 * network-style failure we stop and keep the rest for the next attempt.
 * Returns how many synced and how many remain.
 */
export async function flushOutbox(uid: string): Promise<{ synced: number; remaining: number }> {
  const supabase = getSupabaseClient();
  let items = read(uid);
  let synced = 0;

  for (const item of [...items]) {
    try {
      // The outbox replays dynamic {table, payload} records captured at enqueue
      // time, so the table name and payload are only known as strings here. The
      // table name is narrowed to a real table; the payload is cast to `never`
      // to satisfy the per-table Insert union (its shape was validated when the
      // original online insert's types were checked at the call site).
      const { error } = await supabase
        .from(item.table as TableName)
        .insert(item.payload as never);
      if (error) {
        // 23505 = unique_violation: this row was already inserted on a prior
        // attempt, so treat it as done. Anything else, stop and keep the queue.
        if ((error as { code?: string }).code === '23505') {
          items = items.filter((i) => i.id !== item.id);
          synced += 1;
          continue;
        }
        break;
      }
      items = items.filter((i) => i.id !== item.id);
      synced += 1;
    } catch {
      // Network/throw: stop and keep remaining items for the next reconnect.
      break;
    }
  }

  write(uid, items);
  return { synced, remaining: items.length };
}
