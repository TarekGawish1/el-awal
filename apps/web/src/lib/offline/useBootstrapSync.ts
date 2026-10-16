'use client';

import { useState, useEffect, useCallback } from 'react';
import { bootstrapManager, BootstrapEvent } from './bootstrap-manager';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';

export interface BootstrapSyncState {
  isBootstrapping: boolean;
  percentage: number;
  message: string;
  lastEvent: BootstrapEvent | null;
  triggerBootstrap: (forceFull?: boolean) => Promise<any>;
}

export function useBootstrapSync(autoTrigger: boolean = true): BootstrapSyncState {
  const queryClient = useQueryClient();
  const { isAuthenticated, isInitialized } = useAuth();

  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(bootstrapManager.isBootstrapping());
  const [percentage, setPercentage] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [lastEvent, setLastEvent] = useState<BootstrapEvent | null>(null);

  const triggerBootstrap = useCallback(
    async (forceFull: boolean = false) => {
      return bootstrapManager.performBootstrap({ forceFull, queryClient });
    },
    [queryClient],
  );

  useEffect(() => {
    const unsubscribe = bootstrapManager.subscribe((event) => {
      const isCurrentlyBootstrapping = event.type === 'START' || event.type === 'PROGRESS';
      setIsBootstrapping(isCurrentlyBootstrapping);
      setPercentage(event.percentage);
      setMessage(event.message);
      setLastEvent(event);
    });

    // Auto-trigger bootstrap on authenticated session start.
    // Defer the background sync until initial UI hydration and paint are complete (idle time)
    // to prevent blocking the main thread and IndexedDB during critical page render.
    let idleTimer: any;
    if (autoTrigger && isAuthenticated && isInitialized) {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        idleTimer = (window as any).requestIdleCallback(() => triggerBootstrap(false), { timeout: 4000 });
      } else {
        idleTimer = setTimeout(() => triggerBootstrap(false), 2500);
      }
    }

    return () => {
      unsubscribe();
      if (idleTimer) {
        if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
          (window as any).cancelIdleCallback(idleTimer);
        } else {
          clearTimeout(idleTimer);
        }
      }
    };
  }, [autoTrigger, isAuthenticated, isInitialized, triggerBootstrap]);

  return {
    isBootstrapping,
    percentage,
    message,
    lastEvent,
    triggerBootstrap,
  };
}
