import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchGroups,
  createGroup,
  fetchGroup,
  updateGroup,
  fetchGroupStudents,
  addStudentToGroup,
  removeStudentFromGroup,
  searchStudents,
  deleteGroup,
} from '../api/groups.api';
import { Group, CreateGroupPayload, EnrollStudentPayload, GroupEnrollment, Student } from '../types/groups.types';
import { offlineDb, getGroupDetailsOffline, GroupEntity } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { generateUUIDv7 } from '@/lib/offline/uuid';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import toast from 'react-hot-toast';

export function useGroups(filters?: {
  academicYear?: string;
  academicTerm?: string;
  gradeLevel?: string;
}) {
  return useQuery<Group[]>({
    queryKey: ['groups', filters],
    queryFn: async (): Promise<Group[]> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return (await offlineDb.getGroupsOffline(filters)) as unknown as Group[];
      }

      try {
        const groups = await fetchGroups(filters);
        if (groups && groups.length > 0) {
          offlineDb.bulkPutGroups(groups as any);
        }
        return groups;
      } catch {
        return (await offlineDb.getGroupsOffline(filters)) as unknown as Group[];
      }
    },
    networkMode: 'offlineFirst',
    staleTime: 60 * 1000,
  });
}

export function useGroup(id: string) {
  return useQuery<Group | null>({
    queryKey: ['groups', id],
    queryFn: async (): Promise<Group | null> => {
      if (!id) return null;
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return (await getGroupDetailsOffline(id)) as unknown as Group | null;
      }
      try {
        const group = await fetchGroup(id);
        if (group?.id) {
          offlineDb.bulkPutGroups([group as any]);
        }
        return group;
      } catch {
        return (await getGroupDetailsOffline(id)) as unknown as Group | null;
      }
    },
    enabled: !!id,
    networkMode: 'offlineFirst',
    staleTime: 60 * 1000,
  });
}

