'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  RefreshCcw,
  X,
} from 'lucide-react';

export interface ExamResultsReviewModalProps {
  showResultModal: boolean;
  onCloseResultModal: () => void;
  mySubmission: any;
  assessment: any;
  returnUrl?: string | null;
  allowMultipleAttempts: boolean;
  isPastDue: boolean;
  onStartRetake: () => void;
  onBack: () => void;
  previewModalImg: string | null;
  onCloseImagePreview: () => void;
}

export function ExamResultsReviewModal({
  showResultModal,
  onCloseResultModal,
  mySubmission,
  assessment,
  returnUrl,
  allowMultipleAttempts,
  isPastDue,
  onStartRetake,
  onBack,
  previewModalImg,
  onCloseImagePreview,
}: ExamResultsReviewModalProps) {
  const router = useRouter();
  const isExam = assessment?.type === 'EXAM';
  const isPreviewResult =
    Boolean(mySubmission?.isPreview) || mySubmission?.id === 'preview-submission';

  return (
    <>
      {/* Result Celebration Modal */}
      {showResultModal && mySubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl border border-slate-150 space-y-5 animate-in zoom-in-95 duration-200"
            dir="rtl"
          >
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-800">تم تسليم إجاباتك بنجاح!</h3>
              <p className="text-sm text-slate-500 mt-1">
                {mySubmission.status === 'GRADED'
                  ? 'تم تصحيح إجاباتك ورصد النتيجة الفورية بنجاح.'
                  : 'تم استلام إجاباتك بنجاح وسيتم إشعارك فور اعتماد التصحيح من المعلم.'}
              </p>
            </div>

            {isPreviewResult && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-3.5 text-right flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <p className="text-xs font-semibold leading-relaxed">
                  وضع معاينة المعلم: هذه نتيجة تجريبية فورية لم يتم حفظها، ولا تُحتسب كمحاولة،
                  ولن تظهر كدرجة للطالب. لاختبار سياسة المحاولات وظهور الدرجة، سجّل الدخول بحساب طالب.
                </p>
              </div>
            )}

            {mySubmission.status === 'GRADED' && (
              <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-4 flex items-center justify-around">
                <div>
                  <span className="text-xs text-emerald-700 block font-medium">الدرجة المحصلة</span>
                  <span className="text-3xl font-extrabold text-emerald-800 font-mono">
                    {mySubmission.scoreObtained ?? 0}
                  </span>
                </div>
                <div className="w-px h-8 bg-emerald-200"></div>
                <div>
                  <span className="text-xs text-slate-500 block font-medium">الدرجة الكلية</span>
                  <span className="text-2xl font-bold text-slate-700 font-mono">
                    {assessment.totalScore}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              {returnUrl && (
                <Button
                  onClick={() => {
                    onCloseResultModal();
                    router.push(returnUrl);
                  }}
                  className="w-full rounded-xl py-3.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>العودة للدرس ومتابعة إتمام الكورس 🎓</span>
                </Button>
              )}
              <Button
                onClick={onCloseResultModal}
                className={`w-full rounded-xl py-3 font-bold ${
                  returnUrl
                    ? 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200'
                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                } cursor-pointer`}
              >
                <CheckCircle2 className="w-4 h-4 ml-2" />
                عرض ومراجعة تفاصيل الإجابات
              </Button>
              {allowMultipleAttempts && !isPastDue && (
                <Button
                  variant="outline"
                  onClick={onStartRetake}
                  className="w-full rounded-xl py-3 font-bold text-primary-700 border-primary-200 hover:bg-primary-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCcw className="w-4 h-4" />
                  إعادة المحاولة لتحسين درجتك
                </Button>
              )}
              <Button
                variant="outline"
                onClick={onBack}
                className="w-full rounded-xl py-3 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {returnUrl
                  ? 'العودة للدرس في الكورس'
                  : !isExam
                  ? 'الرجوع لقائمة الواجبات'
                  : 'الرجوع لقائمة الاختبارات'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Full Image Preview Modal */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={onCloseImagePreview}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-4 py-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700">معاينة صورة الإجابة</span>
              <button
                type="button"
                onClick={onCloseImagePreview}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center overflow-auto max-h-[80vh]">
              <img
                src={previewModalImg}
                alt="صورة الإجابة"
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
