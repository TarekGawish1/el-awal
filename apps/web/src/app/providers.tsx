'use client';

import React, { useState, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AnalyticsTracker } from '@/components/analytics/AnalyticsTracker';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1,
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
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          // Inherit the app font so Arabic toast copy renders correctly (RTL)
          style: { fontFamily: 'inherit' },
        }}
      />
    </QueryClientProvider>
  );
}
