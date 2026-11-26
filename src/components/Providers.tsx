'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, ReactNode } from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { OfflinePersistence } from '@/components/OfflinePersistence';
import { ToastProvider } from '@/components/ToastProvider';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            // Keep fetched data in memory for 24h (matches the persisted cache
            // window) so it stays visible when the connection drops and is
            // available on a cold offline open.
            gcTime: 1000 * 60 * 60 * 24,
            refetchOnWindowFocus: false,
            // Serve cached data first and don't hang on requests while offline.
            networkMode: 'offlineFirst',
          },
          mutations: {
            networkMode: 'offlineFirst',
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OfflinePersistence />
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
