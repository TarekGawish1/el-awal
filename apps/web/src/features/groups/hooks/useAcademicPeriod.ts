'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { Group } from '../types/groups.types';

export const STORAGE_YEAR_KEY = 'el_awal_default_academic_year';
export const STORAGE_TERM_KEY = 'el_awal_default_academic_term';

export interface AcademicPeriodResponse {
  activeAcademicYear: string;
  activeAcademicTerm: string;
}

/**
 * Fetch academic period from database
 */
export async function fetchAcademicPeriod(): Promise<AcademicPeriodResponse> {
  return apiClient<AcademicPeriodResponse>(API_ENDPOINTS.TEACHER.ACADEMIC_PERIOD);
}

/**
 * Save academic period to database
 */
export async function updateAcademicPeriodInDb(payload: {
  activeAcademicYear: string;
  activeAcademicTerm: string;
}): Promise<AcademicPeriodResponse> {
  return apiClient<AcademicPeriodResponse>(API_ENDPOINTS.TEACHER.ACADEMIC_PERIOD, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Calculates current default academic year based on calendar date (e.g. 2025-2026).
 */
export function getDefaultAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  if (month >= 8) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

/**
 * Calculates current default academic semester based on calendar month.
 */
export function getDefaultAcademicTerm(): string {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  if (month >= 8 || month === 1) {
    return 'FIRST_TERM';
  } else {
    return 'SECOND_TERM';
  }
}

/**
 * Hook to read, persist, and synchronize the active academic year & semester with the Database.
 */
export function useStoredAcademicPeriod(groups?: Group[]) {
  const queryClient = useQueryClient();
  const [hasUserChanged, setHasUserChanged] = useState(false);

  // 1. Fetch persistent preference from database
  const { data: dbPeriod } = useQuery({
    queryKey: ['teacher', 'academic-period'],
    queryFn: fetchAcademicPeriod,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // 2. Mutation to persist to database
  const mutation = useMutation({
    mutationFn: updateAcademicPeriodInDb,
    onSuccess: (data) => {
      queryClient.setQueryData(['teacher', 'academic-period'], data);
    },
  });

  const [selectedYears, setSelectedYearsState] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_YEAR_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [selectedTerms, setSelectedTermsState] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_TERM_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Sync DB values when loaded if user has not interacted yet
  useEffect(() => {
    if (dbPeriod && !hasUserChanged) {
      if (dbPeriod.activeAcademicYear && selectedYears.length === 0) {
        setSelectedYearsState([dbPeriod.activeAcademicYear]);
      }
      if (dbPeriod.activeAcademicTerm && selectedTerms.length === 0) {
        setSelectedTermsState([dbPeriod.activeAcademicTerm]);
      }
    }
  }, [dbPeriod, hasUserChanged, selectedYears.length, selectedTerms.length]);

  // Smart fallback resolution from actual groups if neither DB nor user preference exists
  useEffect(() => {
    if (hasUserChanged || !groups || groups.length === 0) return;

    const storedYear = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_YEAR_KEY) : null;
    const storedTerm = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_TERM_KEY) : null;

    if (!storedYear && !dbPeriod?.activeAcademicYear && selectedYears.length === 0) {
      const yearCounts: Record<string, number> = {};
      groups.forEach((g) => {
        if (g.academicYear) {
          yearCounts[g.academicYear] = (yearCounts[g.academicYear] || 0) + 1;
        }
      });
      const groupYears = Object.keys(yearCounts).sort((a, b) => yearCounts[b] - yearCounts[a]);
      const resolvedYear = groupYears[0] || getDefaultAcademicYear();
      setSelectedYearsState([resolvedYear]);
    }

    if (!storedTerm && !dbPeriod?.activeAcademicTerm && selectedTerms.length === 0) {
      const termCounts: Record<string, number> = {};
      groups.forEach((g) => {
        if (g.academicTerm) {
          termCounts[g.academicTerm] = (termCounts[g.academicTerm] || 0) + 1;
        }
      });
      const groupTerms = Object.keys(termCounts).sort((a, b) => termCounts[b] - termCounts[a]);
      const resolvedTerm = groupTerms[0] || getDefaultAcademicTerm();
      setSelectedTermsState([resolvedTerm]);
    }
  }, [groups, dbPeriod, hasUserChanged, selectedYears.length, selectedTerms.length]);

  // Cross-component and cross-tab synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSync = () => {
      try {
        const storedY = localStorage.getItem(STORAGE_YEAR_KEY);
        if (storedY) {
          const parsed = JSON.parse(storedY);
          if (Array.isArray(parsed)) setSelectedYearsState(parsed);
        }
        const storedT = localStorage.getItem(STORAGE_TERM_KEY);
        if (storedT) {
          const parsed = JSON.parse(storedT);
          if (Array.isArray(parsed)) setSelectedTermsState(parsed);
        }
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('el_awal_academic_period_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('el_awal_academic_period_changed', handleSync);
    };
  }, []);

  const setSelectedYears = (years: string[]) => {
    setHasUserChanged(true);
    setSelectedYearsState(years);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_YEAR_KEY, JSON.stringify(years));
        window.dispatchEvent(new Event('el_awal_academic_period_changed'));
      } catch (err) {
        console.error('Failed to save academic years locally:', err);
      }
    }

    // Persist to database if single year selected
    if (years.length === 1) {
      const currentTerm = selectedTerms.length === 1 ? selectedTerms[0] : (dbPeriod?.activeAcademicTerm || 'FIRST_TERM');
      mutation.mutate({
        activeAcademicYear: years[0],
        activeAcademicTerm: currentTerm,
      });
    }
  };

  const setSelectedTerms = (terms: string[]) => {
    setHasUserChanged(true);
    setSelectedTermsState(terms);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_TERM_KEY, JSON.stringify(terms));
        window.dispatchEvent(new Event('el_awal_academic_period_changed'));
      } catch (err) {
        console.error('Failed to save academic terms locally:', err);
      }
    }

    // Persist to database if single term selected
    if (terms.length === 1) {
      const currentYear = selectedYears.length === 1 ? selectedYears[0] : (dbPeriod?.activeAcademicYear || '2025-2026');
      mutation.mutate({
        activeAcademicYear: currentYear,
        activeAcademicTerm: terms[0],
      });
    }
  };

  const activeYear = selectedYears[0] || dbPeriod?.activeAcademicYear || '2025-2026';
  const activeTerm = selectedTerms[0] || dbPeriod?.activeAcademicTerm || 'FIRST_TERM';

  return {
    selectedYears,
    setSelectedYears,
    selectedTerms,
    setSelectedTerms,
    activeYear,
    activeTerm,
    dbPeriod,
    isSyncingWithDb: mutation.isPending,
  };
}
