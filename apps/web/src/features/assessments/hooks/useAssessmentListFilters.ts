import { useState, useMemo, useEffect } from 'react';
import { useAssessments } from './use-assessments';

export const PAGE_SIZE = 9;

export interface UseAssessmentListFiltersOptions {
  groups?: Array<{ academicYear?: string }>;
  activeYear?: string | null;
  activeTerm?: string | null;
}

export function useAssessmentListFilters({
  groups,
  activeYear,
  activeTerm,
}: UseAssessmentListFiltersOptions) {
  // Local filter toolbar states initialized with system active period
  const [filterYear, setFilterYear] = useState<string>(() => activeYear || 'ALL');
  const [filterTerm, setFilterTerm] = useState<string>(() => activeTerm || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'EXAM' | 'ASSIGNMENT'>('ALL');
  const [filterStage, setFilterStage] = useState<string>('ALL');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [filterSource, setFilterSource] = useState<'ALL' | 'GROUP' | 'ONLINE'>('ALL');
  const [filterCourseId, setFilterCourseId] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Automatically synchronize local filters when global system academic period changes from top navbar
  useEffect(() => {
    if (activeYear) {
      setFilterYear(activeYear);
      setCurrentPage(1);
    }
  }, [activeYear]);

  useEffect(() => {
    if (activeTerm) {
      setFilterTerm(activeTerm);
      setCurrentPage(1);
    }
  }, [activeTerm]);

  // Query parameters passed to server API when online
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (filterYear !== 'ALL') params.academicYear = filterYear;
    if (filterTerm !== 'ALL') params.academicTerm = filterTerm;
    if (filterType !== 'ALL') params.type = filterType;
    return Object.keys(params).length > 0 ? params : undefined;
  }, [filterYear, filterTerm, filterType]);

  const { data, isLoading, isError, error, refetch } = useAssessments(queryParams);
  const assessments = data?.data || [];

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add('2028-2029');
    yearsSet.add('2027-2028');
    yearsSet.add('2026-2027');
    yearsSet.add('2025-2026');
    yearsSet.add('2024-2025');

    if (groups && Array.isArray(groups)) {
      groups.forEach((g) => {
        if (g.academicYear && g.academicYear.trim()) {
          yearsSet.add(g.academicYear.trim());
        }
      });
    }

    assessments.forEach((a) => {
      if (a.group?.academicYear) yearsSet.add(a.group.academicYear);
      if (a.targetGroups) {
        a.targetGroups.forEach((tg) => {
          if (tg.academicYear) yearsSet.add(tg.academicYear);
        });
      }
      if (a.course?.academicYear) yearsSet.add(a.course.academicYear);
    });

    return Array.from(yearsSet).sort().reverse();
  }, [groups, assessments]);

  const availableTerms = useMemo(
    () => [
      { label: 'الفصل الأول (ترم أول)', value: 'FIRST_TERM' },
      { label: 'الفصل الثاني (ترم ثانٍ)', value: 'SECOND_TERM' },
    ],
    []
  );

  // Unique courses derived from loaded assessments
  const availableCourses = useMemo(() => {
    const map = new Map<string, string>();
    assessments.forEach((a) => {
      if (a.course?.id && a.course?.title) map.set(a.course.id, a.course.title);
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [assessments]);

  const filteredAssessments = useMemo(() => {
    return assessments.filter((assessment) => {
      const matchesSearch = assessment.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'ALL' || assessment.type === filterType;
      const matchesStage = filterStage === 'ALL' || assessment.academicStage === filterStage;
      const matchesGrade = filterGrade === 'ALL' || assessment.gradeLevel === filterGrade;

      // Source filter: GROUP vs ONLINE COURSE
      const isOnlineCourse = Boolean(assessment.course?.id);
      const matchesSource =
        filterSource === 'ALL' ||
        (filterSource === 'ONLINE' && isOnlineCourse) ||
        (filterSource === 'GROUP' && !isOnlineCourse);

      // Course filter (only applies when source=ONLINE)
      const matchesCourse =
        filterCourseId === 'ALL' || assessment.course?.id === filterCourseId;

      // Filter by academic year
      const hasYearAttached = Boolean(
        assessment.group?.academicYear ||
        assessment.targetGroups?.some((tg) => tg.academicYear) ||
        assessment.course?.academicYear
      );

      const matchesYear =
        filterYear === 'ALL' ||
        !hasYearAttached ||
        assessment.group?.academicYear === filterYear ||
        assessment.targetGroups?.some((tg) => tg.academicYear === filterYear) ||
        assessment.course?.academicYear === filterYear;

      // Filter by academic term
      const hasTermAttached = Boolean(
        assessment.group?.academicTerm ||
        assessment.targetGroups?.some((tg) => tg.academicTerm) ||
        assessment.course?.academicTerm
      );

      const matchesTerm =
        filterTerm === 'ALL' ||
        !hasTermAttached ||
        assessment.group?.academicTerm === filterTerm ||
        assessment.targetGroups?.some((tg) => tg.academicTerm === filterTerm) ||
        assessment.course?.academicTerm === filterTerm;

      return matchesSearch && matchesType && matchesStage && matchesGrade && matchesSource && matchesCourse && matchesYear && matchesTerm;
    });
  }, [assessments, searchQuery, filterType, filterStage, filterGrade, filterSource, filterCourseId, filterYear, filterTerm]);

  const availableStages = ['PRIMARY', 'PREPARATORY', 'SECONDARY'];

  const availableGrades = useMemo(() => {
    if (filterStage === 'PRIMARY') return ['الصف الأول الابتدائي', 'الصف الثاني الابتدائي', 'الصف الثالث الابتدائي', 'الصف الرابع الابتدائي', 'الصف الخامس الابتدائي', 'الصف السادس الابتدائي'];
    if (filterStage === 'PREPARATORY' || filterStage === 'MIDDLE') return ['الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي'];
    if (filterStage === 'SECONDARY') return ['الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي'];
    
    const grades = new Set<string>();
    assessments.forEach(a => {
      if (a.gradeLevel) grades.add(a.gradeLevel);
    });
    return Array.from(grades);
  }, [assessments, filterStage]);

  const totalPages = Math.ceil(filteredAssessments.length / PAGE_SIZE);

  const paginatedAssessments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAssessments.slice(start, start + PAGE_SIZE);
  }, [filteredAssessments, currentPage]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleFilterTypeChange = (type: 'ALL' | 'EXAM' | 'ASSIGNMENT') => {
    setFilterType(type);
    setCurrentPage(1);
  };

  const handleYearChange = (val: string) => {
    setFilterYear(val);
    setCurrentPage(1);
  };

  const handleTermChange = (val: string) => {
    setFilterTerm(val);
    setCurrentPage(1);
  };

  const handleStageChange = (val: string) => {
    setFilterStage(val);
    setFilterGrade('ALL');
    setCurrentPage(1);
  };

  const handleGradeChange = (val: string) => {
    setFilterGrade(val);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterType('ALL');
    setFilterStage('ALL');
    setFilterGrade('ALL');
    setFilterSource('ALL');
    setFilterCourseId('ALL');
    setFilterYear(activeYear || 'ALL');
    setFilterTerm(activeTerm || 'ALL');
    setCurrentPage(1);
  };

  const hasNonDefaultFilters =
    searchQuery !== '' ||
    filterType !== 'ALL' ||
    filterStage !== 'ALL' ||
    filterGrade !== 'ALL' ||
    filterSource !== 'ALL' ||
    filterCourseId !== 'ALL' ||
    filterYear !== (activeYear || 'ALL') ||
    filterTerm !== (activeTerm || 'ALL');

  return {
    assessments,
    isLoading,
    isError,
    error,
    refetch,
    filterYear,
    filterTerm,
    searchQuery,
    filterType,
    filterStage,
    filterGrade,
    filterSource,
    filterCourseId,
    currentPage,
    setCurrentPage,
    setFilterSource,
    setFilterCourseId,
    availableYears,
    availableTerms,
    availableCourses,
    availableStages,
    availableGrades,
    filteredAssessments,
    paginatedAssessments,
    totalPages,
    handleSearchChange,
    handleFilterTypeChange,
    handleYearChange,
    handleTermChange,
    handleStageChange,
    handleGradeChange,
    handleResetFilters,
    hasNonDefaultFilters,
  };
}
