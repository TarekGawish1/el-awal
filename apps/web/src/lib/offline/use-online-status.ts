'use client';

import { useState, useEffect } from 'react';
import { syncEngine } from './sync-engine';

/**
 * Universal hook providing real-time online/offline network status.
 * Reacts immediately to browser window events and internal sync engine connectivity transitions.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    const updateStatus = () => {
      const current = typeof navigator !== 'undefined' ? navigator.onLine : syncEngine.isOnline();
      setIsOnline(current);
    };

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    const unsubscribe = syncEngine.subscribe((event) => {
      if (event.type === 'ONLINE') setIsOnline(true);
      if (event.type === 'OFFLINE') setIsOnline(false);
    });

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      unsubscribe();
    };
  }, []);

  return isOnline;
}
