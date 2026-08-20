'use client';

import { useEffect } from 'react';
import toast from 'react-hot-toast';

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Request persistent storage to protect IndexedDB data from eviction
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then((isPersisted) => {
        if (isPersisted) {
          console.debug('[Storage] Persistent storage granted');
        }
      }).catch((e) => {
        console.debug('[Storage] Storage persist request ignored:', e);
      });
    }

    // In Next.js dev server, avoid registering SW unless explicitly enabled
    const isDev = process.env.NODE_ENV === 'development';
    const enableDevSw = process.env.NEXT_PUBLIC_ENABLE_DEV_SW === 'true';

    if (isDev && !enableDevSw) {
      return;
    }

    const registerSw = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New update available
                toast.success('يتوفر إصدار جديد من المنصة. أعد تحميل الصفحة للتحديث.', {
                  duration: 6000,
                  icon: '🚀',
                  position: 'bottom-left',
                });
              }
            });
          }
        });
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    };

    // Register after page load for performance
    if (document.readyState === 'complete') {
      registerSw();
    } else {
      window.addEventListener('load', registerSw);
      return () => window.removeEventListener('load', registerSw);
    }
  }, []);

  // Online / Offline Connectivity Listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      toast.success('تمت استعادة الاتصال بالإنترنت بنجاح', {
        position: 'bottom-center',
        duration: 3500,
        icon: '🟢',
      });
    };

    const handleOffline = () => {
      toast.error('أنت غير متصل بالإنترنت حالياً. يتم تشغيل وضع العمل المحفوظ.', {
        position: 'bottom-center',
        duration: 5000,
        icon: '📡',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null;
}
