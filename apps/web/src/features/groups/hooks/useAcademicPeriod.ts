'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { APP_CONFIG } from '@/config/app.config';
import { Group } from '../types/groups.types';

export const STORAGE_YEAR_KEY = 'el_awal_default_academic_year';
export const STORAGE_TERM_KEY = 'el_awal_default_academic_term';

export interface AcademicPeriodResponse {
  activeAcademicYear: string;
  activeAcademicTerm: string;
}

import { offlineDb } from '@/lib/offline/db';

/**
 * Fetch academic period directly from database or offline IndexedDB store
 */
export async function fetchAcademicPeriod(): Promise<AcademicPeriodResponse> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) {
    const cached = await offlineDb.getMetadata<AcademicPeriodResponse>('academicPeriod');
    if (cached?.activeAcademicYear) {
      return cached;
    }
  }

  try {
    const res = await apiClient<AcademicPeriodResponse>(API_ENDPOINTS.TEACHER.ACADEMIC_PERIOD);
    if (res?.activeAcademicYear) {
      await offlineDb.setMetadata('academicPeriod', res);
    }
    return res;
  } catch {
    const cached = await offlineDb.getMetadata<AcademicPeriodResponse>('academicPeriod');
    if (cached?.activeAcademicYear) {
      return cached;
    }
    return {
      activeAcademicYear: DEFAULT_ACADEMIC_YEAR,
      activeAcademicTerm: DEFAULT_ACADEMIC_TERM,
    };
  }
}

/**
 * Save academic period directly to database
 */
export async function updateAcademicPeriodInDb(payload: {
  activeAcademicYear: string;
  activeAcademicTerm: string;
}): Promise<AcademicPeriodResponse> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) {
    await offlineDb.setMetadata('academicPeriod', payload);
    return payload;
  }

  const res = await apiClient<AcademicPeriodResponse>(API_ENDPOINTS.TEACHER.ACADEMIC_PERIOD, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  if (res?.activeAcademicYear) {
    await offlineDb.setMetadata('academicPeriod', res);
  }
  return res;
}

/**
 * Static baseline fallback constants (no date calculations)
 */
export const DEFAULT_ACADEMIC_YEAR = APP_CONFIG.defaultAcademicYear || '2026-2027';
export const DEFAULT_ACADEMIC_TERM = 'FIRST_TERM';

export function getDefaultAcademicYear(): string {
  return DEFAULT_ACADEMIC_YEAR;
}

export function getDefaultAcademicTerm(): string {
  return DEFAULT_ACADEMIC_TERM;
}

/**
 * Primary Hook to read, persist, and synchronize the active academic year & semester in the Database.
 * The database (teacher_profiles table) is the authoritative source of truth.
 */
export function useStoredAcademicPeriod(groups?: Group[]) {
  const queryClient = useQueryClient();

  // 1. Fetch persistent preference directly from database with automatic periodic background synchronization & focus refetch
  const { data: dbPeriod, isLoading: isLoadingDb } = useQuery({
    queryKey: ['teacher', 'academic-period'],
    queryFn: fetchAcademicPeriod,
    staleTime: 10000,
    refetchInterval: () => (typeof navigator !== 'undefined' && !navigator.onLine ? false : 30000),
    refetchOnWindowFocus: typeof navigator !== 'undefined' ? navigator.onLine : true,
    retry: 1,
    networkMode: 'offlineFirst',
  });

  // Local state initialized with cached / stored / default value
  const [selectedYears, setSelectedYearsState] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [DEFAULT_ACADEMIC_YEAR];
    try {
      const stored = localStorage.getItem(STORAGE_YEAR_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [DEFAULT_ACADEMIC_YEAR];
  });

  const [selectedTerms, setSelectedTermsState] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [DEFAULT_ACADEMIC_TERM];
    try {
      const stored = localStorage.getItem(STORAGE_TERM_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [DEFAULT_ACADEMIC_TERM];
  });

  // 2. Mutation to persist changes directly to database
  const mutation = useMutation({
    mutationFn: updateAcademicPeriodInDb,
    onSuccess: (data) => {
      queryClient.setQueryData(['teacher', 'academic-period'], data);
      queryClient.invalidateQueries({ queryKey: ['teacher'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['content'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  // When database data arrives or updates from background sync, prioritize database over local cache
  useEffect(() => {
    if (dbPeriod?.activeAcademicYear) {
      setSelectedYearsState([dbPeriod.activeAcademicYear]);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_YEAR_KEY, JSON.stringify([dbPeriod.activeAcademicYear]));
          window.dispatchEvent(new Event('el_awal_academic_period_changed'));
        } catch {}
      }
    }
    if (dbPeriod?.activeAcademicTerm) {
      setSelectedTermsState([dbPeriod.activeAcademicTerm]);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_TERM_KEY, JSON.stringify([dbPeriod.activeAcademicTerm]));
          window.dispatchEvent(new Event('el_awal_academic_period_changed'));
        } catch {}
      }
    }
  }, [dbPeriod?.activeAcademicYear, dbPeriod?.activeAcademicTerm]);

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
    setSelectedYearsState(years);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_YEAR_KEY, JSON.stringify(years));
        window.dispatchEvent(new Event('el_awal_academic_period_changed'));
      } catch (err) {
        console.error('Failed to save academic years locally:', err);
      }
    }

    // Persist directly to database
    if (years.length === 1) {
      const currentTerm = selectedTerms.length === 1 ? selectedTerms[0] : (dbPeriod?.activeAcademicTerm || DEFAULT_ACADEMIC_TERM);
      mutation.mutate({
        activeAcademicYear: years[0],
        activeAcademicTerm: currentTerm,
      });
    }
  };

  const setSelectedTerms = (terms: string[]) => {
    setSelectedTermsState(terms);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_TERM_KEY, JSON.stringify(terms));
        window.dispatchEvent(new Event('el_awal_academic_period_changed'));
      } catch (err) {
        console.error('Failed to save academic terms locally:', err);
      }
    }

    // Persist directly to database
    if (terms.length === 1) {
      const currentYear = selectedYears.length === 1 ? selectedYears[0] : (dbPeriod?.activeAcademicYear || DEFAULT_ACADEMIC_YEAR);
      mutation.mutate({
        activeAcademicYear: currentYear,
        activeAcademicTerm: terms[0],
      });
    }
  };

  const activeYear = dbPeriod?.activeAcademicYear || selectedYears[0] || DEFAULT_ACADEMIC_YEAR;
  const activeTerm = dbPeriod?.activeAcademicTerm || selectedTerms[0] || DEFAULT_ACADEMIC_TERM;

  return {
    selectedYears,
    setSelectedYears,
    selectedTerms,
    setSelectedTerms,
    activeYear,
    activeTerm,
    dbPeriod,
    isLoading: isLoadingDb,
    isSyncingWithDb: mutation.isPending,
  };
}

/**
 * Alias for useStoredAcademicPeriod for backwards/clean imports
 */
export const useAcademicPeriod = useStoredAcademicPeriod;
