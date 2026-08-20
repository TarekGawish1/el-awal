import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchStudents,
  fetchStudentById,
  fetchStudentQrCode,
  createStudent,
  regenerateStudentQrToken,
} from '../api/students.api';
import { StudentQuery, StudentListItem, StudentDetail, CreateStudentPayload, CursorPaginatedResponse } from '../types/students.types';
import { offlineDb } from '@/lib/offline/db';

export function useStudents(query: StudentQuery) {
  return useQuery<CursorPaginatedResponse<StudentListItem>>({
    queryKey: ['students', query],
    queryFn: async (): Promise<CursorPaginatedResponse<StudentListItem>> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const offlineList = await offlineDb.getStudentsOffline({
          search: query.search,
          groupId: query.groupId,
          gradeLevel: query.gradeLevel,
        });
        const mappedList: StudentListItem[] = offlineList.map((s) => ({
          id: s.id,
          studentCode: s.studentCode,
          gradeLevel: s.gradeLevel || '',
          academicStage: s.academicStage || '',
          academicStatus: (s.academicStatus || 'ACTIVE') as any,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: {
            id: s.userId || s.id,
            fullName: s.fullName || s.user?.fullName || '',
            phone: s.phone || s.user?.phone,
            email: s.email || s.user?.email,
            isActive: true,
          },
          groupEnrollments: s.groupId
            ? [{ group: { id: s.groupId, name: 'المجموعة' } }]
            : (s.groupEnrollments || []),
          parentLinks: s.parentLinks || [],
        }));
        return {
          success: true,
          data: mappedList,
          meta: {
            hasMore: false,
            nextCursor: null,
            prevCursor: null,
            limit: query.limit || 20,
            total: mappedList.length,
          },
          timestamp: new Date().toISOString(),
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
              academicStage: s.academicStage,
              emergencyPhone: s.emergencyPhone,
              academicStatus: s.academicStatus,
              groupId: s.groupEnrollments?.[0]?.groupId || query.groupId,
              user: s.user || { fullName: s.fullName },
              groupEnrollments: s.groupEnrollments || [],
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
        const mappedList: StudentListItem[] = offlineList.map((s) => ({
          id: s.id,
          studentCode: s.studentCode,
          gradeLevel: s.gradeLevel || '',
          academicStage: s.academicStage || '',
          academicStatus: (s.academicStatus || 'ACTIVE') as any,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: {
            id: s.userId || s.id,
            fullName: s.fullName || s.user?.fullName || '',
            phone: s.phone || s.user?.phone,
            email: s.email || s.user?.email,
            isActive: true,
          },
          groupEnrollments: s.groupId
            ? [{ group: { id: s.groupId, name: 'المجموعة' } }]
            : (s.groupEnrollments || []),
          parentLinks: s.parentLinks || [],
        }));
        return {
          success: true,
          data: mappedList,
          meta: {
            hasMore: false,
            nextCursor: null,
            prevCursor: null,
            limit: query.limit || 20,
            total: mappedList.length,
          },
          timestamp: new Date().toISOString(),
        };
      }
    },
  });
}

export function useStudent(id: string) {
  return useQuery<StudentDetail | null>({
    queryKey: ['students', id],
    queryFn: async (): Promise<StudentDetail | null> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const local = await offlineDb.getStudentByIdOffline(id);
        if (!local) return null;
        return {
          id: local.id,
          studentCode: local.studentCode,
          gradeLevel: local.gradeLevel || 'الصف الدراسي',
          academicStatus: (local.academicStatus || 'ACTIVE') as any,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          emergencyPhone: local.emergencyPhone,
          user: {
            id: local.userId || local.id,
            fullName: local.fullName || local.user?.fullName || '',
            phone: local.phone || local.user?.phone,
            email: local.email || local.user?.email,
            isActive: true,
          },
          groupEnrollments: local.groupId
            ? [{ group: { id: local.groupId, name: 'المجموعة', gradeLevel: local.gradeLevel || '' } }]
            : (local.groupEnrollments || []),
          parentLinks: local.parentPhone
            ? [{ parent: { user: { id: 'p1', fullName: 'ولي الأمر', phone: local.parentPhone, isActive: true } } }]
            : (local.parentLinks || []),
        } as unknown as StudentDetail;
      }
      try {
        return await fetchStudentById(id);
      } catch {
        const local = await offlineDb.getStudentByIdOffline(id);
        if (!local) return null;
        return {
          id: local.id,
          studentCode: local.studentCode,
          gradeLevel: local.gradeLevel || 'الصف الدراسي',
          academicStatus: (local.academicStatus || 'ACTIVE') as any,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          emergencyPhone: local.emergencyPhone,
          user: {
            id: local.userId || local.id,
            fullName: local.fullName || local.user?.fullName || '',
            phone: local.phone || local.user?.phone,
            email: local.email || local.user?.email,
            isActive: true,
          },
          groupEnrollments: local.groupId
            ? [{ group: { id: local.groupId, name: 'المجموعة', gradeLevel: local.gradeLevel || '' } }]
            : (local.groupEnrollments || []),
          parentLinks: local.parentPhone
            ? [{ parent: { user: { id: 'p1', fullName: 'ولي الأمر', phone: local.parentPhone, isActive: true } } }]
            : (local.parentLinks || []),
        } as unknown as StudentDetail;
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
