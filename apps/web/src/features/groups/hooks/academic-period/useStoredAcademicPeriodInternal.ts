'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Group } from '../../types/groups.types';
import { offlineDb } from '@/lib/offline/db';
import { bootstrapManager } from '@/lib/offline/bootstrap-manager';
import {
  STORAGE_YEAR_KEY,
  STORAGE_TERM_KEY,
  DEFAULT_ACADEMIC_YEAR,
  DEFAULT_ACADEMIC_TERM,
  fetchAcademicPeriod,
  updateAcademicPeriodInDb,
  switchAcademicPeriodInDb,
  getStoredAcademicPeriod,
} from './academic-period.api';

/**
 * Hook to fetch active academic period with client-side caching
 * GET /academic-periods/active (or /teachers/academic-period)
 */
export function useActiveAcademicPeriod() {
  return useQuery({
    queryKey: ['teacher', 'academic-period'],
    queryFn: fetchAcademicPeriod,
    initialData: getStoredAcademicPeriod,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - academic period changes at most twice a year!
    gcTime: 7 * 24 * 60 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 1,
    networkMode: 'offlineFirst',
  });
}

export function useStoredAcademicPeriod(groups?: Group[]) {
  const queryClient = useQueryClient();

  // 1. Fetch persistent preference directly from database (cached for 24 hours without polling)
  const { data: dbPeriod, isLoading: isLoadingDb } = useQuery({
    queryKey: ['teacher', 'academic-period'],
    queryFn: fetchAcademicPeriod,
    initialData: getStoredAcademicPeriod,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours cache
    gcTime: 7 * 24 * 60 * 60 * 1000,
    refetchInterval: false, // Disabled: mutations already invalidate this query
    refetchOnWindowFocus: false,
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

  // 2b. Password-gated switch mutation with full period re-hydration.
  const switchMutation = useMutation({
    mutationFn: switchAcademicPeriodInDb,
    onSuccess: async (data, variables) => {
      const nextYear = data?.activeAcademicYear || variables.academicYear;
      const nextTerm = data?.activeAcademicTerm || variables.academicTerm;

      setSelectedYearsState([nextYear]);
      setSelectedTermsState([nextTerm]);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_YEAR_KEY, JSON.stringify([nextYear]));
          localStorage.setItem(STORAGE_TERM_KEY, JSON.stringify([nextTerm]));
          window.dispatchEvent(new Event('el_awal_academic_period_changed'));
        } catch {}
      }

      queryClient.setQueryData(['teacher', 'academic-period'], {
        activeAcademicYear: nextYear,
        activeAcademicTerm: nextTerm,
      });
      await offlineDb.setMetadata('academicPeriod', {
        activeAcademicYear: nextYear,
        activeAcademicTerm: nextTerm,
      });

      // Clear only the period-scoped caches (roster/students/groups/sessions);
      await offlineDb.clearPeriodScopedData();

      // Re-download the full workspace for the newly selected period.
      await bootstrapManager.performBootstrap({ forceFull: true, skipCooldown: true, queryClient });

      // Recompute every dependent view.
      queryClient.invalidateQueries();
    },
  });

  // When database data arrives or updates from background sync, prioritize database over local cache
  useEffect(() => {
    if (dbPeriod?.activeAcademicYear) {
      setSelectedYearsState((prev) => {
        if (prev.includes(dbPeriod.activeAcademicYear)) return prev;
        return [dbPeriod.activeAcademicYear];
      });
      if (typeof window !== 'undefined') {
        try {
          const currentStored = localStorage.getItem(STORAGE_YEAR_KEY);
          let alreadyIncludes = false;
          if (currentStored) {
            const parsed = JSON.parse(currentStored);
            if (Array.isArray(parsed) && parsed.includes(dbPeriod.activeAcademicYear)) {
              alreadyIncludes = true;
            }
          }
          if (!alreadyIncludes) {
            const nextVal = JSON.stringify([dbPeriod.activeAcademicYear]);
            if (currentStored !== nextVal) {
              localStorage.setItem(STORAGE_YEAR_KEY, nextVal);
            }
          }
        } catch {}
      }
    }
    if (dbPeriod?.activeAcademicTerm) {
      setSelectedTermsState((prev) => {
        if (prev.includes(dbPeriod.activeAcademicTerm)) return prev;
        return [dbPeriod.activeAcademicTerm];
      });
      if (typeof window !== 'undefined') {
        try {
          const currentStored = localStorage.getItem(STORAGE_TERM_KEY);
          let alreadyIncludes = false;
          if (currentStored) {
            const parsed = JSON.parse(currentStored);
            if (Array.isArray(parsed) && parsed.includes(dbPeriod.activeAcademicTerm)) {
              alreadyIncludes = true;
            }
          }
          if (!alreadyIncludes) {
            const nextVal = JSON.stringify([dbPeriod.activeAcademicTerm]);
            if (currentStored !== nextVal) {
              localStorage.setItem(STORAGE_TERM_KEY, nextVal);
            }
          }
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
      const currentTerm =
        selectedTerms.length === 1 ? selectedTerms[0] : dbPeriod?.activeAcademicTerm || DEFAULT_ACADEMIC_TERM;
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
      const currentYear =
        selectedYears.length === 1 ? selectedYears[0] : dbPeriod?.activeAcademicYear || DEFAULT_ACADEMIC_YEAR;
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
    switchPeriod: switchMutation.mutateAsync,
    isSwitching: switchMutation.isPending,
  };
}

/**
 * Alias for useStoredAcademicPeriod for backwards/clean imports
 */
export const useAcademicPeriod = useStoredAcademicPeriod;
