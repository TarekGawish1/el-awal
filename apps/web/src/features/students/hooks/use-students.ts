import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchStudents,
  fetchStudentById,
  fetchStudentQrCode,
  createStudent,
  regenerateStudentQrToken,
} from '../api/students.api';
import { StudentQuery, StudentListItem, StudentDetail, CreateStudentPayload, CursorPaginatedResponse } from '../types/students.types';
import { offlineDb, getStudentDetailsOffline, StudentEntity } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { generateUUIDv7 } from '@/lib/offline/uuid';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import toast from 'react-hot-toast';

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
          studentCode: s.studentCode || `STU-${s.id.slice(0, 6)}`,
          gradeLevel: s.gradeLevel || '',
          academicStage: s.academicStage || '',
          academicStatus: (s.academicStatus || 'ACTIVE') as any,
          createdAt: new Date(s.updatedAt || Date.now()).toISOString(),
          updatedAt: new Date(s.updatedAt || Date.now()).toISOString(),
          user: {
            id: s.userId || s.id,
            fullName: s.fullName || s.user?.fullName || 'طالب',
            phone: s.phone || s.user?.phone || '',
            email: s.email || s.user?.email || '',
            isActive: s.user?.isActive ?? true,
          },
          groupEnrollments: s.groupId
            ? [{ group: { id: s.groupId, name: 'المجموعة', gradeLevel: s.gradeLevel || '' } }]
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
        if (result?.data && result.data.length > 0) {
          offlineDb.bulkPutStudents(
            result.data.map((s: any) => ({
              id: s.id,
              fullName: s.fullName || s.user?.fullName || '',
              phone: s.phone || s.user?.phone,
              email: s.email || s.user?.email,
              studentCode: s.studentCode || '',
              qrCodeToken: s.qrCodeToken || s.id,
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
      } catch {
        const offlineList = await offlineDb.getStudentsOffline({
          search: query.search,
          groupId: query.groupId,
          gradeLevel: query.gradeLevel,
        });
        const mappedList: StudentListItem[] = offlineList.map((s) => ({
          id: s.id,
          studentCode: s.studentCode || `STU-${s.id.slice(0, 6)}`,
          gradeLevel: s.gradeLevel || '',
          academicStage: s.academicStage || '',
          academicStatus: (s.academicStatus || 'ACTIVE') as any,
          createdAt: new Date(s.updatedAt || Date.now()).toISOString(),
          updatedAt: new Date(s.updatedAt || Date.now()).toISOString(),
          user: {
            id: s.userId || s.id,
            fullName: s.fullName || s.user?.fullName || 'طالب',
            phone: s.phone || s.user?.phone || '',
            email: s.email || s.user?.email || '',
            isActive: s.user?.isActive ?? true,
          },
          groupEnrollments: s.groupId
            ? [{ group: { id: s.groupId, name: 'المجموعة', gradeLevel: s.gradeLevel || '' } }]
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
        return (await getStudentDetailsOffline(id)) as unknown as StudentDetail | null;
      }
      try {
        return await fetchStudentById(id);
      } catch {
        return (await getStudentDetailsOffline(id)) as unknown as StudentDetail | null;
      }
    },
    enabled: !!id,
  });
}

export function useStudentQrCode(id: string) {
  return useQuery({
    queryKey: ['students', id, 'qr-code'],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const student = await offlineDb.getStudentByIdOffline(id);
        const qrCodeToken = student?.qrCodeToken || id;
        return {
          id,
          studentId: id,
          qrCodeToken,
          qrCodeSvg: null,
          qrCodeDataUrl: null,
        };
      }
      try {
        return await fetchStudentQrCode(id);
      } catch {
        const student = await offlineDb.getStudentByIdOffline(id);
        const qrCodeToken = student?.qrCodeToken || id;
        return {
          id,
          studentId: id,
          qrCodeToken,
          qrCodeSvg: null,
          qrCodeDataUrl: null,
        };
      }
    },
    enabled: !!id,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateStudentPayload) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        const newId = generateUUIDv7();
        const studentCode = 'STU-' + Math.floor(100000 + Math.random() * 900000);
        const qrCodeToken = newId;

        const studentEntity: StudentEntity = {
          id: newId,
          userId: newId,
          fullName: payload.fullName,
          phone: payload.phone,
          email: payload.email,
          studentCode,
          qrCodeToken,
          gradeLevel: payload.gradeLevel,
          academicStage: payload.academicStage,
          emergencyPhone: payload.parentPhone,
          academicStatus: 'ACTIVE',
          groupId: payload.initialGroupId,
          user: {
            id: newId,
            fullName: payload.fullName,
            phone: payload.phone,
            email: payload.email,
            isActive: true,
          },
          groupEnrollments: payload.initialGroupId
            ? [{ groupId: payload.initialGroupId, group: { id: payload.initialGroupId, name: 'المجموعة', gradeLevel: payload.gradeLevel } }]
            : [],
          parentLinks: payload.parentPhone
            ? [{ parent: { user: { id: `p-${newId}`, fullName: payload.parentName || 'ولي الأمر', phone: payload.parentPhone } } }]
            : [],
          updatedAt: Date.now(),
        };

        await offlineDb.bulkPutStudents([studentEntity]);

        await syncEngine.enqueue(
          'students',
          API_ENDPOINTS.STUDENTS.CREATE,
          'POST',
          {
            ...payload,
            id: newId,
            clientGeneratedId: newId,
          },
          { optimisticId: newId },
        );

        toast.success('تم تسجيل الطالب محلياً بنجاح وسيتم إرساله عند الاتصال 💾');

        return {
          id: newId,
          studentCode,
          qrCodeToken,
          fullName: payload.fullName,
          phone: payload.phone,
          email: payload.email,
          gradeLevel: payload.gradeLevel,
          isOfflineCreated: true,
        };
      }

      try {
        return await createStudent(payload);
      } catch (error) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const newId = generateUUIDv7();
          const studentCode = 'STU-' + Math.floor(100000 + Math.random() * 900000);
          const studentEntity: StudentEntity = {
            id: newId,
            userId: newId,
            fullName: payload.fullName,
            phone: payload.phone,
            email: payload.email,
            studentCode,
            qrCodeToken: newId,
            gradeLevel: payload.gradeLevel,
            academicStage: payload.academicStage,
            emergencyPhone: payload.parentPhone,
            academicStatus: 'ACTIVE',
            groupId: payload.initialGroupId,
            user: {
              id: newId,
              fullName: payload.fullName,
              phone: payload.phone,
              email: payload.email,
              isActive: true,
            },
            updatedAt: Date.now(),
          };
          await offlineDb.bulkPutStudents([studentEntity]);
          await syncEngine.enqueue(
            'students',
            API_ENDPOINTS.STUDENTS.CREATE,
            'POST',
            { ...payload, id: newId, clientGeneratedId: newId },
            { optimisticId: newId },
          );
          toast.success('تم حفظ بيانات الطالب محلياً وسيتم إرسالها فور توفر الاتصال 💾');
          return { id: newId, studentCode, qrCodeToken: newId, fullName: payload.fullName, isOfflineCreated: true };
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
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
