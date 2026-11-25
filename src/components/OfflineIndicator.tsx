'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Thin banner shown when the device goes offline. Reassures the user the app is
 * still usable for viewing, and that a new animal added offline is saved and
 * syncs on reconnect (via the outbox). Other record types still need a
 * connection until the outbox is generalized to them.
 */
export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-center text-sm font-medium text-white"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>Offline — showing saved data. New animals save and sync when you reconnect; other new records need a connection.</span>
    </div>
  );
}
