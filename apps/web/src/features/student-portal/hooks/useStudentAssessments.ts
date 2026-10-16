'use client';

import { useState, useEffect } from 'react';
import { useAssessments } from '@/features/assessments/hooks/use-assessments';

export interface UseStudentAssessmentsProps {
  fixedType?: 'EXAM' | 'ASSIGNMENT' | 'ALL';
}

export function useStudentAssessments({
  fixedType = 'EXAM',
}: UseStudentAssessmentsProps) {
  const [filterType, setFilterType] = useState<'ALL' | 'EXAM' | 'ASSIGNMENT'>(fixedType);
  const [currentPage, setCurrentPage] = useState(1);
  const { data: assessmentsData, isLoading, isError } = useAssessments();

  // Live ticking clock for countdown badges
  const [nowMs, setNowMs] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const PAGE_SIZE = 6;
  const assessments = assessmentsData?.data || [];
  const effectiveFilter = fixedType !== 'ALL' ? fixedType : filterType;

  const filteredAssessments = assessments.filter((item: any) => {
    // Exclude course-linked quizzes (taken inside learning room)
    if (item.courseId || item.lessonId) return false;
    if (effectiveFilter === 'ALL') return true;
    return item.type === effectiveFilter;
  });

  const totalPages = Math.ceil(filteredAssessments.length / PAGE_SIZE);
  const paginatedAssessments = filteredAssessments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const getExamTimingStatus = (item: any) => {
    const rawStart = item.startTime || item.startDate;
    const rawEnd = item.endTime || item.dueDate || item.deadline;
    const startTimeMs = rawStart ? new Date(rawStart).getTime() : null;
    const endTimeMs = rawEnd ? new Date(rawEnd).getTime() : null;

    const isUpcoming = Boolean(startTimeMs && startTimeMs > nowMs);
    const isEnded = Boolean(endTimeMs && endTimeMs < nowMs);
    const isActive = !isUpcoming && !isEnded;

    let countdownFormatted = '';
    if (isUpcoming && startTimeMs) {
      const diffSecs = Math.max(0, Math.floor((startTimeMs - nowMs) / 1000));
      const hours = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      const secs = diffSecs % 60;
      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        countdownFormatted = `${days} يوم ${remHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      } else {
        countdownFormatted = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
    }

    return {
      isUpcoming,
      isEnded,
      isActive,
      countdownFormatted,
      startTime: rawStart ? new Date(rawStart) : null,
      endTime: rawEnd ? new Date(rawEnd) : null,
    };
  };

  const getStatus = (item: any) => {
    const isPastDue = item.dueDate ? new Date(item.dueDate) < new Date() : false;
    return {
      isPastDue,
    };
  };

  return {
    filterType,
    setFilterType,
    currentPage,
    setCurrentPage,
    isLoading,
    isError,
    PAGE_SIZE,
    filteredAssessments,
    paginatedAssessments,
    totalPages,
    getExamTimingStatus,
    getStatus,
  };
}
