'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { useAuth } from '@/hooks/useAuth';

// Persist each signed-in user's react-query cache to localStorage so a freshly
// opened app shows their herd data even with no connection (cold offline).
//
// Privacy: the cache key is scoped to the user id, only that user's snapshot is
// restored (buster), any OTHER user's cache on the device is removed, and on
// sign-out every persisted cache is cleared — so nothing lingers on a shared
// recorder phone.
const PREFIX = 'goatwise-qc-';
const MAX_AGE = 1000 * 60 * 60 * 24; // 24h — matches the query gcTime

export function OfflinePersistence() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const uid = user?.id;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const dropCaches = (keep?: string) => {
      try {
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith(PREFIX) && k !== keep)
          .forEach((k) => window.localStorage.removeItem(k));
      } catch {
        /* storage may be unavailable (private mode); ignore */
      }
    };

    if (!uid) {
      // Signed out: drop the in-memory cache and every persisted snapshot.
      queryClient.clear();
      dropCaches();
      return;
    }

    const key = PREFIX + uid;
    dropCaches(key); // remove any other user's cache left on this device

    const persister = createSyncStoragePersister({ storage: window.localStorage, key });
    const [unsubscribe] = persistQueryClient({
      queryClient,
      persister,
      maxAge: MAX_AGE,
      buster: uid, // only restore this user's snapshot
    });

    return () => {
      unsubscribe();
    };
  }, [uid, queryClient]);

  return null;
}
