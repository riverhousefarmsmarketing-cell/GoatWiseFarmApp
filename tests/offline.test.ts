/**
 * The offline queue (src/lib/offline.ts): saving with no signal, sending
 * later, never duplicating, and keeping refused items for the person to see.
 */
const store = new Map<string, string>();
const insert = jest.fn();

beforeAll(() => {
  (global as any).window = {
    localStorage: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
  Object.defineProperty(global, 'navigator', { value: { onLine: true }, configurable: true, writable: true });
});

jest.mock('../src/lib/supabase', () => ({
  getSupabaseClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: 'user-1' } } } }) },
    from: () => ({ insert }),
  }),
}));

import { discardQueued, flushQueue, insertOrQueue, isNetworkError, readQueue } from '@/lib/offline';

const setOnline = (v: boolean) => { (global as any).navigator.onLine = v; };

beforeEach(() => {
  store.clear();
  insert.mockReset();
  setOnline(true);
});

it('sends straight away when online', async () => {
  insert.mockResolvedValue({ error: null });
  expect(await insertOrQueue('chore_completions', [{ care_plan_id: 'p', slot: '07:00' }], 'Chore')).toBe('sent');
  expect(insert).toHaveBeenCalledTimes(1);
  expect(insert.mock.calls[0][0][0].id).toEqual(expect.any(String)); // every row gets an id
  expect(readQueue()).toHaveLength(0);
});

it('keeps it on the device with no signal, then sends it', async () => {
  setOnline(false);
  expect(await insertOrQueue('course_doses', [{ course_id: 'c', slot: '08:00' }], 'Dose given')).toBe('queued');
  expect(insert).not.toHaveBeenCalled();
  expect(readQueue()).toHaveLength(1);
  const rowId = readQueue()[0].rows[0].id;

  setOnline(true);
  insert.mockResolvedValue({ error: null });
  expect(await flushQueue()).toBe(1);
  expect(insert.mock.calls[0][0][0].id).toBe(rowId); // same id as saved: no duplicates
  expect(readQueue()).toHaveLength(0);
});

it('queues when the request fails for lack of connection', async () => {
  insert.mockRejectedValue(new TypeError('Failed to fetch'));
  expect(await insertOrQueue('restock_requests', [{ item_name: 'Straw' }], 'Restock: Straw')).toBe('queued');
  expect(readQueue()).toHaveLength(1);
});

it('treats "already there" as sent (a retry after an unknown outcome)', async () => {
  setOnline(false);
  await insertOrQueue('chore_completions', [{ care_plan_id: 'p' }], 'Chore');
  setOnline(true);
  insert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });
  expect(await flushQueue()).toBe(1);
  expect(readQueue()).toHaveLength(0);
});

it('keeps refused items with the reason, and they can be discarded', async () => {
  setOnline(false);
  await insertOrQueue('mineral_refills', [{ amount: 5 }], 'Mineral refill');
  setOnline(true);
  insert.mockResolvedValue({ error: { code: '42501', message: 'new row violates row-level security policy' } });
  expect(await flushQueue()).toBe(0);
  const [item] = readQueue();
  expect(item.lastError).toMatch(/row-level security/);
  expect(item.tries).toBe(1);
  discardQueued(item.id);
  expect(readQueue()).toHaveLength(0);
});

it('stops at the first connection problem and keeps the order', async () => {
  setOnline(false);
  await insertOrQueue('chore_completions', [{ n: 1 }], 'first');
  await insertOrQueue('chore_completions', [{ n: 2 }], 'second');
  setOnline(true);
  insert.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  expect(await flushQueue()).toBe(0);
  expect(readQueue().map((q) => q.label)).toEqual(['first', 'second']);
  insert.mockResolvedValue({ error: null });
  expect(await flushQueue()).toBe(2);
});

it('refuses tables that are not meant to be saved offline', async () => {
  await expect(insertOrQueue('transactions', [{}], 'x')).rejects.toThrow(/can't be saved offline/);
});

it('recognises connection errors', () => {
  expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
  expect(isNetworkError({ message: 'Load failed' })).toBe(true);
  expect(isNetworkError({ message: 'permission denied' })).toBe(false);
});
