import { useQuery } from '@tanstack/react-query';
import {
  fetchStudentById,
  fetchStudentQrCode,
  fetchStudentCredentials,
} from '../../api/students.api';
import {
  StudentDetail,
  StudentQrResponse,
} from '../../types/students.types';
import { offlineDb, getStudentDetailsOffline } from '@/lib/offline/db';

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

export function useStudentCredentials(studentId: string, enabled = true) {
  return useQuery({
    queryKey: ['students', studentId, 'credentials'],
    queryFn: () => fetchStudentCredentials(studentId),
    enabled: !!studentId && enabled,
    staleTime: 1000 * 60 * 2,
  });
}
