'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTodaySessions, useSessionReport } from '@/features/attendance/hooks/use-attendance';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';
import { useTeacherSessions } from '@/features/schedules/hooks/useSchedules';
import {
  STAGE_GRADES_MAP,
  getStageName,
  isSessionTooEarly,
  isSessionEnded,
} from '../utils/attendanceFormatters';

export type AttendanceTab = 'QR' | 'QR_HOMEWORK' | 'LOGBOOK';
export type SessionScope = 'TODAY' | 'WEEK' | 'ALL';

export function useTeacherAttendancePage() {
  const searchParams = useSearchParams();
  const paramSessionId = searchParams.get('sessionId');
  const paramGroupId = searchParams.get('groupId');
  const paramTab = searchParams.get('tab') as AttendanceTab | null;

  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(paramSessionId || '');
  const [sessionScope, setSessionScope] = useState<SessionScope>('TODAY');
  const [activeTab, setActiveTab] = useState<AttendanceTab>(paramTab || 'QR');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: groups } = useGroups();
  const { selectedYears, selectedTerms } = useStoredAcademicPeriod(groups);

  const activeYear = selectedYears[0] || undefined;
  const activeTerm = selectedTerms[0] || undefined;

  const { data: sessions, isLoading: isLoadingSessions, isError: isErrorSessions } = useTodaySessions(
    undefined,
    undefined,
    activeYear,
    activeTerm,
  );

  const { data: allTeacherSessions = [], isLoading: isLoadingAllSessions } = useTeacherSessions(
    {
      academicYear: activeYear,
      academicTerm: activeTerm,
      timeframe: 'ALL',
    },
    {
      enabled: sessionScope !== 'TODAY',
    },
  );

  // Lookup map from groupId to group
  const groupMap = useMemo(() => {
    if (!groups || !Array.isArray(groups)) return new Map();
    return new Map(groups.map((g) => [g.id, g]));
  }, [groups]);

  // Unique places/locations
  const availableLocations = useMemo(() => {
    const locSet = new Set<string>();
    if (groups && Array.isArray(groups)) {
      groups.forEach((g) => {
        g.schedules?.forEach((s) => {
          if (s.location && s.location.trim()) locSet.add(s.location.trim());
        });
      });
    }
    return Array.from(locSet);
  }, [groups]);

  // Calculate available grade options dynamically based on selected stages
  const availableGradeOptions = useMemo(() => {
    const gradesList: string[] = [];

    if (selectedStages.length > 0) {
      selectedStages.forEach((stage) => {
        if (STAGE_GRADES_MAP[stage]) {
          gradesList.push(...STAGE_GRADES_MAP[stage]);
        }
      });
    } else {
      Object.values(STAGE_GRADES_MAP).forEach((grades) => {
        gradesList.push(...grades);
      });
    }

    if (allTeacherSessions && Array.isArray(allTeacherSessions)) {
      allTeacherSessions.forEach((s: any) => {
        const g = groupMap.get(s.groupId) || s.group;
        const gGrade = g?.gradeLevel;
        if (gGrade && !gradesList.includes(gGrade)) {
          const sStage = getStageName(gGrade);
          if (selectedStages.length === 0 || selectedStages.includes(sStage)) {
            gradesList.push(gGrade);
          }
        }
      });
    }

    return Array.from(new Set(gradesList)).map((grade) => ({
      label: grade,
      value: grade,
    }));
  }, [selectedStages, allTeacherSessions, groupMap]);

  // Handle stage change & prune non-matching grades
  const handleStagesChange = useCallback((newStages: string[]) => {
    setSelectedStages(newStages);
    if (newStages.length > 0) {
      setSelectedGrades((prevGrades) =>
        prevGrades.filter((grade) => {
          const stage = getStageName(grade);
          return newStages.includes(stage);
        })
      );
    }
  }, []);

  // Filter today's sessions
  const filteredSessions = useMemo(() => {
    if (!sessions || !Array.isArray(sessions)) return [];
    return sessions.filter((s: any) => {
      const g = groupMap.get(s.groupId) || s.group;
      const gGrade = g?.gradeLevel || '';
      const stage = getStageName(gGrade);

      if (activeYear && g?.academicYear && g.academicYear !== activeYear) return false;
      if (activeTerm && g?.academicTerm && g.academicTerm !== activeTerm) return false;

      const matchesStage = selectedStages.length === 0 || selectedStages.includes(stage);
      const matchesGrade = selectedGrades.length === 0 || selectedGrades.includes(gGrade);

      const fullGroup = groupMap.get(s.groupId) || g;
      const groupLocations = fullGroup?.schedules?.map((sch: any) => sch.location).filter(Boolean) || [];
      const matchesLocation =
        selectedLocations.length === 0 ||
        groupLocations.some((loc: string) => selectedLocations.includes(loc));

      return matchesStage && matchesGrade && matchesLocation;
    });
  }, [sessions, groupMap, selectedStages, selectedGrades, selectedLocations, activeYear, activeTerm]);

  // Filter all semester sessions
  const filteredAllSessions = useMemo(() => {
    if (!allTeacherSessions || !Array.isArray(allTeacherSessions)) return [];
    return allTeacherSessions.filter((s: any) => {
      const g = groupMap.get(s.groupId) || s.group;
      const gGrade = g?.gradeLevel || '';
      const stage = getStageName(gGrade);

      if (activeYear && g?.academicYear && g.academicYear !== activeYear) return false;
      if (activeTerm && g?.academicTerm && g.academicTerm !== activeTerm) return false;

      const matchesStage = selectedStages.length === 0 || selectedStages.includes(stage);
      const matchesGrade = selectedGrades.length === 0 || selectedGrades.includes(gGrade);

      const fullGroup = groupMap.get(s.groupId) || g;
      const groupLocations = fullGroup?.schedules?.map((sch: any) => sch.location).filter(Boolean) || [];
      const matchesLocation =
        selectedLocations.length === 0 ||
        groupLocations.some((loc: string) => selectedLocations.includes(loc));

      return matchesStage && matchesGrade && matchesLocation;
    });
  }, [allTeacherSessions, groupMap, selectedStages, selectedGrades, selectedLocations, activeYear, activeTerm]);

  // Filter sessions for the current week (Saturday to Friday)
  const currentWeekSessions = useMemo(() => {
    if (!filteredAllSessions || !Array.isArray(filteredAllSessions)) return [];
    const now = new Date();
    const currentDay = now.getDay();
    const daysSinceSaturday = (currentDay + 1) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysSinceSaturday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return filteredAllSessions.filter((s: any) => {
      if (!s.sessionDate) return false;
      const sDate = new Date(s.sessionDate);
      return sDate >= startOfWeek && sDate <= endOfWeek;
    });
  }, [filteredAllSessions]);

  const displaySessions = useMemo(() => {
    if (sessionScope === 'WEEK') return currentWeekSessions;
    if (sessionScope === 'ALL') return filteredAllSessions;
    return filteredSessions;
  }, [sessionScope, currentWeekSessions, filteredAllSessions, filteredSessions]);

  const scopeCountLabel = useMemo(() => {
    if (sessionScope === 'WEEK') return `${currentWeekSessions.length} حصص هذا الأسبوع`;
    if (sessionScope === 'ALL') return `${filteredAllSessions.length} حصة مجدولة`;
    return `${filteredSessions.length} حصص اليوم`;
  }, [sessionScope, currentWeekSessions.length, filteredAllSessions.length, filteredSessions.length]);

  // Auto-select session
  useEffect(() => {
    if (paramSessionId) {
      if (selectedSessionId !== paramSessionId) {
        setSelectedSessionId(paramSessionId);
      }
      return;
    }

    if (paramGroupId) {
      const cleanGroupId = String(paramGroupId).toLowerCase();
      const todayGroupSession =
        (filteredSessions || []).find((s: any) => String(s.groupId).toLowerCase() === cleanGroupId) ||
        (sessions || []).find((s: any) => String(s.groupId).toLowerCase() === cleanGroupId);
      if (todayGroupSession) {
        if (selectedSessionId !== todayGroupSession.id) {
          setSelectedSessionId(todayGroupSession.id);
        }
        return;
      }

      const allGroupSession =
        (filteredAllSessions || []).find((s: any) => String(s.groupId).toLowerCase() === cleanGroupId) ||
        (allTeacherSessions || []).find((s: any) => String(s.groupId).toLowerCase() === cleanGroupId);
      if (allGroupSession) {
        if (selectedSessionId !== allGroupSession.id) {
          setSelectedSessionId(allGroupSession.id);
        }
        return;
      }

      if (selectedSessionId) return;
    }

    const isCurrentInFilteredToday = filteredSessions.some(
      (s: any) => String(s.id).toLowerCase() === String(selectedSessionId).toLowerCase()
    );
    const isCurrentInFilteredAll = filteredAllSessions.some(
      (s: any) => String(s.id).toLowerCase() === String(selectedSessionId).toLowerCase()
    );

    if (selectedSessionId && (isCurrentInFilteredToday || isCurrentInFilteredAll)) {
      return;
    }

    if (filteredSessions.length > 0) {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();

      let activeSession: any = null;
      let minDiff = Infinity;

      for (const s of filteredSessions) {
        if (!s.startTime) continue;
        const [h, m] = s.startTime.split(':').map(Number);
        if (isNaN(h)) continue;

        const sessionMins = h * 60 + m;
        const diff = Math.abs(sessionMins - nowMins);

        if (diff <= 120 && diff < minDiff) {
          minDiff = diff;
          activeSession = s;
        }
      }

      if (activeSession) {
        setSelectedSessionId(activeSession.id);
      } else {
        setSelectedSessionId(filteredSessions[0].id);
      }
    } else {
      setSelectedSessionId('');
    }
  }, [filteredSessions, filteredAllSessions, sessions, allTeacherSessions, selectedSessionId, paramSessionId, paramGroupId]);

  const { data: report, isLoading: isLoadingReport, isError: isErrorReport } = useSessionReport(selectedSessionId);

  const resetFilters = () => {
    setSelectedStages([]);
    setSelectedGrades([]);
    setSelectedLocations([]);
  };

  const activeFiltersCount =
    (selectedStages.length > 0 ? 1 : 0) +
    (selectedGrades.length > 0 ? 1 : 0) +
    (selectedLocations.length > 0 ? 1 : 0);

  const activeSessionObj = useMemo(() => {
    if (!selectedSessionId) return null;
    return (
      filteredSessions.find((s) => s.id === selectedSessionId) ||
      sessions?.find((s: any) => s.id === selectedSessionId) ||
      filteredAllSessions.find((s) => s.id === selectedSessionId) ||
      allTeacherSessions?.find((s: any) => s.id === selectedSessionId)
    );
  }, [selectedSessionId, filteredSessions, sessions, filteredAllSessions, allTeacherSessions]);

  const activeGroup = useMemo(() => {
    if (!activeSessionObj) return null;
    return groupMap.get(activeSessionObj.groupId) || (activeSessionObj as unknown as { group?: any }).group;
  }, [activeSessionObj, groupMap]);

  const isTooEarly = useMemo(() => isSessionTooEarly(activeSessionObj), [activeSessionObj]);
  const isEnded = useMemo(() => isSessionEnded(activeSessionObj), [activeSessionObj]);

  const handleSelectSession = (id: string) => {
    setSelectedSessionId(id);
    const targetSession = (filteredAllSessions || []).find((s: any) => s.id === id);
    if (targetSession) {
      const dateStr = targetSession.sessionDate?.includes('T')
        ? targetSession.sessionDate.split('T')[0]
        : targetSession.sessionDate;
      const timePart =
        targetSession.endTime?.split(':').length === 2
          ? `${targetSession.endTime}:00`
          : targetSession.endTime || '23:59:00';
      const endDt = new Date(`${dateStr}T${timePart}`);
      if (!isNaN(endDt.getTime()) && endDt < new Date()) {
        setActiveTab('LOGBOOK');
      }
    }
  };

  return {
    paramSessionId,
    selectedStages,
    selectedGrades,
    setSelectedGrades,
    selectedLocations,
    setSelectedLocations,
    selectedSessionId,
    setSelectedSessionId,
    sessionScope,
    setSessionScope,
    activeTab,
    setActiveTab,
    isFilterDrawerOpen,
    setIsFilterDrawerOpen,
    isCreateModalOpen,
    setIsCreateModalOpen,
    activeYear,
    activeTerm,
    isLoadingSessions,
    isErrorSessions,
    isLoadingAllSessions,
    groupMap,
    availableLocations,
    availableGradeOptions,
    handleStagesChange,
    filteredAllSessions,
    displaySessions,
    scopeCountLabel,
    report,
    isLoadingReport,
    isErrorReport,
    resetFilters,
    activeFiltersCount,
    activeSessionObj,
    activeGroup,
    isTooEarly,
    isEnded,
    handleSelectSession,
  };
}
