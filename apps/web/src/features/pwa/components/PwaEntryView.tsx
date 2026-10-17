'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getRoleLandingRoute, hasMultipleRoles } from '@/features/auth/utils/role-routing';
import { getStoredUser } from '@/features/auth/utils/auth-tokens';

function resolveRoute(effectiveUser: ReturnType<typeof getStoredUser>): string | null {
  if (!effectiveUser) return null;
  if (effectiveUser.role === 'STUDENT') return '/student/dashboard';
  if (effectiveUser.role === 'TEACHER' || effectiveUser.role === 'SECRETARIAT') return '/teacher/dashboard';
  if (effectiveUser.role === 'PARENT') return '/parent/dashboard';
  if (hasMultipleRoles(effectiveUser)) return '/select-role';
  return getRoleLandingRoute(effectiveUser.role);
}

export function PwaEntryView() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuth();
  const didRedirect = useRef(false);

  // Fast path: synchronous localStorage check on first render
  if (typeof window !== 'undefined' && !didRedirect.current) {
    const storedUser = getStoredUser();
    const target = resolveRoute(storedUser);
    if (target) {
      didRedirect.current = true;
      window.location.replace(target);
    }
  }

  // Fallback: once auth store finishes initializing
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

    if (isInitialized) {
      didRedirect.current = true;
      router.replace('/login');
    }
  }, [isInitialized, isAuthenticated, user, router]);

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