export function useGroupStudents(id: string) {
  return useQuery<GroupEnrollment[]>({
    queryKey: ['groups', id, 'students'],
    queryFn: async (): Promise<GroupEnrollment[]> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const roster = await offlineDb.getRoster(id);
        if (roster && roster.students?.length > 0) {
          return roster.students.map((s) => ({
            id: s.id,
            enrolledAt: new Date(roster.updatedAt || Date.now()).toISOString(),
            status: 'ACTIVE',
            attendanceRate: 100,
            student: {
              id: s.id,
              code: s.studentCode || `STU-${s.id.slice(0, 6)}`,
              gradeLevel: s.gradeLevel || roster.gradeLevel || '',
              academicStage: '',
              academicStatus: s.academicStatus || 'ACTIVE',
              user: {
                name: s.fullName,
                phone: s.emergencyPhone || s.parentPhone || '',
              },
            },
          }));
        }

        const offlineStudents = await offlineDb.getStudentsOffline({ groupId: id });
        return offlineStudents.map((s) => ({
          id: s.id,
          enrolledAt: new Date(s.updatedAt || Date.now()).toISOString(),
          status: 'ACTIVE',
          attendanceRate: 100,
          student: {
            id: s.id,
            code: s.studentCode || `STU-${s.id.slice(0, 6)}`,
            gradeLevel: s.gradeLevel || '',
            academicStage: s.academicStage || '',
            academicStatus: s.academicStatus || 'ACTIVE',
            user: {
              name: s.fullName || s.user?.fullName || 'طالب',
              phone: s.phone || s.user?.phone || '',
            },
          },
        }));
      }

      try {
        const students = await fetchGroupStudents(id);
        // Cache to offline roster
        if (students && Array.isArray(students)) {
          const group = await offlineDb.getGroupByIdOffline(id);
          await offlineDb.cacheRoster({
            groupId: id,
            groupName: group?.name || 'المجموعة الدراسية',
            gradeLevel: group?.gradeLevel,
            monthlyFee: group?.monthlyFee,
            students: students.map((enrollment: any) => ({
              id: enrollment?.student?.id || enrollment?.id,
              fullName: enrollment?.student?.user?.name || enrollment?.student?.fullName || enrollment?.student?.user?.fullName || 'طالب',
              studentCode: enrollment?.student?.code || enrollment?.student?.studentCode || `STU-${(enrollment?.student?.id || enrollment?.id || '').slice(0, 6)}`,
              qrCodeToken: enrollment?.student?.qrCodeToken || enrollment?.student?.id || enrollment?.id,
              gradeLevel: enrollment?.student?.gradeLevel || group?.gradeLevel || '',
              academicStatus: enrollment?.student?.academicStatus || 'ACTIVE',
            })),
            updatedAt: Date.now(),
          });
        }
        return students || [];
      } catch (err) {
        console.warn('Failed to fetch online group roster, checking offline database:', err);
        const roster = await offlineDb.getRoster(id);
        if (roster && roster.students?.length > 0) {
          return roster.students.map((s) => ({
            id: s.id,
            enrolledAt: new Date(roster.updatedAt || Date.now()).toISOString(),
            status: 'ACTIVE',
            attendanceRate: 100,
            student: {
              id: s.id,
              code: s.studentCode || `STU-${s.id.slice(0, 6)}`,
              gradeLevel: s.gradeLevel || roster.gradeLevel || '',
              academicStage: '',
              academicStatus: s.academicStatus || 'ACTIVE',
              user: {
                name: s.fullName,
                phone: s.emergencyPhone || s.parentPhone || '',
              },
            },
          }));
        }

        const offlineStudents = await offlineDb.getStudentsOffline({ groupId: id });
        return offlineStudents.map((s) => ({
          id: s.id,
          enrolledAt: new Date(s.updatedAt || Date.now()).toISOString(),
          status: 'ACTIVE',
          attendanceRate: 100,
          student: {
            id: s.id,
            code: s.studentCode || `STU-${s.id.slice(0, 6)}`,
            gradeLevel: s.gradeLevel || '',
            academicStage: s.academicStage || '',
            academicStatus: s.academicStatus || 'ACTIVE',
            user: {
              name: s.fullName || s.user?.fullName || 'طالب',
              phone: s.phone || s.user?.phone || '',
            },
          },
        }));
      }
    },
    enabled: !!id,
    networkMode: 'offlineFirst',
    staleTime: 60 * 1000,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateGroupPayload) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        const newId = generateUUIDv7();
        const groupEntity: GroupEntity = {
          id: newId,
          name: payload.name,
          gradeLevel: payload.gradeLevel,
          academicYear: payload.academicYear || '2026-2027',
          academicTerm: payload.academicTerm || 'FIRST_TERM',
          description: payload.description,
          maxCapacity: payload.maxCapacity || 50,
          monthlyFee: payload.monthlyFee || 0,
          status: 'ACTIVE',
          schedules: payload.schedules || [],
          _count: { enrollments: 0, schedules: payload.schedules?.length || 0 },
          updatedAt: Date.now(),
        };

        await offlineDb.bulkPutGroups([groupEntity]);

        queryClient.setQueryData(['groups'], (old: Group[] | undefined) => {
          const list = old || [];
          const exists = list.some((g) => g.id === groupEntity.id);
          return exists ? list : [groupEntity as unknown as Group, ...list];
        });
        queryClient.setQueryData(['groups', newId], groupEntity as unknown as Group);

        await syncEngine.enqueue(
          'groups',
          API_ENDPOINTS.GROUPS.CREATE,
          'POST',
          { ...payload, id: newId, clientGeneratedId: newId },
          { optimisticId: newId },
        );

        toast.success('تم إنشاء المجموعة محلياً بنجاح ووضعها في انتظار المزامنة 💾');

        return { ...groupEntity, isOfflineCreated: true } as unknown as Group;
      }

      try {
        const created = await createGroup(payload);
        if (created) {
          await offlineDb.bulkPutGroups([created as any]);
          queryClient.setQueryData(['groups', created.id], created);
        }
        return created;
      } catch (error) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const newId = generateUUIDv7();
          const groupEntity: GroupEntity = {
            id: newId,
            name: payload.name,
            gradeLevel: payload.gradeLevel,
            academicYear: payload.academicYear || '2026-2027',
            academicTerm: payload.academicTerm || 'FIRST_TERM',
            description: payload.description,
            maxCapacity: payload.maxCapacity || 50,
            monthlyFee: payload.monthlyFee || 0,
            status: 'ACTIVE',
            schedules: payload.schedules || [],
            _count: { enrollments: 0, schedules: payload.schedules?.length || 0 },
            updatedAt: Date.now(),
          };
          await offlineDb.bulkPutGroups([groupEntity]);
          queryClient.setQueryData(['groups'], (old: Group[] | undefined) => {
            const list = old || [];
            const exists = list.some((g) => g.id === groupEntity.id);
            return exists ? list : [groupEntity as unknown as Group, ...list];
          });
          queryClient.setQueryData(['groups', newId], groupEntity as unknown as Group);
          await syncEngine.enqueue(
            'groups',
            API_ENDPOINTS.GROUPS.CREATE,
            'POST',
            { ...payload, id: newId, clientGeneratedId: newId },
            { optimisticId: newId },
          );
          toast.success('تم حفظ المجموعة محلياً وسيتم إرسالها فور توفر الاتصال 💾');
          return { ...groupEntity, isOfflineCreated: true } as unknown as Group;
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.setQueryData(['groups'], (old: Group[] | undefined) => {
          const list = old || [];
          const exists = list.some((g) => g.id === data.id);
          return exists ? list.map((g) => (g.id === data.id ? data : g)) : [data, ...list];
        });
        queryClient.setQueryData(['groups', data.id], data);
      }
      queryClient.invalidateQueries({ queryKey: ['groups'], exact: true });
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CreateGroupPayload> }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        const existing = await offlineDb.getGroupByIdOffline(id);
        if (existing) {
          const updated: GroupEntity = {
            ...existing,
            name: payload.name ?? existing.name,
            gradeLevel: payload.gradeLevel ?? existing.gradeLevel,
            academicYear: payload.academicYear ?? existing.academicYear,
            academicTerm: payload.academicTerm ?? existing.academicTerm,
            description: payload.description ?? existing.description,
            maxCapacity: payload.maxCapacity ?? existing.maxCapacity,
            monthlyFee: payload.monthlyFee ?? existing.monthlyFee,
            schedules: payload.schedules ?? existing.schedules,
            updatedAt: Date.now(),
          };
          await offlineDb.bulkPutGroups([updated]);

          const roster = await offlineDb.getRoster(id);
          if (roster) {
            await offlineDb.cacheRoster({
              ...roster,
              groupName: updated.name,
              gradeLevel: updated.gradeLevel,
              monthlyFee: updated.monthlyFee,
              sessions: updated.schedules ?? roster.sessions,
              updatedAt: Date.now(),
            });
          }

          queryClient.setQueryData(['groups', id], updated as unknown as Group);
          queryClient.setQueriesData({ queryKey: ['groups'] }, (old: Group[] | undefined) =>
            Array.isArray(old) ? old.map((group) => (group.id === id ? updated as unknown as Group : group)) : old,
          );

          await syncEngine.enqueue(
            'groups',
            API_ENDPOINTS.GROUPS.UPDATE(id),
            'PATCH',
            payload,
            { rollbackData: existing },
          );

          toast.success('تم تعديل المجموعة محلياً بنجاح وسيتم إرسال التعديل فور الاتصال 💾');
          return updated as unknown as Group;
        }

        throw new Error('تعذر العثور على بيانات المجموعة المخزنة محلياً');
      }

      return updateGroup(id, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups', variables.id] });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        await offlineDb.removeGroup(id);
        await syncEngine.enqueue(
          'groups',
          API_ENDPOINTS.GROUPS.DELETE(id),
          'DELETE',
          {},
        );
        toast.success('تم حذف المجموعة محلياً بنجاح 💾');
        return;
      }

      return deleteGroup(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useAddStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, payload }: { groupId: string; payload: EnrollStudentPayload }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        const student = await offlineDb.getStudentByIdOffline(payload.studentId);
        if (student) {
          student.groupId = groupId;
          await offlineDb.bulkPutStudents([student]);
        }

        const group = await offlineDb.getGroupByIdOffline(groupId);
        const roster = await offlineDb.getRoster(groupId);
        if (roster) {
          if (!roster.students.some((s) => s.id === payload.studentId)) {
            roster.students.push({
              id: payload.studentId,
              fullName: student?.fullName || 'طالب',
              studentCode: student?.studentCode,
              qrCodeToken: student?.qrCodeToken || payload.studentId,
              gradeLevel: group?.gradeLevel,
              academicStatus: 'ACTIVE',
            });
            await offlineDb.cacheRoster(roster);
          }
        }

        await syncEngine.enqueue(
          'groups',
          API_ENDPOINTS.GROUPS.ENROLL(groupId),
          'POST',
          payload,
        );

        toast.success('تمت إضافة الطالب للمجموعة محلياً بنجاح 💾');
        return { success: true };
      }

      return addStudentToGroup(groupId, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId, 'students'] });
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId] });
    },
  });
}

