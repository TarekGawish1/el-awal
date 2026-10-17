'use client';

import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useSubmissionDetail } from '../hooks/use-assessments';
import { useSubmissionGrading } from '../hooks/useSubmissionGrading';
import { SubmissionHeaderCard } from './submission/SubmissionHeaderCard';
import { SubmissionQuestionItem } from './submission/SubmissionQuestionItem';
import { SubmissionGradingFooter } from './submission/SubmissionGradingFooter';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';

export function SubmissionDetails({ submissionId }: { submissionId: string }) {
  const { data: submission, isLoading, isError, error, refetch } = useSubmissionDetail(submissionId);
  const questions = submission?.assessment?.questions || [];

  const {
    activeTab,
    setActiveTab,
    gradesState,
    generalFeedback,
    setGeneralFeedback,
    previewModalImg,
    setPreviewModalImg,
    isGraded,
    isPending,
    isReEvaluating,
    totalAwardedScore,
    totalMaxScore,
    percentage,
    isPassing,
    hasAnyError,
    filteredQuestions,
    getAnswerForQuestion,
    handleScoreChange,
    handleFeedbackChange,
    applyPresetScore,
    handleReEvaluate,
    handleSubmitGrades,
  } = useSubmissionGrading({
    submissionId,
    submission,
    questions,
    refetch,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !submission) {
    return (
      <Alert variant="error" className="max-w-3xl mx-auto my-8" dir="rtl">
        <AlertCircle className="w-5 h-5 ml-2" />
        <p>{(error as any)?.message || 'فشل في تحميل تفاصيل الإجابة'}</p>
      </Alert>
    );
  }

  const assessment = submission.assessment;

  return (
    <div className="space-y-6 pb-32 max-w-5xl mx-auto" dir="rtl">
      {/* Lightbox Image Preview Modal */}
      {previewModalImg && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewModalImg(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewModalImg(null)}
              className="absolute top-4 left-4 bg-slate-900/70 hover:bg-slate-900 text-white p-2 rounded-full transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewModalImg} 
              alt="صورة الحل المرفقة" 
              className="max-h-[85vh] w-auto mx-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Main Student Submission Overview Card */}
      <SubmissionHeaderCard
        submission={submission}
        assessment={assessment}
        questions={questions}
        isGraded={isGraded}
        totalAwardedScore={totalAwardedScore}
        totalMaxScore={totalMaxScore}
        percentage={percentage}
        isPassing={isPassing}
        isReEvaluating={isReEvaluating}
        onReEvaluate={handleReEvaluate}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Questions Grading Form */}
      <form onSubmit={handleSubmitGrades} className="space-y-6">
        {filteredQuestions.map((question) => {
          const qId = question.id!;
          const answer = getAnswerForQuestion(qId);
          const qGrade = gradesState[qId] || { pointsEarned: '', teacherFeedback: '' };

          return (
            <SubmissionQuestionItem
              key={qId}
              question={question}
              answer={answer}
              qGrade={qGrade}
              onScoreChange={handleScoreChange}
              onFeedbackChange={handleFeedbackChange}
              onApplyPresetScore={applyPresetScore}
              onPreviewImage={setPreviewModalImg}
            />
          );
        })}

        {/* General Teacher Feedback Card & Sticky Bottom Summary */}
        <SubmissionGradingFooter
          totalAwardedScore={totalAwardedScore}
          totalMaxScore={totalMaxScore}
          percentage={percentage}
          isPassing={isPassing}
          isPending={isPending}
          hasAnyError={hasAnyError}
          generalFeedback={generalFeedback}
          onGeneralFeedbackChange={setGeneralFeedback}
        />
      </form>
    </div>
  );
}

export default SubmissionDetails;
