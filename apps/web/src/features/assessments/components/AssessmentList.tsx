'use client';

import Link from 'next/link';
import { Plus, Search, FileText, AlertCircle } from 'lucide-react';
import { AssessmentCard } from './AssessmentCard';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';
import { useAssessmentListFilters, PAGE_SIZE } from '../hooks/useAssessmentListFilters';
import { AssessmentListFiltersToolbar } from './assessment-list/AssessmentListFiltersToolbar';

export function AssessmentList() {
  const isOnline = useOnlineStatus();
  const { data: groups } = useGroups();
  const { activeYear, activeTerm } = useStoredAcademicPeriod(groups);

  const {
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
  } = useAssessmentListFilters({
    groups: groups as any,
    activeYear,
    activeTerm,
  });

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
      <AssessmentListFiltersToolbar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        filterType={filterType}
        onFilterTypeChange={handleFilterTypeChange}
        filterSource={filterSource}
        onFilterSourceChange={(source) => {
          setFilterSource(source);
          setFilterCourseId('ALL');
          setCurrentPage(1);
        }}
        filterCourseId={filterCourseId}
        onFilterCourseIdChange={(courseId) => {
          setFilterCourseId(courseId);
          setCurrentPage(1);
        }}
        availableCourses={availableCourses}
        filterYear={filterYear}
        onYearChange={handleYearChange}
        availableYears={availableYears}
        filterTerm={filterTerm}
        onTermChange={handleTermChange}
        availableTerms={availableTerms}
        filterStage={filterStage}
        onStageChange={handleStageChange}
        availableStages={availableStages}
        filterGrade={filterGrade}
        onGradeChange={handleGradeChange}
        availableGrades={availableGrades}
        hasNonDefaultFilters={hasNonDefaultFilters}
        onResetFilters={handleResetFilters}
      />

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
