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
      setIsBootstrapping(bootstrapManager.isBootstrapping());
      setPercentage(event.percentage);
      setMessage(event.message);
      setLastEvent(event);
    });

    // Auto-trigger bootstrap on authenticated session start
    if (autoTrigger && isAuthenticated && isInitialized) {
      triggerBootstrap(false);
    }

    return () => {
      unsubscribe();
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
