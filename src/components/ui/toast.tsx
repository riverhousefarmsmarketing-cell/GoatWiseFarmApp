'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';

type Toast = { id: number; message: string };

const listeners = new Set<(t: Toast) => void>();
let nextId = 1;

/** Show a short message at the bottom of the screen. Safe to call from anywhere on the client. */
export function notify(message: string) {
  const toast = { id: nextId++, message };
  listeners.forEach((l) => l(toast));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const add = (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 6000);
    };
    listeners.add(add);
    return () => {
      listeners.delete(add);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-md" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="flex items-start gap-3 rounded-lg bg-[#031812] text-white px-4 py-3 shadow-lg">
          <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0 text-[#B8DCC8]" />
          <p className="text-sm flex-1">{t.message}</p>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="text-white/70 hover:text-white"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
