'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, RefreshCw, Check, Loader2 } from 'lucide-react';

export interface PullToRefreshProps {
  children: React.ReactNode;
  containerRef?: React.RefObject<HTMLElement | null>;
  onRefresh?: () => Promise<void> | void;
  disabled?: boolean;
}

const PULL_THRESHOLD = 55; // Threshold in px to trigger refresh
const MAX_PULL = 90; // Maximum visual drag distance

export function PullToRefresh({
  children,
  containerRef,
  onRefresh,
  disabled = false,
}: PullToRefreshProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isAtTopRef = useRef(false);
  const hasTriggeredHapticRef = useRef(false);

  const getScrollTop = useCallback(() => {
    if (containerRef?.current) {
      return containerRef.current.scrollTop;
    }
    return typeof window !== 'undefined' ? window.scrollY : 0;
  }, [containerRef]);

  const executeRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPullDistance(48); // Hold at indicator height while loading

    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        // 1. Invalidate active React Query cache
        await queryClient.invalidateQueries();

        // 2. Revalidate Next.js server component routes
        router.refresh();

        // 3. Trigger downstream sync engine if online
        if (typeof window !== 'undefined' && navigator.onLine) {
          try {
            const { syncEngine } = await import('@/lib/offline/sync-engine');
            await syncEngine.checkAndSync({ skipCooldown: true });
          } catch {
            // Non-critical background sync
          }
        }
      }

      setIsSuccess(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([15, 30, 15]);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.warn('[PullToRefresh] Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
      setIsSuccess(false);
      setPullDistance(0);
      hasTriggeredHapticRef.current = false;
    }
  }, [onRefresh, queryClient, router]);

  useEffect(() => {
    if (disabled) return;

    const targetElement = containerRef?.current || (typeof window !== 'undefined' ? document : null);
    if (!targetElement) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return;

      const scrollTop = getScrollTop();
      if (scrollTop <= 1) {
        startYRef.current = e.touches[0].clientY;
        startXRef.current = e.touches[0].clientX;
        isAtTopRef.current = true;
        hasTriggeredHapticRef.current = false;
      } else {
        isAtTopRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isAtTopRef.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - startYRef.current;
      const deltaX = currentX - startXRef.current;

      // Ignore horizontal swipes
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaY < 20) {
        return;
      }

      const scrollTop = getScrollTop();
      if (scrollTop <= 1 && deltaY > 0) {
        setIsDragging(true);

        // Elastic damping formula
        const dampedDistance = Math.min(Math.pow(deltaY, 0.85) * 1.5, MAX_PULL);
        setPullDistance(dampedDistance);

        // Haptic pulse when threshold is reached
        if (dampedDistance >= PULL_THRESHOLD && !hasTriggeredHapticRef.current) {
          hasTriggeredHapticRef.current = true;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(12);
          }
        } else if (dampedDistance < PULL_THRESHOLD) {
          hasTriggeredHapticRef.current = false;
        }

        // Prevent native overscroll fighting
        if (e.cancelable && dampedDistance > 10) {
          e.preventDefault();
        }
      } else {
        setIsDragging(false);
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (!isAtTopRef.current || isRefreshing) return;
      isAtTopRef.current = false;
      setIsDragging(false);

      if (pullDistance >= PULL_THRESHOLD) {
        executeRefresh();
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchCancel = () => {
      isAtTopRef.current = false;
      setIsDragging(false);
      if (!isRefreshing) {
        setPullDistance(0);
      }
    };

    // Attach to element or document with passive: false so preventDefault() works smoothly
    targetElement.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    targetElement.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
    targetElement.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });
    targetElement.addEventListener('touchcancel', handleTouchCancel as EventListener, { passive: true });

    return () => {
      targetElement.removeEventListener('touchstart', handleTouchStart as EventListener);
      targetElement.removeEventListener('touchmove', handleTouchMove as EventListener);
      targetElement.removeEventListener('touchend', handleTouchEnd as EventListener);
      targetElement.removeEventListener('touchcancel', handleTouchCancel as EventListener);
    };
  }, [containerRef, disabled, executeRefresh, getScrollTop, isRefreshing, pullDistance]);

  const rotationDeg = Math.min((pullDistance / PULL_THRESHOLD) * 180, 180);
  const isReady = pullDistance >= PULL_THRESHOLD;

  return (
    <div className="relative w-full min-h-full">
      {/* Pull To Refresh Floating Indicator */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-50 flex items-center justify-center overflow-visible"
        style={{
          transform: `translateY(${pullDistance > 0 || isRefreshing ? pullDistance - 44 : -60}px)`,
          opacity: pullDistance > 10 || isRefreshing ? 1 : 0,
          transition: isDragging
            ? 'none'
            : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
        }}
        aria-live="polite"
      >
        <div className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 shadow-lg shadow-blue-900/10 border border-slate-200/90 backdrop-blur-md">
          {isSuccess ? (
            <>
              <Check className="h-4 w-4 text-emerald-600 stroke-[2.5]" />
              <span className="text-xs font-bold text-emerald-600">تم التحديث بنجاح</span>
            </>
          ) : isRefreshing ? (
            <>
              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="text-xs font-bold text-blue-600">جاري تحديث البيانات...</span>
            </>
          ) : isReady ? (
            <>
              <RefreshCw className="h-4 w-4 text-blue-600 rotate-180 transition-transform duration-200" />
              <span className="text-xs font-bold text-blue-600">أفلت للتحديث الآن</span>
            </>
          ) : (
            <>
              <ArrowDown
                className="h-4 w-4 text-slate-500 transition-transform duration-100"
                style={{ transform: `rotate(${rotationDeg}deg)` }}
              />
              <span className="text-xs font-medium text-slate-600">اسحب للأسفل للتحديث</span>
            </>
          )}
        </div>
      </div>

      {/* Content wrapper with smooth spring translateY */}
      <div
        style={{
          transform: `translateY(${pullDistance > 0 ? pullDistance * 0.75 : 0}px)`,
          transition: isDragging
            ? 'none'
            : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="min-h-full"
      >
        {children}
      </div>
    </div>
  );
}
