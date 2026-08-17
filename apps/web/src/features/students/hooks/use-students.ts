import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchStudents,
  fetchStudentById,
  fetchStudentQrCode,
  createStudent,
  regenerateStudentQrToken,
} from '../api/students.api';
import { StudentQuery, CreateStudentPayload } from '../types/students.types';

export function useStudents(query: StudentQuery) {
  return useQuery({
    queryKey: ['students', query],
    queryFn: () => fetchStudents(query),
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ['students', id],
    queryFn: () => fetchStudentById(id),
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
      // Invalidate the list so it refetches
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useRegenerateStudentQr() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => regenerateStudentQrToken(id),
    onSuccess: (data, id) => {
      // Invalidate specifically the QR code query for this student
      queryClient.setQueryData(['students', id, 'qr-code'], data);
    },
  });
}