export function useRemoveStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, studentId }: { groupId: string; studentId: string }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        const student = await offlineDb.getStudentByIdOffline(studentId);
        if (student && student.groupId === groupId) {
          student.groupId = undefined;
          await offlineDb.bulkPutStudents([student]);
        }

        const roster = await offlineDb.getRoster(groupId);
        if (roster) {
          roster.students = roster.students.filter((s) => s.id !== studentId);
          await offlineDb.cacheRoster(roster);
        }

        await syncEngine.enqueue(
          'groups',
          API_ENDPOINTS.GROUPS.REMOVE_STUDENT(groupId, studentId),
          'DELETE',
          {},
        );

        toast.success('تمت إزالة الطالب من المجموعة محلياً بنجاح 💾');
        return;
      }

      return removeStudentFromGroup(groupId, studentId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId, 'students'] });
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId] });
    },
  });
}

export function useSearchStudents(query: string) {
  return useQuery<{ data: Student[] }>({
    queryKey: ['students', 'search', query],
    queryFn: async (): Promise<{ data: Student[] }> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const offlineStudents = await offlineDb.getStudentsOffline({ search: query });
        return {
          data: offlineStudents.map((s) => ({
            id: s.id,
            code: s.studentCode || `STU-${s.id.slice(0, 6)}`,
            gradeLevel: s.gradeLevel || '',
            academicStage: s.academicStage || '',
            academicStatus: (s.academicStatus || 'ACTIVE') as any,
            user: {
              name: s.fullName || s.user?.fullName || 'طالب',
              phone: s.phone || s.user?.phone || '',
            },
          })),
        };
      }
      try {
        return await searchStudents(query);
      } catch {
        const offlineStudents = await offlineDb.getStudentsOffline({ search: query });
        return {
          data: offlineStudents.map((s) => ({
            id: s.id,
            code: s.studentCode || `STU-${s.id.slice(0, 6)}`,
            gradeLevel: s.gradeLevel || '',
            academicStage: s.academicStage || '',
            academicStatus: (s.academicStatus || 'ACTIVE') as any,
            user: {
              name: s.fullName || s.user?.fullName || 'طالب',
              phone: s.phone || s.user?.phone || '',
            },
          })),
        };
      }
    },
    enabled: query.length >= 2,
    staleTime: 60 * 1000,
  });
}

export function usePendingReservations(enabled = true) {
  return useQuery<any[]>({
    queryKey: ['pending-reservations'],
    queryFn: () => import('../api/groups.api').then(m => m.fetchPendingReservations()),
    enabled,
  });
}

export function useAcceptReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ enrollmentId, paymentStatus }: { enrollmentId: string, paymentStatus?: 'PAID' | 'LATER' }) => import('../api/groups.api').then(m => m.acceptReservation(enrollmentId, { paymentStatus })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useRejectReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: string) => import('../api/groups.api').then(m => m.rejectReservation(enrollmentId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
