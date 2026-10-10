import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/api/query-keys';
import { testimonialsApi } from '@/features/testimonials/api/testimonials.api';

export interface PublicCenterItem {
  gradeLevel: string;
  schedules: any[];
  [key: string]: any;
}

export interface PublicCatalogFilters {
  academicStage?: string;
  gradeLevel?: string;
  limit?: number;
}

/**
 * Hook to fetch public center schedules with client-side caching
 * GET /schedules/public/centers
 */
export function usePublicCenters() {
  return useQuery<PublicCenterItem[]>({
    queryKey: QUERY_KEYS.public.centers(),
    queryFn: async () => {
      const res = await apiClient<any>(API_ENDPOINTS.SCHEDULES.PUBLIC_CENTERS);
      return res?.data || res || [];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000,    // 60 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch approved public student testimonials with client-side caching
 * GET /testimonials/public
 */
export function usePublicTestimonials() {
  return useQuery({
    queryKey: QUERY_KEYS.public.testimonials(),
    queryFn: () => testimonialsApi.getPublic(),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000,    // 60 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch public online courses catalog with client-side caching
 * GET /courses/catalog
 */
export function usePublicCatalog(filters?: PublicCatalogFilters) {
  return useQuery({
    queryKey: QUERY_KEYS.public.catalog(filters),
    queryFn: async () => {
      const params: Record<string, any> = { limit: filters?.limit ?? 20 };
      if (filters?.academicStage && filters.academicStage !== 'ALL') {
        params.academicStage = filters.academicStage;
      }
      if (filters?.gradeLevel && filters.gradeLevel !== 'ALL') {
        params.gradeLevel = filters.gradeLevel;
      }
      const res = await apiClient<any>(API_ENDPOINTS.COURSES.CATALOG, { params });
      return res?.data || res || [];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000,    // 60 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch public landing page site settings with client-side caching
 * GET /site-settings/public (or /settings/site fallback)
 */
export function useSiteSettings() {
  return useQuery({
    queryKey: QUERY_KEYS.public.siteSettings(),
    queryFn: async () => {
      try {
        const res = await apiClient<any>(API_ENDPOINTS.SITE_SETTINGS.PUBLIC);
        return res?.data ?? res ?? {};
      } catch {
        try {
          const res = await apiClient<any>('/settings/site');
          return res?.data ?? res ?? {};
        } catch {
          return {};
        }
      }
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000,    // 60 minutes
    refetchOnWindowFocus: false,
  });
}
