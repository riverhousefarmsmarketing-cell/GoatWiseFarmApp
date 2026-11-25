'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { outboxCount, flushOutbox, purgeOtherUsers, OUTBOX_EVENT } from '@/lib/outbox';
import { CloudOff, RefreshCw } from 'lucide-react';

/**
 * Drains the offline write-outbox when the connection returns and shows a small
 * indicator while items are pending. Mounted on the dashboard.
 */
export function OutboxSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id;
  const [count, setCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(() => {
    if (uid) setCount(outboxCount(uid));
  }, [uid]);

  const sync = useCallback(async () => {
    if (!uid || typeof navigator === 'undefined' || !navigator.onLine) return;
    if (outboxCount(uid) === 0) return;
    setSyncing(true);
    try {
      const { synced } = await flushOutbox(uid);
      if (synced > 0) {
        // Newly-synced records should now appear in lists.
        queryClient.invalidateQueries();
      }
    } finally {
      setSyncing(false);
      refreshCount();
    }
  }, [uid, queryClient, refreshCount]);

  useEffect(() => {
    if (!uid) return;
    purgeOtherUsers(uid);
    refreshCount();
    void sync(); // attempt on load (covers items left from a previous session)

    const onOnline = () => void sync();
    const onChange = () => refreshCount();
    window.addEventListener('online', onOnline);
    window.addEventListener(OUTBOX_EVENT, onChange);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener(OUTBOX_EVENT, onChange);
    };
  }, [uid, sync, refreshCount]);

  if (!uid || count === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed z-40 left-4 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 shadow"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {syncing ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : (
        <CloudOff className="h-4 w-4" />
      )}
      <span>
        {syncing
          ? 'Syncing…'
          : `${count} change${count === 1 ? '' : 's'} saved offline — will sync when online`}
      </span>
    </div>
  );
}
