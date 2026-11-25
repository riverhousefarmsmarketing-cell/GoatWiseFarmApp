'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  outboxCount,
  failedCount,
  clearFailed,
  flushOutbox,
  purgeOtherUsers,
  OUTBOX_EVENT,
} from '@/lib/outbox';
import { CloudOff, RefreshCw, AlertTriangle, X } from 'lucide-react';

/**
 * Drains the offline write-outbox when the connection returns and shows small
 * indicators for pending items and for any that permanently failed to sync.
 * Mounted on the dashboard.
 */
export function OutboxSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id;
  const [count, setCount] = useState(0);
  const [failed, setFailed] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(() => {
    if (uid) {
      setCount(outboxCount(uid));
      setFailed(failedCount(uid));
    }
  }, [uid]);

  const sync = useCallback(async () => {
    if (!uid || typeof navigator === 'undefined' || !navigator.onLine) return;
    if (outboxCount(uid) === 0) return;
    setSyncing(true);
    try {
      const { synced } = await flushOutbox(uid);
      if (synced > 0) queryClient.invalidateQueries();
    } finally {
      setSyncing(false);
      refresh();
    }
  }, [uid, queryClient, refresh]);

  useEffect(() => {
    if (!uid) return;
    purgeOtherUsers(uid);
    refresh();
    void sync(); // covers items left from a previous session

    const onOnline = () => void sync();
    const onChange = () => refresh();
    window.addEventListener('online', onOnline);
    window.addEventListener(OUTBOX_EVENT, onChange);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener(OUTBOX_EVENT, onChange);
    };
  }, [uid, sync, refresh]);

  if (!uid || (count === 0 && failed === 0)) return null;

  return (
    <div
      className="fixed z-40 left-4 flex flex-col gap-2"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {count > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 shadow"
        >
          {syncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CloudOff className="h-4 w-4" />}
          <span>
            {syncing
              ? 'Syncing…'
              : `${count} change${count === 1 ? '' : 's'} saved offline — will sync when online`}
          </span>
        </div>
      )}
      {failed > 0 && (
        <div
          role="alert"
          className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 shadow"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {failed} offline {failed === 1 ? 'entry' : 'entries'} couldn&apos;t sync — re-enter{' '}
            {failed === 1 ? 'it' : 'them'}
          </span>
          <button
            type="button"
            onClick={() => uid && clearFailed(uid)}
            aria-label="Dismiss"
            className="ml-1 rounded-md p-0.5 hover:bg-red-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
