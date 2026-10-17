import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { APP_CONFIG } from '@/config/app.config';
import { offlineDb } from '@/lib/offline/db';

export const STORAGE_YEAR_KEY = 'el_awal_default_academic_year';
export const STORAGE_TERM_KEY = 'el_awal_default_academic_term';

export interface AcademicPeriodResponse {
  activeAcademicYear: string;
  activeAcademicTerm: string;
}

export interface SwitchAcademicPeriodPayload {
  academicYear: string;
  academicTerm: string;
  password: string;
}

/**
 * Computes current academic term dynamically based on current date (Egyptian academic calendar):
 * - FIRST_TERM: Months 8 (August) to 1 (January)
 * - SECOND_TERM: Months 2 (February) to 7 (July)
 */
export function getCurrentAcademicTerm(now: Date = new Date()): 'FIRST_TERM' | 'SECOND_TERM' {
  const month = now.getMonth() + 1;
  return month >= 8 || month === 1 ? 'FIRST_TERM' : 'SECOND_TERM';
}

/**
 * Computes current academic year dynamically based on current date:
 * - Aug - Dec (months 8 - 12): `${year}-${year + 1}` (e.g. Sep 2026 -> '2026-2027')
 * - Jan - Jul (months 1 - 7): `${year - 1}-${year}` (e.g. Feb 2027 -> '2026-2027')
 */
export function getCurrentAcademicYear(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export const DEFAULT_ACADEMIC_YEAR = APP_CONFIG.defaultAcademicYear || getCurrentAcademicYear();
export const DEFAULT_ACADEMIC_TERM = getCurrentAcademicTerm();

export function getDefaultAcademicYear(): string {
  return DEFAULT_ACADEMIC_YEAR;
}

export function getDefaultAcademicTerm(): string {
  return DEFAULT_ACADEMIC_TERM;
}

export function getStoredAcademicPeriod(): AcademicPeriodResponse {
  const defaultYear = getCurrentAcademicYear();
  const defaultTerm = getCurrentAcademicTerm();

  if (typeof window === 'undefined') {
    return { activeAcademicYear: defaultYear, activeAcademicTerm: defaultTerm };
  }

  try {
    const rawYear = localStorage.getItem(STORAGE_YEAR_KEY);
    const rawTerm = localStorage.getItem(STORAGE_TERM_KEY);

    let year = defaultYear;
    if (rawYear) {
      const parsedYear = JSON.parse(rawYear);
      year = Array.isArray(parsedYear) ? parsedYear[0] : parsedYear || defaultYear;
    }

    let term = defaultTerm;
    if (rawTerm) {
      const parsedTerm = JSON.parse(rawTerm);
      term = Array.isArray(parsedTerm) ? parsedTerm[0] : parsedTerm || defaultTerm;
    }

    return {
      activeAcademicYear: year || defaultYear,
      activeAcademicTerm: term || defaultTerm,
    };
  } catch {
    return { activeAcademicYear: defaultYear, activeAcademicTerm: defaultTerm };
  }
}

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
 * Password-gated, online-only switch of the active academic year/term.
 */
export async function switchAcademicPeriodInDb(
  payload: SwitchAcademicPeriodPayload,
): Promise<AcademicPeriodResponse> {
  return apiClient<AcademicPeriodResponse>(API_ENDPOINTS.ACADEMIC_PERIODS.SWITCH, {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuthRefresh: true,
  });
}
