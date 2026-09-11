'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView, isLandingPath } from '@/lib/analytics/tracker';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useActivityTracker } from '@/features/analytics/hooks/useActivityTracker';

export function AnalyticsTracker() {
  useActivityTracker();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPathRef = useRef<string | null>(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!pathname) return;

    // Compose full relative path with query parameters if present
    const queryString = searchParams?.toString();
    const fullPath = queryString ? `${pathname}?${queryString}` : pathname;

    // Prevent immediate duplicate fires on re-renders for identical path
    if (lastTrackedPathRef.current === fullPath) {
      return;
    }
    lastTrackedPathRef.current = fullPath;

    // Determine tenant context from authenticated user if available
    const tenantId = user?.teacherProfileId || (user?.role === 'TEACHER' ? user.id : undefined);

    // Fire non-blocking page view telemetry
    trackPageView({
      path: pathname,
      isLandingPage: isLandingPath(pathname),
      tenantId,
      metadata: {
        query: queryString || undefined,
        userRole: user?.role,
      },
    });
  }, [pathname, searchParams, user]);

  return null;
}
