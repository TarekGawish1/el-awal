'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { getRoleLandingRoute } from '@/features/auth/utils/role-routing';

export interface UseLandingInteractionsResult {
  isMounted: boolean;
  showIntro: boolean;
  dismissIntro: () => void;
  isRedirecting: boolean;
  redirectText: string;
  scrollToSection: (sectionId: string) => void;
}

export function useLandingInteractions(): UseLandingInteractionsResult {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const [showIntro, setShowIntro] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && isInitialized && isAuthenticated && user) {
      router.replace(getRoleLandingRoute(user.role));
    }
  }, [isMounted, isInitialized, isAuthenticated, user, router]);

  const dismissIntro = useCallback(() => {
    setShowIntro(false);
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    if (sectionId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const isRedirecting = Boolean(isInitialized && isAuthenticated && user);

  return {
    isMounted,
    showIntro,
    dismissIntro,
    isRedirecting,
    redirectText: 'جاري توجيهك إلى لوحة التحكم...',
    scrollToSection,
  };
}
