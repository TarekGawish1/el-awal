'use client';

import { useState } from 'react';
import { LessonSessionItem } from '../types/schedules.types';
import { useDeleteSession, useGroupSessions, useUpdateSession } from './useSchedules';
import { useAssessments } from '@/features/assessments/hooks/use-assessments';
import toast from 'react-hot-toast';

interface UseSessionDetailsModalProps {
  session: LessonSessionItem | null;
  onClose: () => void;
}

export function useSessionDetailsModal({ session, onClose }: UseSessionDetailsModalProps) {
  const [activeVideo, setActiveVideo] = useState<any | null>(null);
  const [isCancellingMode, setIsCancellingMode] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [cancellationReasonInput, setCancellationReasonInput] = useState('');

  const { mutate: deleteSessionMutate, isPending: isDeleting } = useDeleteSession();
  const { mutate: updateSessionMutate, isPending: isUpdating } = useUpdateSession();

  const { data: assessmentsData = [] } = useAssessments(
    session?.groupId ? { groupId: session.groupId } : undefined
  );
  const groupAssessments = Array.isArray(assessmentsData) ? assessmentsData : [];

  const { data: groupSessions = [] } = useGroupSessions(session?.groupId);

  const formatArabicFullDate = (dateStr: string) => {
    try {
      const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const [y, m, d] = cleanDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const cleanSessionDate = session?.sessionDate
    ? session.sessionDate.includes('T')
      ? session.sessionDate.split('T')[0]
      : session.sessionDate
    : '';

  const getSessionTime = (s: LessonSessionItem): number => {
    const date = new Date(
      (s.sessionDate || '').includes('T') ? s.sessionDate : `${s.sessionDate || ''}T00:00:00`,
    );
    const time = s.startTime || s.endTime;
    if (time) {
      const [h, m] = time.split(':').map(Number);
      if (!isNaN(h)) date.setHours(h, m, 0, 0);
    }
    return date.getTime();
  };

  const currentSessionTime = session ? getSessionTime(session) : 0;
  const nextSession = (groupSessions || [])
    .filter((s: LessonSessionItem) => !s.isCancelled && getSessionTime(s) > currentSessionTime)
    .sort((a: LessonSessionItem, b: LessonSessionItem) => getSessionTime(a) - getSessionTime(b))[0] || null;

  const hwDueDateParam = nextSession
    ? `&dueDate=${nextSession.sessionDate.split('T')[0]}T${nextSession.startTime || nextSession.endTime || '23:59'}`
    : '';

  const buildAssessmentLink = (type: 'ASSIGNMENT' | 'EXAM') => {
    if (!session) return '';
    return `/teacher/assessments/new?type=${type}&groupId=${session.groupId}&topic=${encodeURIComponent(session.topic || '')}${type === 'EXAM' ? hwDueDateParam : ''}`;
  };

  const isToday = cleanSessionDate === todayStr;
  const isUpcoming = cleanSessionDate > todayStr;
  const isPast = cleanSessionDate < todayStr;

  const handleCancelSessionForDay = () => {
    if (!session) return;
    updateSessionMutate(
      {
        id: session.id,
        payload: {
          isCancelled: true,
          cancellationReason: cancellationReasonInput.trim() || 'إلغاء الحصة لهذا اليوم',
        },
      },
      {
        onSuccess: () => {
          toast.success('تم تحديد الحصة كملغاة لهذا اليوم');
          setIsCancellingMode(false);
          setCancellationReasonInput('');
          onClose();
        },
        onError: (err: any) => {
          toast.error(err.message || 'فشل إلغاء الحصة');
        },
      },
    );
  };

  const handleReactivateSession = () => {
    if (!session) return;
    updateSessionMutate(
      {
        id: session.id,
        payload: {
          isCancelled: false,
          cancellationReason: null,
        },
      },
      {
        onSuccess: () => {
          toast.success('تم إلغاء حالة الإلغاء وتفعيل الحصة بنجاح');
          onClose();
        },
        onError: (err: any) => {
          toast.error(err.message || 'فشل تفعيل الحصة');
        },
      },
    );
  };

  const handleDelete = () => {
    if (!session) return;
    deleteSessionMutate(session.id, {
      onSuccess: () => {
        toast.success('تم حذف الحصة بنجاح');
        setIsDeleteConfirmOpen(false);
        onClose();
      },
      onError: (err: any) => toast.error(err.message || 'فشل حذف الحصة'),
    });
  };

  return {
    activeVideo,
    setActiveVideo,
    isCancellingMode,
    setIsCancellingMode,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    cancellationReasonInput,
    setCancellationReasonInput,
    groupAssessments,
    isDeleting,
    isUpdating,
    cleanSessionDate,
    isToday,
    isUpcoming,
    isPast,
    formatArabicFullDate,
    buildAssessmentLink,
    handleCancelSessionForDay,
    handleReactivateSession,
    handleDelete,
  };
}
