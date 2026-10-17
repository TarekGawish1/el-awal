import { useQuery } from '@tanstack/react-query';
import { fetchStudents } from '../../api/students.api';
import {
  StudentQuery,
  StudentListItem,
  CursorPaginatedResponse,
} from '../../types/students.types';
import { offlineDb } from '@/lib/offline/db';
import { useAuthStore } from '@/features/auth/store/auth.store';

export function useStudents(query: StudentQuery, options?: { enabled?: boolean }) {
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
        const currentUserId = useAuthStore.getState().user?.id;
        if (!currentUserId) throw new Error('Authentication required');
        const pending = await offlineDb.getPendingMutations(currentUserId);
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

          // When fetching general student list, synchronize snapshot and purge local orphans only if unfiltered full fetch
          if (!query.search && !query.groupId && !query.gradeLevel && !query.academicStage && !query.cursor && (!query.limit || query.limit >= 100)) {
            await offlineDb.syncStudentsSnapshot(mappedEntities);
          } else {
            await offlineDb.bulkPutStudents(mappedEntities);
          }
        }

        const optimisticCount = combinedData.length - ((result?.data as any[])?.length || 0);
        return {
          ...result,
          data: combinedData,
          meta: {
            ...result?.meta,
            total:
              result?.meta?.total !== undefined
                ? result.meta.total + optimisticCount
                : combinedData.length,
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
    enabled: options?.enabled !== undefined ? (query !== undefined && options.enabled) : query !== undefined,
    networkMode: 'offlineFirst',
    staleTime: 60 * 1000,
  });
}
