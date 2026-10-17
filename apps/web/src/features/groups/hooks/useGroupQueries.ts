import { useQuery } from '@tanstack/react-query';
import {
  fetchGroups,
  fetchGroup,
  fetchGroupStudents,
  searchStudents,
} from '../api/groups.api';
import { Group, GroupEnrollment, Student } from '../types/groups.types';
import { offlineDb, getGroupDetailsOffline } from '@/lib/offline/db';
import { QUERY_KEYS } from '@/lib/api/query-keys';
import { coursesApi } from '@/features/courses/api/courses.api';

export function useGroups(
  filters?: {
    academicYear?: string;
    academicTerm?: string;
    gradeLevel?: string;
  },
  options?: { enabled?: boolean }
) {
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
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000,    // 60 minutes
    enabled: options?.enabled,
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

export function useGroupStudents(id: string, options?: { enabled?: boolean }) {
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
    enabled: options?.enabled !== undefined ? (!!id && options.enabled) : !!id,
    networkMode: 'offlineFirst',
    staleTime: 60 * 1000,
  });
}

export function useSearchStudents(query: string, options?: { enabled?: boolean }) {
  return useQuery<{ data: Student[] }>({
    queryKey: ['students', 'search', query],
    queryFn: async (): Promise<{ data: Student[] }> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const allGroups = await offlineDb.getGroupsOffline();
        const groupMap = new Map(allGroups.map((g) => [g.id, g]));
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
            groupEnrollments: s.groupId
              ? [{ status: 'ACTIVE', group: { id: s.groupId, name: groupMap.get(s.groupId)?.name || 'المجموعة' } }]
              : ((s.groupEnrollments as any) || []),
          })),
        };
      }
      try {
        return await searchStudents(query);
      } catch {
        const allGroups = await offlineDb.getGroupsOffline();
        const groupMap = new Map(allGroups.map((g) => [g.id, g]));
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
            groupEnrollments: s.groupId
              ? [{ status: 'ACTIVE', group: { id: s.groupId, name: groupMap.get(s.groupId)?.name || 'المجموعة' } }]
              : ((s.groupEnrollments as any) || []),
          })),
        };
      }
    },
    enabled: (options?.enabled ?? true) && query.length >= 2,
    staleTime: 60 * 1000,
  });
}

export function usePendingReservations(enabled = true) {
  return useQuery<any, Error, any[]>({
    queryKey: QUERY_KEYS.courses.teacherSubscriptions(),
    queryFn: () => coursesApi.getTeacherSubscriptions(),
    select: (data: any) => {
      if (Array.isArray(data)) return data;
      const requests = data?.pendingRequests ?? [];
      return requests.map((r: any) => ({
        ...r,
        id: r.enrollmentId || r.id,
        enrollmentId: r.enrollmentId || r.id,
        student: {
          id: r.studentId,
          studentCode: r.studentCode,
          qrCodeToken: r.studentCode,
          user: {
            fullName: r.studentName || r.student?.user?.fullName,
            phone: r.studentPhone || r.senderPhone || r.student?.user?.phone,
          },
          ...r.student,
        },
        group: {
          name: r.courseName || r.group?.name || 'طلب انضمام',
          ...r.group,
        },
      }));
    },
    enabled: enabled && (typeof navigator !== 'undefined' ? navigator.onLine : true),
    networkMode: 'online',
    staleTime: 60 * 1000, // 1 minute cache sharing across layout and dashboard
    refetchOnWindowFocus: false,
  });
}
