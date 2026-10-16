'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAssessment } from '@/features/assessments/hooks/use-assessments';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, RefreshCcw } from 'lucide-react';
import { FeatureRequiresOnlineCard } from '@/components/offline/FeatureRequiresOnlineCard';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import { useStudentAssessments } from '../hooks/useStudentAssessments';
import { AssessmentsOverviewList } from './assessments/AssessmentsOverviewList';
import { ActiveExamRunner } from './assessments/ActiveExamRunner';

export function StudentAssessmentsContent({
  fixedType = 'EXAM',
}: {
  fixedType?: 'EXAM' | 'ASSIGNMENT' | 'ALL';
}) {
  const isOnline = useOnlineStatus();
  const router = useRouter();
  const searchParams = useSearchParams();

  const paramId = searchParams.get('id') || searchParams.get('assessmentId');
  const returnUrl = searchParams.get('returnUrl');
  const courseId = searchParams.get('courseId');
  const lessonId = searchParams.get('lessonId');
  const retakeParam = searchParams.get('retake') === '1';

  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(
    paramId || null
  );

  useEffect(() => {
    if (paramId) {
      setActiveAssessmentId(paramId);
    }
  }, [paramId]);

  const {
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
  } = useStudentAssessments({ fixedType });

  const {
    data: activeAssessmentData,
    isLoading: isLoadingActive,
    isError: isErrorActive,
    refetch: refetchActiveAssessment,
  } = useAssessment(activeAssessmentId || '');

  if (!isOnline) {
    return (
      <FeatureRequiresOnlineCard
        featureName="الاختبارات والواجبات غير متاحة أوفلاين"
        description="لحل الواجبات والاختبارات وتسليم الإجابات ورصد درجاتك، يرجى الاتصال بالإنترنت."
      />
    );
  }

  // Active Assessment View
  if (activeAssessmentId) {
    if (isLoadingActive) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      );
    }

    if (isErrorActive || !activeAssessmentData) {
      return (
        <Alert variant="error" className="my-8">
          <div className="flex flex-col gap-3">
            <span className="font-bold">حدث خطأ أثناء تحميل بيانات الاختبار.</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchActiveAssessment()}
                className="gap-2 cursor-pointer"
              >
                <RefreshCcw className="w-4 h-4" />
                إعادة المحاولة
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveAssessmentId(null);
                  router.push(window.location.pathname);
                }}
                className="gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                العودة للقائمة
              </Button>
            </div>
          </div>
        </Alert>
      );
    }

    const assessment = activeAssessmentData;

    return (
      <ActiveExamRunner
        assessment={assessment}
        assessmentId={activeAssessmentId}
        refetchAssessment={refetchActiveAssessment}
        returnUrl={returnUrl}
        courseId={courseId}
        lessonId={lessonId}
        initialRetake={retakeParam}
        onBack={() => {
          if (returnUrl) {
            router.push(returnUrl);
          } else {
            setActiveAssessmentId(null);
            router.push(window.location.pathname);
          }
        }}
      />
    );
  }

  // Overview List
  return (
    <AssessmentsOverviewList
      fixedType={fixedType}
      filterType={filterType}
      onFilterChange={(type) => {
        setFilterType(type);
        setCurrentPage(1);
      }}
      filteredAssessments={filteredAssessments}
      paginatedAssessments={paginatedAssessments}
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={PAGE_SIZE}
      onPageChange={setCurrentPage}
      getExamTimingStatus={getExamTimingStatus}
      getStatus={getStatus}
      onSelectAssessment={(id) => {
        setActiveAssessmentId(id);
      }}
    />
  );
}
export default StudentAssessmentsContent;
