'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CloudOff, RefreshCw, AlertTriangle, X } from 'lucide-react';
import {
  QueuedInsert, discardQueued, flushQueue, persistCache, readQueue, restoreCache, subscribeQueue,
} from '@/lib/offline';
import { pokeDispatch } from '@/lib/push';

/** Whether the device thinks it has a connection. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return online;
}

export function useOfflineQueue(): QueuedInsert[] {
  const [queue, setQueue] = useState<QueuedInsert[]>([]);
  useEffect(() => {
    setQueue(readQueue());
    return subscribeQueue(setQueue);
  }, []);
  return queue;
}

/** Rows saved on this device for a table and not yet sent, marked pending. */
export function usePendingRows<T>(table: string): (T & { pending: true })[] {
  const queue = useOfflineQueue();
  return useMemo(
    () => queue.filter((q) => q.table === table).flatMap((q) => q.rows.map((r) => ({ ...(r as T), pending: true as const }))),
    [queue, table]
  );
}

/**
 * Restores the last data saved on this device before the dashboard renders,
 * keeps saving it as new data loads, and sends queued changes whenever there's
 * a connection.
 */
export function OfflineSync({ userId, children }: { userId: string; children: ReactNode }) {
  const queryClient = useQueryClient();
  const online = useOnline();
  const queue = useOfflineQueue();

  // Restore synchronously on first render so pages start with the saved data.
  useState(() => {
    if (typeof window !== 'undefined') restoreCache(queryClient, userId);
    return true;
  });

  // Save the cache a couple of seconds after things change, and when hidden.
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    const save = () => persistCache(queryClient, userId);
    const unsub = queryClient.getQueryCache().subscribe(() => {
      clearTimeout(timer.current);
      timer.current = setTimeout(save, 2000);
    });
    const onHide = () => { if (document.visibilityState === 'hidden') save(); };
    document.addEventListener('visibilitychange', onHide);
    return () => { unsub(); clearTimeout(timer.current); document.removeEventListener('visibilitychange', onHide); };
  }, [queryClient, userId]);

  // Send queued changes when online: now, on reconnect, and every 30 seconds.
  const mine = queue.filter((q) => !q.userId || q.userId === userId);
  // Refused items stay listed (below) but don't keep the "sending" spinner on.
  const waiting = mine.filter((q) => !q.lastError).length;
  useEffect(() => {
    if (!online || waiting === 0) return;
    let stopped = false;
    const run = async () => {
      const sent = await flushQueue().catch(() => 0);
      if (sent > 0 && !stopped) {
        queryClient.invalidateQueries();
        pokeDispatch();
      }
    };
    run();
    const id = setInterval(run, 30_000);
    return () => { stopped = true; clearInterval(id); };
  }, [online, waiting, queryClient]);

  const refused = mine.filter((q) => q.lastError);

  return (
    <>
      {(!online || waiting > 0) && (
        <div className={`sticky top-0 z-30 px-4 py-2 text-sm flex items-center gap-2 ${online ? 'bg-[#B8DCC8] text-[#0A3228]' : 'bg-[#384E42] text-white'}`} role="status">
          {online ? <RefreshCw className="h-4 w-4 animate-spin flex-shrink-0" /> : <CloudOff className="h-4 w-4 flex-shrink-0" />}
          <span className="flex-1">
            {online
              ? `Sending ${waiting} saved change${waiting === 1 ? '' : 's'}…`
              : `No signal. You can keep ticking off chores and doses, flagging restock items and logging minerals — ${waiting ? `${waiting} change${waiting === 1 ? '' : 's'} waiting, ` : ''}they'll be sent when you're back online.`}
          </span>
        </div>
      )}
      {refused.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-900 space-y-1">
          {refused.map((q) => (
            <div key={q.id} className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="flex-1">Couldn&apos;t save “{q.label}”: {q.lastError}</span>
              <button className="p-0.5 hover:text-amber-700" aria-label="Discard" onClick={() => discardQueued(q.id)}><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
      {children}
    </>
  );
}
