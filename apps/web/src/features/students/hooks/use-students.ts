import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchStudents,
  fetchStudentById,
  fetchStudentQrCode,
  createStudent,
  regenerateStudentQrToken,
} from '../api/students.api';
import { StudentQuery, CreateStudentPayload } from '../types/students.types';
import { offlineDb } from '@/lib/offline/db';

export function useStudents(query: StudentQuery) {
  return useQuery({
    queryKey: ['students', query],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const offlineList = await offlineDb.getStudentsOffline({
          search: query.search,
          groupId: query.groupId,
          gradeLevel: query.gradeLevel,
        });
        return {
          data: offlineList,
          meta: {
            total: offlineList.length,
            page: query.page || 1,
            limit: query.limit || 20,
            hasMore: false,
          },
        };
      }

      try {
        const result = await fetchStudents(query);
        // Cache to IndexedDB
        if (result?.data && result.data.length > 0) {
          offlineDb.bulkPutStudents(
            result.data.map((s: any) => ({
              id: s.id,
              fullName: s.fullName || s.user?.fullName || '',
              phone: s.phone || s.user?.phone,
              email: s.email || s.user?.email,
              studentCode: s.studentCode || '',
              qrCodeToken: s.qrCodeToken || '',
              gradeLevel: s.gradeLevel,
              emergencyPhone: s.emergencyPhone,
              academicStatus: s.academicStatus,
              groupId: s.groupEnrollments?.[0]?.groupId || query.groupId,
            })),
          );
        }
        return result;
      } catch (err) {
        // Fallback to local store on network error
        const offlineList = await offlineDb.getStudentsOffline({
          search: query.search,
          groupId: query.groupId,
          gradeLevel: query.gradeLevel,
        });
        return {
          data: offlineList,
          meta: {
            total: offlineList.length,
            page: query.page || 1,
            limit: query.limit || 20,
            hasMore: false,
          },
        };
      }
    },
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ['students', id],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return offlineDb.getStudentByIdOffline(id);
      }
      try {
        return await fetchStudentById(id);
      } catch {
        return offlineDb.getStudentByIdOffline(id);
      }
    },
    enabled: !!id,
  });
}

export function useStudentQrCode(id: string) {
  return useQuery({
    queryKey: ['students', id, 'qr-code'],
    queryFn: () => fetchStudentQrCode(id),
    enabled: !!id,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStudentPayload) => createStudent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useRegenerateStudentQr() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => regenerateStudentQrToken(id),
    onSuccess: (data, id) => {
      queryClient.setQueryData(['students', id, 'qr-code'], data);
    },
  });
}
