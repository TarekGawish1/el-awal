'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  HelpCircle,
  Send,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useExamSession } from '../../hooks/useExamSession';
import { ExamQuestionRenderer } from './ExamQuestionRenderer';
import { ExamSubmissionReviewList } from './ExamSubmissionReviewList';
import { ExamResultsReviewModal } from './ExamResultsReviewModal';
import { ExamHeaderOverview } from './ExamHeaderOverview';
import { ExamSubmitConfirmModal } from './ExamSubmitConfirmModal';

export interface ActiveExamRunnerProps {
  assessment: any;
  assessmentId: string;
  refetchAssessment: () => Promise<any>;
  returnUrl?: string | null;
  courseId?: string | null;
  lessonId?: string | null;
  initialRetake?: boolean;
  onBack: () => void;
}

export function ActiveExamRunner({
  assessment,
  assessmentId,
  refetchAssessment,
  returnUrl,
  courseId,
  lessonId,
  initialRetake,
  onBack,
}: ActiveExamRunnerProps) {
  const session = useExamSession({
    assessmentId,
    assessment,
    refetchAssessment,
    courseId,
    lessonId,
    initialRetake,
  });

  const isExam = assessment.type === 'EXAM';
  const mySubmission = session.localSubmission || assessment.mySubmission;
  const hasEssayQuestions = (assessment.questions || []).some(
    (q: any) => q.questionType === 'ESSAY'
  );
  const isCourseAssessment = Boolean(
    courseId || (assessment as any)?.courseId || (assessment as any)?.lessonId
  );
  const isPastDue =
    session.timeLeft !== null && session.timeLeft > 0
      ? false
      : assessment.timingType === 'FIXED_SESSION' && assessment.dueDate
      ? new Date(assessment.dueDate) < new Date()
      : !isCourseAssessment && assessment.dueDate
      ? new Date(assessment.dueDate) < new Date()
      : false;
  const allowMultipleAttempts = Boolean(assessment.allowMultipleAttempts);
  const canRetake =
    allowMultipleAttempts && Boolean(mySubmission) && !session.retakeMode && !isPastDue;

  const unansweredCount = (assessment?.questions || []).filter(
    (q: any) => !session.answers[q.id]
  ).length;

  return (
    <div className="space-y-6 pb-20 relative">
      <ExamHeaderOverview
        assessment={assessment}
        mySubmission={mySubmission}
        retakeMode={session.retakeMode}
        timeLeft={session.timeLeft}
        formatTimer={session.formatTimer}
        isPastDue={isPastDue}
        isExam={isExam}
        canRetake={canRetake}
        returnUrl={returnUrl}
        onBack={onBack}
        onStartRetake={session.startRetake}
      />

      {/* Main Solving or Review Flow */}
      {!mySubmission || session.retakeMode ? (
        /* SOLVE / RETAKE MODE */
        isPastDue ? null : (
          <div className="space-y-6">
            {/* Homework File Upload Section */}
            {!isExam && (
              <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-primary-600" />
                    <h3 className="font-bold text-slate-800 text-base">
                      تسليم ملف الواجب (PDF أو صورة)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    يمكنك رفع حل الواجب كاملاً كملف PDF أو صورة، أو الإجابة على
                    الأسئلة أدناه إن وُجدت.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="file"
                      ref={session.answerFileInputRef}
                      className="hidden"
                      accept=".pdf,image/png,image/jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        session.handleAnswerFileSelect(file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        session.answerUploadProgress > 0 &&
                        session.answerUploadProgress < 100
                      }
                      onClick={() => session.answerFileInputRef.current?.click()}
                      className="w-full sm:w-auto rounded-xl border-dashed border-2 border-primary-200 hover:border-primary-400 hover:bg-primary-50/50 text-primary-700 font-bold text-xs py-3 px-6 gap-2 cursor-pointer transition-all"
                    >
                      {session.answerUploadProgress > 0 &&
                      session.answerUploadProgress < 100 ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>
                            جاري رفع الملف ({session.answerUploadProgress}%)...
                          </span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4 text-primary-600" />
                          <span>اختر ملف من جهازك</span>
                        </>
                      )}
                    </Button>
                    <span className="text-[11px] text-slate-400">
                      الحد الأقصى 25 ميجابايت (PDF, PNG, JPG)
                    </span>
                  </div>

                  {session.answerFile && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          تم إرفاق الملف: {session.answerFile.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => session.setAnswerFile(null)}
                        className="text-rose-500 hover:text-rose-700 font-bold text-xs shrink-0 cursor-pointer mr-2"
                      >
                        إزالة
                      </button>
                    </div>
                  )}

                  {session.answerFileError && (
                    <p className="text-xs text-rose-500 font-medium">
                      {session.answerFileError}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Questions List */}
            {assessment.questions?.length > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                    <HelpCircle className="w-5 h-5 text-slate-400" />
                    <span>الأسئلة</span>
                    <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full mr-1">
                      {assessment.questions.length}
                    </span>
                  </h3>
                </div>

                {assessment.questions.map((question: any) => (
                  <ExamQuestionRenderer
                    key={question.id}
                    question={question}
                    currentAnswer={session.answers[question.id]}
                    onSelectOption={session.handleSelectOption}
                    onTextChange={session.handleTextChange}
                    essayImage={session.essayImages[question.id]}
                    onEssayImageSelect={session.handleEssayImageSelect}
                    onRemoveEssayImage={session.handleRemoveEssayImage}
                    onPreviewImage={(url) => session.setPreviewModalImg(url)}
                    fileInputRef={(el) => {
                      session.essayFileInputRefs.current[question.id] = el;
                    }}
                  />
                ))}
              </div>
            ) : null}

            {/* Bottom Actions */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-2xs mt-8">
              <Button
                variant="outline"
                onClick={onBack}
                disabled={session.isSubmitting}
                className="rounded-xl px-6 cursor-pointer"
              >
                إلغاء
              </Button>
              <Button
                onClick={session.handleSubmitAnswers}
                disabled={session.isSubmitting}
                className="rounded-xl px-8 bg-slate-900 hover:bg-slate-950 text-white font-bold transition-colors flex items-center gap-2 cursor-pointer"
              >
                {session.isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {session.isSubmitting ? 'جاري التسليم...' : 'تسليم الحل الآن'}
              </Button>
            </div>
          </div>
        )
      ) : (
        /* Submission Graded / Submitted Review View */
        <ExamSubmissionReviewList
          assessment={assessment}
          mySubmission={mySubmission}
          onPreviewImage={session.setPreviewModalImg}
        />
      )}

      {/* Confirmation modal */}
      <ExamSubmitConfirmModal
        isOpen={session.isConfirmOpen}
        unansweredCount={unansweredCount}
        allowMultipleAttempts={allowMultipleAttempts}
        isSubmitting={session.isSubmitting}
        onClose={() => session.setIsConfirmOpen(false)}
        onConfirm={session.confirmSubmit}
      />

      {/* Result Celebration Modal & Image Preview Modal */}
      <ExamResultsReviewModal
        showResultModal={session.showResultModal}
        onCloseResultModal={() => session.setShowResultModal(false)}
        mySubmission={mySubmission}
        assessment={assessment}
        returnUrl={returnUrl}
        allowMultipleAttempts={allowMultipleAttempts}
        isPastDue={isPastDue}
        onStartRetake={session.startRetake}
        onBack={onBack}
        previewModalImg={session.previewModalImg}
        onCloseImagePreview={() => session.setPreviewModalImg(null)}
      />
    </div>
  );
}
