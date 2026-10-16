'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getRoleLandingRoute, hasMultipleRoles } from '@/features/auth/utils/role-routing';
import { getStoredUser } from '@/features/auth/utils/auth-tokens';

/**
 * Resolves the dashboard route from a user object (same logic as before).
 */
function resolveRoute(effectiveUser: ReturnType<typeof getStoredUser>): string | null {
  if (!effectiveUser) return null;
  if (effectiveUser.role === 'STUDENT') return '/student/dashboard';
  if (effectiveUser.role === 'TEACHER' || effectiveUser.role === 'SECRETARIAT') return '/teacher/dashboard';
  if (effectiveUser.role === 'PARENT') return '/parent/dashboard';
  if (hasMultipleRoles(effectiveUser)) return '/select-role';
  return getRoleLandingRoute(effectiveUser.role);
}

export default function PwaEntryPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuth();
  const didRedirect = useRef(false);

  // ── Fast path: synchronous localStorage check on first render ──
  // Runs before any async auth initialization. If a user profile exists in
  // localStorage we can navigate immediately without waiting for useEffect.
  if (typeof window !== 'undefined' && !didRedirect.current) {
    const storedUser = getStoredUser();
    const target = resolveRoute(storedUser);
    if (target) {
      didRedirect.current = true;
      // Use location.replace to avoid a history entry for the splash page.
      window.location.replace(target);
    }
  }

  // ── Fallback: once auth store finishes initializing ──
  // Handles the case where localStorage was cleared (logged-out) or the fast
  // path ran on the server.
  useEffect(() => {
    if (didRedirect.current) return;

    const storedUser = getStoredUser();
    const effectiveUser = isInitialized && isAuthenticated && user ? user : storedUser;
    const target = resolveRoute(effectiveUser);

    if (target) {
      didRedirect.current = true;
      router.replace(target);
      return;
    }

    // No stored user at all — redirect to login once auth is ready
    if (isInitialized) {
      didRedirect.current = true;
      router.replace('/login');
    }
  }, [isInitialized, isAuthenticated, user, router]);

  // Minimal splash kept intentionally short (only shows if localStorage is empty)
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center py-6 px-4">
      <div className="w-full max-w-md flex flex-col items-center justify-center space-y-4 text-center">
        <div className="inline-flex p-3.5 bg-primary-600 text-white rounded-2xl shadow-md ring-4 ring-primary-100 animate-pulse">
          <GraduationCap className="w-10 h-10" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
            منصة الأول التعليمية
          </h1>
          <p className="text-xs sm:text-sm font-medium text-neutral-500">
            جاري فتح المنصة...
          </p>
        </div>
      </div>
    </div>
  );
}
