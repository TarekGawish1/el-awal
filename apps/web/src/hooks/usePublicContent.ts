import { useQuery, useQueryClient } from '@tanstack/react-query';
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

export interface LandingBundleData {
  centers: PublicCenterItem[];
  catalog: any[];
  testimonials: any[];
  siteSettings: Record<string, any>;
  certificates: any[];
}

/**
 * Hook to fetch all landing page public content in a single consolidated request.
 * Reduces 5 separate HTTP roundtrips (centers, catalog, testimonials, site-settings, certificates)
 * down to just 1 request (/site-settings/public/landing-data).
 */
export function useLandingBundle() {
  const queryClient = useQueryClient();

  return useQuery<LandingBundleData>({
    queryKey: QUERY_KEYS.public.landingBundle(),
    queryFn: async () => {
      const res = await apiClient<any>(API_ENDPOINTS.SITE_SETTINGS.LANDING_DATA);
      const data: LandingBundleData = res?.centers ? res : (res?.data || {
        centers: [],
        catalog: [],
        testimonials: [],
        siteSettings: {},
        certificates: [],
      });

      if (Array.isArray(data.centers)) {
        queryClient.setQueryData(QUERY_KEYS.public.centers(), data.centers);
      }
      if (Array.isArray(data.catalog)) {
        queryClient.setQueryData(
          QUERY_KEYS.public.catalog({ academicStage: 'ALL', gradeLevel: 'ALL', limit: 20 }),
          data.catalog
        );
        queryClient.setQueryData(QUERY_KEYS.public.catalog({ limit: 20 }), data.catalog);
        queryClient.setQueryData(QUERY_KEYS.public.catalog(), data.catalog);
      }
      if (Array.isArray(data.testimonials)) {
        queryClient.setQueryData(QUERY_KEYS.public.testimonials(), data.testimonials);
      }
      if (data.siteSettings) {
        queryClient.setQueryData(QUERY_KEYS.public.siteSettings(), data.siteSettings);
      }
      if (Array.isArray(data.certificates)) {
        queryClient.setQueryData(QUERY_KEYS.public.certificates(), data.certificates);
      }

      return data;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000,    // 60 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch public center schedules with client-side caching
 * GET /schedules/public/centers (fallback if bundle not loaded)
 */
export function usePublicCenters() {
  const bundle = useLandingBundle();

  const individualQuery = useQuery<PublicCenterItem[]>({
    queryKey: QUERY_KEYS.public.centers(),
    queryFn: async () => {
      const res = await apiClient<any>(API_ENDPOINTS.SCHEDULES.PUBLIC_CENTERS);
      return res?.data || res || [];
    },
    // Only dispatch standalone request if bundle has finished and produced no data
    enabled: !bundle.isLoading && !bundle.data?.centers,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const data = bundle.data?.centers ?? individualQuery.data ?? [];
  const isLoading = (bundle.isLoading && !bundle.data) || (individualQuery.isLoading && !bundle.data?.centers);

  return {
    ...individualQuery,
    data,
    isLoading,
  };
}

/**
 * Hook to fetch approved public student testimonials with client-side caching
 * GET /testimonials/public (fallback if bundle not loaded)
 */
export function usePublicTestimonials() {
  const bundle = useLandingBundle();

  const individualQuery = useQuery({
    queryKey: QUERY_KEYS.public.testimonials(),
    queryFn: () => testimonialsApi.getPublic(),
    // Only dispatch standalone request if bundle has finished and produced no data
    enabled: !bundle.isLoading && !bundle.data?.testimonials,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const data = bundle.data?.testimonials ?? individualQuery.data ?? [];
  const isLoading = (bundle.isLoading && !bundle.data) || (individualQuery.isLoading && !bundle.data?.testimonials);

  return {
    ...individualQuery,
    data,
    isLoading,
  };
}

/**
 * Hook to fetch public online courses catalog with client-side caching
 * GET /courses/catalog
 */
export function usePublicCatalog(filters?: PublicCatalogFilters) {
  const bundle = useLandingBundle();

  const isDefaultFilters =
    (!filters?.academicStage || filters.academicStage === 'ALL') &&
    (!filters?.gradeLevel || filters.gradeLevel === 'ALL') &&
    (filters?.limit === undefined || filters.limit === 20);

  const individualQuery = useQuery({
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
    // For default initial landing page view, rely on the consolidated bundle.
    // For custom filter selections (stage/grade filter change), fetch individually.
    enabled: isDefaultFilters ? (!bundle.isLoading && !bundle.data?.catalog) : true,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const data = isDefaultFilters && bundle.data?.catalog ? bundle.data.catalog : (individualQuery.data ?? []);
  const isLoading = isDefaultFilters
    ? ((bundle.isLoading && !bundle.data) || (individualQuery.isLoading && !bundle.data?.catalog))
    : individualQuery.isLoading;

  return {
    ...individualQuery,
    data,
    isLoading,
  };
}

/**
 * Hook to fetch public landing page site settings with client-side caching
 * GET /site-settings/public (or /settings/site fallback)
 */
export function useSiteSettings() {
  const bundle = useLandingBundle();

  const individualQuery = useQuery({
    queryKey: QUERY_KEYS.public.siteSettings(),
    queryFn: async () => {
      try {
        const res = await apiClient<any>(API_ENDPOINTS.SITE_SETTINGS.PUBLIC);
        return res?.data ?? res ?? {};
      } catch {
        return {};
      }
    },
    // Only dispatch standalone request if bundle has finished and produced no data
    enabled: !bundle.isLoading && !bundle.data?.siteSettings,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const data = bundle.data?.siteSettings ?? individualQuery.data ?? {};
  const isLoading = (bundle.isLoading && !bundle.data) || (individualQuery.isLoading && !bundle.data?.siteSettings);

  return {
    ...individualQuery,
    data,
    isLoading,
  };
}

/**
 * Hook to fetch public student certificates with client-side caching
 * GET /certificates/public
 */
export function usePublicCertificates() {
  const bundle = useLandingBundle();

  const individualQuery = useQuery<any[]>({
    queryKey: QUERY_KEYS.public.certificates(),
    queryFn: async () => {
      try {
        const res = await apiClient<any>(API_ENDPOINTS.CERTIFICATES.PUBLIC);
        return res?.data || (Array.isArray(res) ? res : []);
      } catch (err) {
        console.warn('Failed to fetch public certificates:', err);
        return [];
      }
    },
    // Only dispatch standalone request if bundle has finished and produced no data
    enabled: !bundle.isLoading && !bundle.data?.certificates,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const data = bundle.data?.certificates ?? individualQuery.data ?? [];
  const isLoading = (bundle.isLoading && !bundle.data) || (individualQuery.isLoading && !bundle.data?.certificates);

  return {
    ...individualQuery,
    data,
    isLoading,
  };
}

