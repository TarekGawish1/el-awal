import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

export function useSavedLocations() {
  const queryClient = useQueryClient();
  const queryKey = ['teacher-saved-locations'];

  const { data: savedLocations = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const data = await apiClient<string[]>(API_ENDPOINTS.TEACHER.SAVED_LOCATIONS);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { mutateAsync: updateLocations } = useMutation({
    mutationFn: async (locations: string[]) => {
      const data = await apiClient<string[]>(API_ENDPOINTS.TEACHER.SAVED_LOCATIONS, {
        method: 'PUT',
        body: JSON.stringify({ locations }),
      });
      return data;
    },
    onSuccess: (newLocations) => {
      queryClient.setQueryData(queryKey, newLocations);
    },
  });

  const addLocation = async (location: string) => {
    const trimmed = location.trim();
    if (!trimmed || savedLocations.includes(trimmed)) return;
    const newLocations = [...savedLocations, trimmed];
    await updateLocations(newLocations);
  };

  const removeLocation = async (location: string) => {
    const newLocations = savedLocations.filter((l: string) => l !== location);
    await updateLocations(newLocations);
  };

  return {
    savedLocations,
    isLoading,
    addLocation,
    removeLocation,
  };
}
