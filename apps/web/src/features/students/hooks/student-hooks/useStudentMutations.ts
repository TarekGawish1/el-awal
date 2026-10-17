import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createStudent,
  regenerateStudentQrToken,
  resetStudentPassword,
  ResetStudentPasswordPayload,
  resetParentPassword,
  ResetParentPasswordPayload,
} from '../../api/students.api';
import {
  CreateStudentPayload,
  StudentListItem,
  StudentDetail,
} from '../../types/students.types';
import { offlineDb, StudentEntity } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { generateUUIDv7 } from '@/lib/offline/uuid';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import toast from 'react-hot-toast';

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

        const studentListItem: StudentListItem = {
          id: newId,
          studentCode,
          gradeLevel: payload.gradeLevel,
          academicStage: payload.academicStage || '',
          academicStatus: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: {
            id: newId,
            fullName: payload.fullName,
            phone: payload.phone || '',
            email: payload.email || '',
            isActive: true,
          },
          groupEnrollments: payload.initialGroupId
            ? [{ group: { id: payload.initialGroupId, name: 'المجموعة الدراسية' } }]
            : [],
          parentLinks: payload.parentPhone
            ? [{ parent: { user: { id: `p-${newId}`, fullName: payload.parentName || 'ولي الأمر', phone: payload.parentPhone, isActive: true } } }]
            : [],
        };

        queryClient.setQueryData(['students', newId], studentEntity as unknown as StudentDetail);
        queryClient.setQueriesData({ queryKey: ['students'] }, (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) return [studentListItem, ...old];
          if (old.data && Array.isArray(old.data)) {
            return { ...old, data: [studentListItem, ...old.data], meta: { ...old.meta, total: (old.meta?.total || 0) + 1 } };
          }
          return old;
        });

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
        const created = await createStudent(payload);
        if (created?.id) {
          queryClient.setQueryData(['students', created.id], created);
        }
        return created;
      } catch (error) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          throw new Error('فقد الاتصال بالإنترنت. يرجى إعادة المحاولة.');
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.setQueryData(['students', data.id], (old: any) => old || data);
      }
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CreateStudentPayload> }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        throw new Error('لا يمكن إضافة أو تعديل بيانات الطلاب في وضع عدم الاتصال (Offline). يرجى الاتصال بالإنترنت.');
      }

      const { apiClient } = await import('@/lib/api/client');
      return apiClient<StudentDetail>(API_ENDPOINTS.STUDENTS.DETAIL(id), {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['students', variables.id], data);
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

export function useUpdateStudentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      import('../../api/students.api').then((m) => m.updateStudentStatus(id, status)),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['students', variables.id], (old: any) => ({ ...old, ...data }));
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('تم تحديث حالة الطالب بنجاح ✅');
    },
    onError: (err: any) => {
      toast.error(err.message || 'حدث خطأ أثناء تحديث حالة الطالب');
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      import('../../api/students.api').then((m) => m.deleteStudent(id)),
    onSuccess: async (_data, id) => {
      try {
        await offlineDb.removeStudent(id);
      } catch (e) {
        // ignore offline cache removal errors
      }
      queryClient.removeQueries({ queryKey: ['students', id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('تم حذف الطالب من النظام بنجاح 🗑️');
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'تعذر حذف الطالب، يرجى المحاولة مرة أخرى';
      toast.error(typeof msg === 'string' && msg.includes('Referenced') ? 'تعذر حذف الطالب لوجود سجلات مرتبطة به' : msg);
    },
  });
}

export function useResetStudentPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, payload }: { studentId: string; payload: ResetStudentPasswordPayload }) =>
      resetStudentPassword(studentId, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students', variables.studentId] });
      queryClient.invalidateQueries({ queryKey: ['students', variables.studentId, 'credentials'] });
      toast.success(
        data.messageSent
          ? 'تم تعيين كلمة المرور وإرسالها لواتساب بنجاح ✅'
          : 'تم تحديث كلمة مرور الطالب بنجاح ✅',
      );
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'تعذر إعادة تعيين كلمة المرور، يرجى المحاولة مرة أخرى',
      );
    },
  });
}

export function useResetParentPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, payload }: { studentId: string; payload: ResetParentPasswordPayload }) =>
      resetParentPassword(studentId, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students', variables.studentId] });
      queryClient.invalidateQueries({ queryKey: ['students', variables.studentId, 'credentials'] });
      toast.success(
        data.messageSent
          ? 'تم تعيين كلمة مرور ولي الأمر وإرسالها لواتساب بنجاح ✅'
          : 'تم تحديث كلمة مرور ولي الأمر بنجاح ✅',
      );
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'تعذر إعادة تعيين كلمة مرور ولي الأمر، يرجى المحاولة مرة أخرى',
      );
    },
  });
}
