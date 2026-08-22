import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBookletsApi,
  createBookletApi,
  updateBookletApi,
  deleteBookletApi,
} from '../api';
import { CreateBookletInput, UpdateBookletInput, Booklet } from '../types';
import { offlineDb } from '../../../lib/offline/db';

export function useBooklets(query?: {
  gradeLevel?: string;
  groupId?: string;
  isActive?: boolean;
}) {
  const queryClient = useQueryClient();

  const bookletsQuery = useQuery<Booklet[]>({
    queryKey: ['booklets', query],
    queryFn: async (): Promise<Booklet[]> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return (await offlineDb.getBookletsOffline(query)) as unknown as Booklet[];
      }

      try {
        const list = await fetchBookletsApi(query);
        if (list && list.length > 0) {
          await offlineDb.bulkPutBooklets(list as any);
        }
        return list;
      } catch (err) {
        console.warn('Failed to fetch booklets from API, falling back to offline IndexedDB:', err);
        return (await offlineDb.getBookletsOffline(query)) as unknown as Booklet[];
      }
    },
    networkMode: 'offlineFirst',
    staleTime: 1000 * 60 * 3, // 3 minutes
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateBookletInput) => {
      try {
        return await createBookletApi(input);
      } catch (error) {
        // In offline mode, create locally in IndexedDB and queue outbox mutation
        const tempId = `bkt-offline-${Date.now()}`;
        const localBooklet: Booklet = {
          id: tempId,
          title: input.title,
          price: input.price,
          gradeLevel: input.gradeLevel,
          groupId: input.groupId || null,
          stockCount: input.stockCount || null,
          academicYear: input.academicYear || '2026-2027',
          academicTerm: input.academicTerm || 'FIRST_TERM',
          isActive: true,
          salesCount: 0,
          totalRevenue: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await offlineDb.putBooklet(localBooklet as any);

        await offlineDb.enqueueMutation({
          id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          domain: 'finance',
          endpoint: '/booklets',
          method: 'POST',
          payload: input,
          optimisticId: tempId,
          status: 'PENDING',
          retryCount: 0,
          clientTimestamp: Date.now(),
        });

        return localBooklet;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booklets'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateBookletInput }) => {
      try {
        return await updateBookletApi(id, input);
      } catch (error) {
        const existing = await offlineDb.getBookletByIdOffline(id);
        if (existing) {
          const updated = { ...existing, ...input, updatedAt: new Date().toISOString() };
          await offlineDb.putBooklet(updated as any);
        }

        await offlineDb.enqueueMutation({
          id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          domain: 'finance',
          endpoint: `/booklets/${id}`,
          method: 'PATCH',
          payload: input,
          status: 'PENDING',
          retryCount: 0,
          clientTimestamp: Date.now(),
        });

        return existing as Booklet;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booklets'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        return await deleteBookletApi(id);
      } catch (error) {
        await offlineDb.removeBooklet(id);

        await offlineDb.enqueueMutation({
          id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          domain: 'finance',
          endpoint: `/booklets/${id}`,
          method: 'DELETE',
          payload: { id },
          status: 'PENDING',
          retryCount: 0,
          clientTimestamp: Date.now(),
        });

        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booklets'] });
    },
  });

  return {
    booklets: bookletsQuery.data || [],
    isLoading: bookletsQuery.isLoading,
    isError: bookletsQuery.isError,
    error: bookletsQuery.error,
    refetch: bookletsQuery.refetch,
    createBooklet: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateBooklet: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteBooklet: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
