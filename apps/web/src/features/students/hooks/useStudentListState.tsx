'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useStudents } from './use-students';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';
import { Calendar, BookOpen, Users } from 'lucide-react';
import {
  STAGE_GRADES_MAP,
  getStageName,
  getStatusColor,
  getStatusText,
  filterStudentsList,
} from '../utils/studentListHelpers';

export { STAGE_GRADES_MAP, getStageName, getStatusColor, getStatusText };

export function useStudentListState() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<string | null>(null);
  const [selectedStudentForPassword, setSelectedStudentForPassword] = useState<{ id: string; name: string } | null>(null);

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setIsFiltersOpen(false);
      }
    };
    if (isFiltersOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFiltersOpen]);

  // Fetch groups to populate group filter options
  const { data: groups } = useGroups();

  // Synchronized System Academic Period (Read-only from global system switcher)
  const { activeYear, activeTerm } = useStoredAcademicPeriod(groups);

  // Local filter toolbar states initialized with system active period
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);

  // Automatically synchronize local filters when global system academic period changes from top navbar
  useEffect(() => {
    if (activeYear) {
      setSelectedYears([activeYear]);
    }
  }, [activeYear]);

  useEffect(() => {
    if (activeTerm) {
      setSelectedTerms([activeTerm]);
    }
  }, [activeTerm]);

  // Reset pagination state when any search or filter criteria changes
  useEffect(() => {
    setCursor(undefined);
    setCursorHistory([undefined]);
    setCurrentPage(1);
  }, [debouncedSearch, selectedStages, selectedGrades, selectedGroups, selectedYears, selectedTerms]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add('2026-2027');
    yearsSet.add('2024-2025');

    if (groups && Array.isArray(groups)) {
      groups.forEach((g) => {
        if (g.academicYear && g.academicYear.trim()) {
          yearsSet.add(g.academicYear.trim());
        }
      });
    }

    return Array.from(yearsSet)
      .sort()
      .reverse()
      .map((year) => ({
        label: year,
        value: year,
        icon: <Calendar className="w-3.5 h-3.5 text-primary-600" />,
      }));
  }, [groups]);

  const availableTerms = useMemo(
    () => [
      {
        label: 'الفصل الدراسي الأول (ترم أول)',
        value: 'FIRST_TERM',
        icon: <BookOpen className="w-3.5 h-3.5 text-primary-600" />,
      },
      {
        label: 'الفصل الدراسي الثاني (ترم ثانٍ)',
        value: 'SECOND_TERM',
        icon: <BookOpen className="w-3.5 h-3.5 text-primary-600" />,
      },
    ],
    []
  );

  // Map stage filter to backend stage code when a single stage is selected
  const stageQuery = useMemo(() => {
    if (selectedStages.length !== 1) return undefined;
    const s = selectedStages[0];
    if (s === 'المرحلة الابتدائية' || s === 'PRIMARY') return 'PRIMARY';
    if (s === 'المرحلة الإعدادية' || s === 'PREPARATORY' || s === 'MIDDLE') return 'PREPARATORY';
    if (s === 'المرحلة الثانوية' || s === 'SECONDARY') return 'SECONDARY';
    return s;
  }, [selectedStages]);

  const gradeQuery = useMemo(() => {
    if (selectedGrades.length !== 1) return undefined;
    return selectedGrades[0];
  }, [selectedGrades]);

  const groupQuery = useMemo(() => {
    if (selectedGroups.length !== 1) return undefined;
    return selectedGroups[0];
  }, [selectedGroups]);

  // Fetch students with server cursor pagination (limit: PAGE_SIZE = 10) and forwarded filters
  const { data, isLoading, isError } = useStudents({
    search: debouncedSearch.trim() || undefined,
    academicStage: stageQuery,
    gradeLevel: gradeQuery,
    groupId: groupQuery,
    cursor,
    limit: PAGE_SIZE,
  });

  // Calculate available grade options dynamically based on selected stages
  const availableGradeOptions = useMemo(() => {
    let gradesList: string[] = [];

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

    if (data?.data && Array.isArray(data.data)) {
      data.data.forEach((st) => {
        if (st.gradeLevel && !gradesList.includes(st.gradeLevel)) {
          const stStage = getStageName(st.gradeLevel, st.academicStage);
          if (selectedStages.length === 0 || selectedStages.includes(stStage)) {
            gradesList.push(st.gradeLevel);
          }
        }
      });
    }

    return Array.from(new Set(gradesList)).map((grade) => ({
      label: grade,
      value: grade,
    }));
  }, [selectedStages, data]);

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

  const handleGradesChange = useCallback((newGrades: string[]) => {
    setSelectedGrades(newGrades);
  }, []);

  const availableGroupOptions = useMemo(() => {
    if (!groups || !Array.isArray(groups)) return [];
    const groupOpts = groups
      .filter((g) => {
        const groupStage = getStageName(g.gradeLevel);
        const matchesStage = selectedStages.length === 0 || selectedStages.includes(groupStage);
        const matchesGrade = selectedGrades.length === 0 || selectedGrades.includes(g.gradeLevel);
        const matchesYear =
          selectedYears.length === 0 ||
          (g.academicYear && selectedYears.includes(g.academicYear));
        const matchesTerm =
          selectedTerms.length === 0 ||
          (g.academicTerm && selectedTerms.includes(g.academicTerm));

        return matchesStage && matchesGrade && matchesYear && matchesTerm;
      })
      .map((g) => ({
        label: g.name,
        value: g.id,
        icon: <Users className="w-3.5 h-3.5 text-primary-600" />,
      }));

    return [
      {
        label: 'غير معين (بدون مجموعة)',
        value: 'UNASSIGNED',
        icon: <Users className="w-3.5 h-3.5 text-amber-500" />,
      },
      ...groupOpts,
    ];
  }, [groups, selectedStages, selectedGrades, selectedYears, selectedTerms]);

  const groupMap = useMemo(() => {
    if (!groups || !Array.isArray(groups)) return new Map<string, any>();
    return new Map(groups.map((g) => [g.id, g]));
  }, [groups]);

  useEffect(() => {
    if (selectedGroups.length > 0) {
      const validGroupIds = new Set(availableGroupOptions.map((g) => g.value));
      setSelectedGroups((prev) => {
        const filtered = prev.filter((id) => validGroupIds.has(id));
        return filtered.length === prev.length ? prev : filtered;
      });
    }
  }, [availableGroupOptions, selectedGroups.length]);

  const filteredStudents = useMemo(() => {
    return filterStudentsList(data?.data, {
      searchTerm,
      selectedStages,
      selectedGrades,
      selectedGroups,
      selectedYears,
      selectedTerms,
      groupMap,
    });
  }, [data?.data, searchTerm, selectedStages, selectedGrades, selectedGroups, selectedYears, selectedTerms, groupMap]);

  const hasMore = Boolean(data?.meta?.hasMore);
  const totalStudents = data?.meta?.total;
  const maxReachablePage = hasMore
    ? Math.max(cursorHistory.length + 1, currentPage + 1)
    : Math.max(cursorHistory.length, currentPage);
  const totalPages = Math.max(1, maxReachablePage);

  const handlePageChange = useCallback(
    (page: number) => {
      if (page === currentPage || page < 1) return;

      if (page > currentPage) {
        if (page === currentPage + 1 && data?.meta?.nextCursor) {
          const nextCursor = data.meta.nextCursor;
          setCursorHistory((prev) => {
            const next = [...prev];
            next[page - 1] = nextCursor;
            return next;
          });
          setCursor(nextCursor);
          setCurrentPage(page);
        } else if (cursorHistory[page - 1] !== undefined || page === 1) {
          setCursor(cursorHistory[page - 1]);
          setCurrentPage(page);
        }
      } else {
        const targetCursor = cursorHistory[page - 1];
        setCursor(targetCursor);
        setCurrentPage(page);
      }
    },
    [currentPage, data?.meta?.nextCursor, cursorHistory]
  );

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedStages.length > 0 ||
    selectedGrades.length > 0 ||
    selectedGroups.length > 0 ||
    selectedYears.length > 0 ||
    selectedTerms.length > 0;

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedStages([]);
    setSelectedGrades([]);
    setSelectedGroups([]);
    setSelectedYears([]);
    setSelectedTerms([]);
    setCursor(undefined);
    setCursorHistory([undefined]);
    setCurrentPage(1);
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    PAGE_SIZE,
    availableYears,
    selectedYears,
    setSelectedYears,
    availableTerms,
    selectedTerms,
    setSelectedTerms,
    isFiltersOpen,
    setIsFiltersOpen,
    filtersRef,
    selectedStages,
    handleStagesChange,
    availableGradeOptions,
    selectedGrades,
    handleGradesChange,
    availableGroupOptions,
    selectedGroups,
    setSelectedGroups,
    hasActiveFilters,
    totalStudents,
    filteredStudents,
    resetFilters,
    isLoading,
    isError,
    totalPages,
    hasMore,
    cursor,
    handlePageChange,
    selectedStudentForModal,
    setSelectedStudentForModal,
    selectedStudentForPassword,
    setSelectedStudentForPassword,
    getStatusColor,
    getStatusText,
  };
}
