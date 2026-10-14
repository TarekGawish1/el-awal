'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getRoleLandingRoute, hasMultipleRoles } from '@/features/auth/utils/role-routing';
import { getStoredUser } from '@/features/auth/utils/auth-tokens';

export default function PwaEntryPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuth();

  useEffect(() => {
    // Fast path: Synchronous check of stored user profile in localStorage
    const storedUser = getStoredUser();
    const effectiveUser = isInitialized && isAuthenticated && user ? user : storedUser;

    if (effectiveUser) {
      if (effectiveUser.role === 'STUDENT') {
        router.replace('/student/dashboard');
        return;
      }
      if (effectiveUser.role === 'TEACHER' || effectiveUser.role === 'SECRETARIAT') {
        router.replace('/teacher/dashboard');
        return;
      }
      if (hasMultipleRoles(effectiveUser)) {
        router.replace('/select-role');
        return;
      }
      router.replace(getRoleLandingRoute(effectiveUser.role));
      return;
    }

    // Unauthenticated visitor: redirect to login
    if (isInitialized) {
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
