import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchStudents,
  fetchStudentById,
  fetchStudentQrCode,
  createStudent,
  regenerateStudentQrToken,
} from '../api/students.api';
import {
  StudentQuery,
  StudentListItem,
  StudentDetail,
  StudentQrResponse,
  CreateStudentPayload,
  CursorPaginatedResponse,
} from '../types/students.types';
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
        const allGroups = await offlineDb.getGroupsOffline();
        const groupMap = new Map(allGroups.map((g) => [g.id, g]));

        const offlineList = await offlineDb.getStudentsOffline({
          search: query.search,
          groupId: query.groupId,
          gradeLevel: query.gradeLevel,
          academicStage: query.academicStage,
          academicStatus: query.academicStatus,
          academicYear: (query as any).academicYear,
          academicTerm: (query as any).academicTerm,
        });

        const mappedList: StudentListItem[] = offlineList.map((s) => {
          const matchedGroup = s.groupId ? groupMap.get(s.groupId) : null;
          return {
            id: s.id,
            studentCode: s.studentCode || `STU-${s.id.slice(0, 6)}`,
            gradeLevel: s.gradeLevel || matchedGroup?.gradeLevel || '',
            academicStage: s.academicStage || '',
            academicStatus: (s.academicStatus || 'ACTIVE') as any,
            createdAt: new Date(s.updatedAt || Date.now()).toISOString(),
            updatedAt: new Date(s.updatedAt || Date.now()).toISOString(),
            user: {
              id: s.userId || s.id,
              fullName: s.fullName || s.user?.fullName || 'طالب',
              phone: s.phone || s.user?.phone || '',
              email: s.email || s.user?.email || '',
              isActive: s.user?.isActive ?? s.isActive ?? true,
            },
            groupEnrollments: s.groupId
              ? [{ group: { id: s.groupId, name: matchedGroup?.name || 'المجموعة', gradeLevel: matchedGroup?.gradeLevel || s.gradeLevel || '' } }]
              : (s.groupEnrollments || []),
            parentLinks: s.parentLinks || [],
          };
        });

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
        const pending = await offlineDb.getPendingMutations();
        const pendingStudentMutations = pending.filter(
          (m) => m.domain === 'students' && m.method === 'POST',
        );

        let combinedData: StudentListItem[] = (result?.data as StudentListItem[]) || [];

        if (pendingStudentMutations.length > 0) {
          const existingIds = new Set(combinedData.map((s) => s.id));
          const allGroups = await offlineDb.getGroupsOffline();
          const groupMap = new Map(allGroups.map((g) => [g.id, g]));

          for (const m of pendingStudentMutations) {
            const tempId = m.optimisticId || m.id;
            if (!existingIds.has(tempId)) {
              const localStudent = await offlineDb.getStudentByIdOffline(tempId);
              if (localStudent) {
                const matchedGroup = localStudent.groupId ? groupMap.get(localStudent.groupId) : null;
                const studentItem: StudentListItem = {
                  id: localStudent.id,
                  studentCode: localStudent.studentCode || `STU-${localStudent.id.slice(0, 6)}`,
                  gradeLevel: localStudent.gradeLevel || matchedGroup?.gradeLevel || '',
                  academicStage: localStudent.academicStage || '',
                  academicStatus: (localStudent.academicStatus || 'ACTIVE') as any,
                  createdAt: new Date(localStudent.updatedAt || Date.now()).toISOString(),
                  updatedAt: new Date(localStudent.updatedAt || Date.now()).toISOString(),
                  user: {
                    id: localStudent.userId || localStudent.id,
                    fullName: localStudent.fullName || localStudent.user?.fullName || 'طالب',
                    phone: localStudent.phone || localStudent.user?.phone || '',
                    email: localStudent.email || localStudent.user?.email || '',
                    isActive: localStudent.user?.isActive ?? localStudent.isActive ?? true,
                  },
                  groupEnrollments: localStudent.groupId
                    ? [
                        {
                          group: {
                            id: localStudent.groupId,
                            name: matchedGroup?.name || 'المجموعة',
                            gradeLevel: matchedGroup?.gradeLevel || localStudent.gradeLevel || '',
                          },
                        },
                      ]
                    : (localStudent.groupEnrollments || []),
                  parentLinks: localStudent.parentLinks || [],
                };
                combinedData = [studentItem, ...combinedData];
                existingIds.add(tempId);
              }
            }
          }
        }

        if (result?.data) {
          const mappedEntities = result.data.map((s: any) => ({
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
          }));

          // When fetching general student list, synchronize snapshot and purge local orphans
          if (!query.search && !query.groupId && !query.gradeLevel) {
            await offlineDb.syncStudentsSnapshot(mappedEntities);
          } else {
            await offlineDb.bulkPutStudents(mappedEntities);
          }
        }

        return {
          ...result,
          data: combinedData,
          meta: {
            ...result?.meta,
            total: combinedData.length,
          },
        };
      } catch {
        const allGroups = await offlineDb.getGroupsOffline();
        const groupMap = new Map(allGroups.map((g) => [g.id, g]));

        const offlineList = await offlineDb.getStudentsOffline({
          search: query.search,
          groupId: query.groupId,
          gradeLevel: query.gradeLevel,
          academicStage: query.academicStage,
          academicStatus: query.academicStatus,
          academicYear: (query as any).academicYear,
          academicTerm: (query as any).academicTerm,
        });

        const mappedList: StudentListItem[] = offlineList.map((s) => {
          const matchedGroup = s.groupId ? groupMap.get(s.groupId) : null;
          return {
            id: s.id,
            studentCode: s.studentCode || `STU-${s.id.slice(0, 6)}`,
            gradeLevel: s.gradeLevel || matchedGroup?.gradeLevel || '',
            academicStage: s.academicStage || '',
            academicStatus: (s.academicStatus || 'ACTIVE') as any,
            createdAt: new Date(s.updatedAt || Date.now()).toISOString(),
            updatedAt: new Date(s.updatedAt || Date.now()).toISOString(),
            user: {
              id: s.userId || s.id,
              fullName: s.fullName || s.user?.fullName || 'طالب',
              phone: s.phone || s.user?.phone || '',
              email: s.email || s.user?.email || '',
              isActive: s.user?.isActive ?? s.isActive ?? true,
            },
            groupEnrollments: s.groupId
              ? [{ group: { id: s.groupId, name: matchedGroup?.name || 'المجموعة', gradeLevel: matchedGroup?.gradeLevel || s.gradeLevel || '' } }]
              : (s.groupEnrollments || []),
            parentLinks: s.parentLinks || [],
          };
        });

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
    enabled: query !== undefined,
    networkMode: 'offlineFirst',
    staleTime: 60 * 1000,
  });
}

