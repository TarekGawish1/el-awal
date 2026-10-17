'use client';

import { useState } from 'react';
import { useStudent, useUpdateStudentStatus, useDeleteStudent } from './use-students';
import { useStudentAttendanceHistory } from '@/features/attendance/hooks/use-attendance';
import { useStudentPaymentHistory } from '@/features/finance/hooks/useFinance';
import { useRemoveStudent } from '@/features/groups/hooks/useGroups';
import toast from 'react-hot-toast';

interface UseStudentDetailsModalProps {
  studentId: string | null;
  onClose: () => void;
}

export function useStudentDetailsModal({ studentId, onClose }: UseStudentDetailsModalProps) {
  const { data: student, isLoading: isStudentLoading, isError } = useStudent(studentId || '');
  const { data: attendanceHistory, isLoading: isAttendanceLoading } = useStudentAttendanceHistory(studentId || '', 10);
  const { data: paymentHistory, isLoading: isPaymentLoading } = useStudentPaymentHistory(studentId || '');
  const updateStatusMutation = useUpdateStudentStatus();
  const deleteStudentMutation = useDeleteStudent();
  const removeStudentMutation = useRemoveStudent();

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordModalTab, setPasswordModalTab] = useState<'student' | 'parent'>('student');
  const [isEditing, setIsEditing] = useState(false);
  const [isQrExpanded, setIsQrExpanded] = useState(false);
  const [groupToRemove, setGroupToRemove] = useState<{ id: string; name: string } | null>(null);

  const isLoading = isStudentLoading || isAttendanceLoading || isPaymentLoading;
  const studentName = student?.user?.fullName || 'طالب';
  const studentPhone = student?.user?.phone || student?.emergencyPhone || '';
  const enrollments = student?.groupEnrollments || [];
  const parents = student?.parentLinks || [];
  const parentPhone = parents?.[0]?.parent?.user?.phone || student?.emergencyPhone || '';

  const payments = paymentHistory || [];
  const totalPaid = payments.reduce((sum: number, p: any) => sum + (Number(p.amountPaid) || 0), 0);
  const totalDue = payments.reduce(
    (sum: number, p: any) => sum + Math.max(0, (Number(p.amountExpected) || 0) - (Number(p.amountPaid) || 0)),
    0
  );

  const handleConfirmRemoveGroup = () => {
    if (!groupToRemove || !studentId) return;
    removeStudentMutation.mutate(
      { groupId: groupToRemove.id, studentId },
      {
        onSuccess: () => {
          toast.success(`تمت إزالة الطالب من "${groupToRemove.name}" بنجاح`);
          setGroupToRemove(null);
        },
        onError: (err: any) => {
          toast.error(err?.message || 'تعذر إزالة الطالب من المجموعة');
        },
      }
    );
  };

  const handleDeleteStudent = () => {
    if (student) {
      deleteStudentMutation.mutate(student.id, {
        onSuccess: () => {
          setIsConfirmingDelete(false);
          onClose();
        },
      });
    }
  };

  return {
    student,
    isLoading,
    isError,
    studentName,
    studentPhone,
    enrollments,
    parents,
    parentPhone,
    payments,
    totalPaid,
    totalDue,
    attendanceHistory,
    isConfirmingDelete,
    setIsConfirmingDelete,
    isPasswordModalOpen,
    setIsPasswordModalOpen,
    passwordModalTab,
    setPasswordModalTab,
    isEditing,
    setIsEditing,
    isQrExpanded,
    setIsQrExpanded,
    groupToRemove,
    setGroupToRemove,
    updateStatusMutation,
    deleteStudentMutation,
    removeStudentMutation,
    handleConfirmRemoveGroup,
    handleDeleteStudent,
  };
}
