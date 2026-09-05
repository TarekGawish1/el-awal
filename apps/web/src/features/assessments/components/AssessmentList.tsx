'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, AlertCircle, Calendar, BookOpen, RotateCcw } from 'lucide-react';
import { useAssessments } from '../hooks/use-assessments';
import { AssessmentCard } from './AssessmentCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import { Select } from '@/components/ui/Select';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';

const PAGE_SIZE = 9;

export function AssessmentList() {
  const isOnline = useOnlineStatus();
  const { data: groups } = useGroups();
  const { activeYear, activeTerm } = useStoredAcademicPeriod(groups);

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

  const availableStages = ['PRIMARY', 'MIDDLE', 'SECONDARY'];

  const availableGrades = useMemo(() => {
    if (filterStage === 'PRIMARY') return ['الصف الأول الابتدائي', 'الصف الثاني الابتدائي', 'الصف الثالث الابتدائي', 'الصف الرابع الابتدائي', 'الصف الخامس الابتدائي', 'الصف السادس الابتدائي'];
    if (filterStage === 'MIDDLE') return ['الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي'];
    if (filterStage === 'SECONDARY') return ['الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي'];
    
    // If 'ALL' is selected, show grades dynamically from the existing ones, or just all grades
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
    setFilterGrade('ALL'); // Reset grade when stage changes
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

  const formatStageName = (stage: string) => {
    switch(stage) {
      case 'PRIMARY': return 'ابتدائي';
      case 'MIDDLE': return 'إعدادي';
      case 'SECONDARY': return 'ثانوي';
      default: return stage;
    }
  };

  const formatTermLabel = (term: string) => {
    switch (term) {
      case 'FIRST_TERM': return 'ترم أول';
      case 'SECOND_TERM': return 'ترم ثانٍ';
      default: return term;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">إدارة الاختبارات والواجبات</h1>
          <p className="text-slate-500 mt-1">قم بإنشاء وإدارة امتحاناتك وتقييم طلابك</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {isOnline ? (
            <Link href="/teacher/assessments/new?type=EXAM" className="w-full sm:w-auto">
              <Button variant="primary" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 ml-2" />
                اختبار جديد
              </Button>
            </Link>
          ) : (
            <span title="يتطلب إنشاء الاختبارات والواجبات اتصالاً بالإنترنت" className="w-full sm:w-auto">
              <Button variant="primary" className="w-full sm:w-auto" disabled>
                <Plus className="w-4 h-4 ml-2" />
                اختبار جديد
              </Button>
            </span>
          )}
          {isOnline ? (
            <Link href="/teacher/assessments/new?type=ASSIGNMENT" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto bg-white">
                <Plus className="w-4 h-4 ml-2" />
                واجب جديد
              </Button>
            </Link>
          ) : (
            <span title="يتطلب إنشاء الاختبارات والواجبات اتصالاً بالإنترنت" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto bg-white" disabled>
                <Plus className="w-4 h-4 ml-2" />
                واجب جديد
              </Button>
            </span>
          )}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
        {/* Top Row: Search & Type Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <Input
              className="pr-10 w-full bg-slate-50/60 border-slate-200"
              placeholder="ابحث عن اختبار أو واجب..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Type Toggle Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 w-full md:w-auto shadow-xs border border-slate-200/50">
            {[
              { id: 'ALL', label: 'الكل' },
              { id: 'EXAM', label: 'الامتحانات' },
              { id: 'ASSIGNMENT', label: 'الواجبات' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleFilterTypeChange(tab.id as 'ALL' | 'EXAM' | 'ASSIGNMENT')}
                className={`flex-1 md:flex-initial py-1.5 px-5 rounded-lg font-bold text-xs transition-all ${
                  filterType === tab.id
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Source Filter Row: Groups vs Online Courses */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 shrink-0">مصدر التقييم:</span>
          <div className="bg-slate-100 p-0.5 rounded-xl flex gap-1 w-full sm:w-auto shadow-xs border border-slate-200/50">
            {[
              { id: 'ALL', label: 'الكل' },
              { id: 'GROUP', label: 'المجموعات الدراسية' },
              { id: 'ONLINE', label: 'الكورسات أونلاين' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilterSource(tab.id as 'ALL' | 'GROUP' | 'ONLINE');
                  setFilterCourseId('ALL');
                  setCurrentPage(1);
                }}
                className={`flex-1 sm:flex-initial py-1.5 px-4 rounded-lg font-bold text-xs transition-all ${
                  filterSource === tab.id
                    ? tab.id === 'ONLINE'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Course dropdown — visible only when filtering by online courses */}
          {filterSource === 'ONLINE' && availableCourses.length > 0 && (
            <Select
              className="w-full sm:w-56 bg-white border-indigo-200 text-xs sm:text-sm"
              value={filterCourseId}
              onChange={(e) => { setFilterCourseId(e.target.value); setCurrentPage(1); }}
              options={[
                { label: 'جميع الكورسات', value: 'ALL' },
                ...availableCourses.map(({ id, title }) => ({ label: title, value: id })),
              ]}
            />
          )}
        </div>

        {/* Second Row: Academic Year, Term, Stage, Grade selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Academic Year Select */}
          <div>
            <Select
              className="w-full bg-slate-50 border-slate-200 text-xs sm:text-sm"
              value={filterYear}
              onChange={(e) => handleYearChange(e.target.value)}
              options={[
                { label: 'جميع الأعوام الدراسية', value: 'ALL' },
                ...availableYears.map((year) => ({
                  label: `العام الدراسي: ${year}`,
                  value: year,
                })),
              ]}
            />
          </div>

          {/* Academic Term Select */}
          <div>
            <Select
              className="w-full bg-slate-50 border-slate-200 text-xs sm:text-sm"
              value={filterTerm}
              onChange={(e) => handleTermChange(e.target.value)}
              options={[
                { label: 'جميع الفصول الدراسية', value: 'ALL' },
                ...availableTerms.map((term) => ({
                  label: term.label,
                  value: term.value,
                })),
              ]}
            />
          </div>

          {/* Stage Select */}
          <div>
            <Select
              className="w-full bg-slate-50 border-slate-200 text-xs sm:text-sm"
              value={filterStage}
              onChange={(e) => handleStageChange(e.target.value)}
              options={[
                { label: 'كل المراحل', value: 'ALL' },
                ...availableStages.map((stage) => ({
                  label: formatStageName(stage),
                  value: stage,
                })),
              ]}
            />
          </div>

          {/* Grade Select */}
          <div>
            <Select
              className="w-full bg-slate-50 border-slate-200 text-xs sm:text-sm"
              value={filterGrade}
              onChange={(e) => handleGradeChange(e.target.value)}
              options={[
                { label: 'كل الصفوف', value: 'ALL' },
                ...availableGrades.map((grade) => ({
                  label: grade,
                  value: grade,
                })),
              ]}
            />
          </div>
        </div>

        {/* Active Period & Filter Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700">الفترة النشطة:</span>
            {filterYear !== 'ALL' ? (
              <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 border border-primary-100 px-2 py-0.5 rounded-md font-medium">
                <Calendar className="w-3 h-3 text-primary-500" />
                {filterYear}
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                جميع الأعوام
              </span>
            )}
            {filterTerm !== 'ALL' ? (
              <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 border border-primary-100 px-2 py-0.5 rounded-md font-medium">
                <BookOpen className="w-3 h-3 text-primary-500" />
                {formatTermLabel(filterTerm)}
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                جميع الفصول
              </span>
            )}

            {filterStage !== 'ALL' && (
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                {formatStageName(filterStage)}
              </span>
            )}
            {filterGrade !== 'ALL' && (
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                {filterGrade}
              </span>
            )}
            {filterSource === 'ONLINE' && (
              <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md font-medium">
                كورسات أونلاين
                {filterCourseId !== 'ALL' && (
                  <span className="font-bold">: {availableCourses.find(c => c.id === filterCourseId)?.title}</span>
                )}
              </span>
            )}
            {filterSource === 'GROUP' && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md font-medium">
                مجموعات دراسية
              </span>
            )}
          </div>

          {hasNonDefaultFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 font-medium hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              إعادة تعيين الفلاتر
            </button>
          )}
        </div>
      </div>

      {isError ? (
        <Alert variant="error">
          <AlertCircle className="w-5 h-5 ml-2" />
          <div className="flex-1">
            <p className="font-semibold">فشل في تحميل الاختبارات</p>
            <p className="text-sm opacity-90">{(error as any)?.message || 'يرجى المحاولة مرة أخرى لاحقاً.'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mr-4">
            إعادة المحاولة
          </Button>
        </Alert>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 h-48 flex flex-col">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-full mb-auto" />
              <div className="flex gap-4 mt-4 pt-4 border-t border-slate-50">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : assessments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">لا توجد اختبارات أو واجبات بعد</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            قم بإنشاء اختبارك أو واجبك الأول لتبدأ في تقييم طلابك ومتابعة مستواهم الدراسي.
          </p>
          <div className="flex justify-center gap-3">
            {isOnline ? (
              <Link href="/teacher/assessments/new?type=EXAM">
                <Button variant="primary">
                  <Plus className="w-4 h-4 ml-2" />
                  إنشاء اختبار جديد
                </Button>
              </Link>
            ) : (
              <span title="يتطلب إنشاء الاختبارات والواجبات اتصالاً بالإنترنت">
                <Button variant="primary" disabled>
                  <Plus className="w-4 h-4 ml-2" />
                  إنشاء اختبار جديد
                </Button>
              </span>
            )}
            {isOnline ? (
              <Link href="/teacher/assessments/new?type=ASSIGNMENT">
                <Button variant="outline" className="bg-white">
                  <Plus className="w-4 h-4 ml-2" />
                  إنشاء واجب جديد
                </Button>
              </Link>
            ) : (
              <span title="يتطلب إنشاء الاختبارات والواجبات اتصالاً بالإنترنت">
                <Button variant="outline" className="bg-white" disabled>
                  <Plus className="w-4 h-4 ml-2" />
                  إنشاء واجب جديد
                </Button>
              </span>
            )}
          </div>
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-700">لا توجد نتائج مطابقة</h3>
          <p className="text-slate-500">لم يتم العثور على نتائج تطابق خيارات البحث الحالية.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedAssessments.map((assessment) => (
              <AssessmentCard key={assessment.id} assessment={assessment} />
            ))}
          </div>

          {/* Pagination Component */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAssessments.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              itemLabel="اختبار/واجب"
            />
          )}
        </div>
      )}
    </div>
  );
}