export function useStudent(id: string) {
  return useQuery<StudentDetail | null>({
    queryKey: ['students', id],
    queryFn: async (): Promise<StudentDetail | null> => {
      if (!id) return null;
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return (await getStudentDetailsOffline(id)) as unknown as StudentDetail | null;
      }
      try {
        const student = await fetchStudentById(id);
        if (student?.id) {
          offlineDb.bulkPutStudents([student as any]);
        }
        return student;
      } catch {
        return (await getStudentDetailsOffline(id)) as unknown as StudentDetail | null;
      }
    },
    enabled: !!id,
    networkMode: 'offlineFirst',
    staleTime: 60 * 1000,
  });
}

export function useStudentQrCode(id: string) {
  return useQuery<StudentQrResponse | null>({
    queryKey: ['students', id, 'qr-code'],
    queryFn: async (): Promise<StudentQrResponse | null> => {
      if (!id) return null;
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const student = await offlineDb.getStudentByIdOffline(id);
        return {
          studentId: id,
          studentCode: student?.studentCode || `STU-${id.slice(0, 6)}`,
          fullName: student?.fullName || student?.user?.fullName || 'طالب',
          gradeLevel: student?.gradeLevel || 'الصف الدراسي',
          qrCodeToken: student?.qrCodeToken || id,
        };
      }
      try {
        return await fetchStudentQrCode(id);
      } catch {
        const student = await offlineDb.getStudentByIdOffline(id);
        return {
          studentId: id,
          studentCode: student?.studentCode || `STU-${id.slice(0, 6)}`,
          fullName: student?.fullName || student?.user?.fullName || 'طالب',
          gradeLevel: student?.gradeLevel || 'الصف الدراسي',
          qrCodeToken: student?.qrCodeToken || id,
        };
      }
    },
    enabled: !!id,
    networkMode: 'offlineFirst',
    staleTime: 60 * 1000,
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
          queryClient.setQueryData(['students', newId], studentEntity as unknown as StudentDetail);
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
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.setQueryData(['students', data.id], (old: any) => old || data);
      }
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
