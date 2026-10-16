'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import {
  FileText,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { CreateAssessmentFormData } from '../../types/assessments.schema';
import { QuestionType } from '../../types/assessments.types';

export interface WizardStepReviewProps {
  methods: UseFormReturn<CreateAssessmentFormData>;
  type: 'EXAM' | 'ASSIGNMENT';
  homeworkMode: 'INTERACTIVE' | 'BOOKLET';
  startPage: number | '';
  endPage: number | '';
  bookletImages: string[];
  fieldsCount: number;
  isPending: boolean;
  onPrev: () => void;
  onSubmit: (data: CreateAssessmentFormData, isPublished: boolean) => void;
}

export function WizardStepReview({
  methods,
  type,
  homeworkMode,
  startPage,
  endPage,
  bookletImages,
  fieldsCount,
  isPending,
  onPrev,
  onSubmit,
}: WizardStepReviewProps) {
  const { getValues, handleSubmit } = methods;
  const formData = getValues();

  return (
    <div className="p-6 sm:p-8 space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">المراجعة والنشر</h2>
        <p className="text-slate-500 text-sm">
          راجع تفاصيل {type === 'ASSIGNMENT' ? 'الواجب' : 'الاختبار'} قبل حفظه أو
          نشره للطلاب.
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
        <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {formData.title}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="bg-white p-3 rounded-lg border border-slate-100">
            <span className="text-slate-500 block mb-1">الدرجة الكلية</span>
            <span className="font-bold text-slate-800 text-lg">
              {formData.totalScore}
            </span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-100">
            <span className="text-slate-500 block mb-1">درجة النجاح</span>
            <span className="font-bold text-slate-800 text-lg">
              {formData.passingScore}
            </span>
          </div>
          {type === 'ASSIGNMENT' ? (
            <div className="bg-white p-3 rounded-lg border border-slate-100">
              <span className="text-slate-500 block mb-1">موعد التسليم</span>
              <span className="font-bold text-slate-800 text-sm">
                {formData.dueDate
                  ? new Date(formData.dueDate).toLocaleDateString('ar-EG', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : 'بدون موعد تسليم'}
              </span>
            </div>
          ) : (
            <div className="bg-white p-3 rounded-lg border border-slate-100">
              <span className="text-slate-500 block mb-1">المدة المحددة</span>
              <span className="font-bold text-slate-800 text-lg">
                {formData.durationMinutes
                  ? `${formData.durationMinutes} دقيقة`
                  : 'بدون وقت'}
              </span>
            </div>
          )}
          <div className="bg-white p-3 rounded-lg border border-slate-100">
            <span className="text-slate-500 block mb-1">
              {type === 'ASSIGNMENT' && homeworkMode === 'BOOKLET'
                ? 'طريقة الحل'
                : 'عدد الأسئلة'}
            </span>
            <span className="font-bold text-slate-800 text-lg">
              {type === 'ASSIGNMENT' && homeworkMode === 'BOOKLET'
                ? 'واجب ملزمة'
                : `${fieldsCount} أسئلة`}
            </span>
          </div>
        </div>

        {formData.description && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <span className="text-slate-500 text-sm block mb-1">الوصف:</span>
            <p className="text-slate-700">{formData.description}</p>
          </div>
        )}
      </div>

      {/* Questions / Booklet Preview */}
      {type === 'ASSIGNMENT' && homeworkMode === 'BOOKLET' ? (
        <div>
          <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">
            تفاصيل واجب الملزمة
          </h4>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">
                الصفحات المطلوبة من الملزمة:
              </span>
              <span className="font-bold text-slate-800 bg-white border px-3 py-1 rounded-lg">
                من صفحة {startPage} إلى صفحة {endPage}
              </span>
            </div>
            {bookletImages.length > 0 ? (
              <div>
                <span className="text-slate-600 font-medium block mb-2">
                  الصور المرفوعة للصفحات:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {bookletImages.map((url, idx) => (
                    <div
                      key={idx}
                      className="aspect-[3/4] rounded-lg border border-slate-200 overflow-hidden relative shadow-xs"
                    >
                      <img
                        src={url}
                        alt={`Booklet page ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 bg-slate-950/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                        صفحة {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-slate-400 italic text-sm">
                لم يتم إرفاق صور للصفحات.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">
            نظرة عامة على الأسئلة
          </h4>
          <div className="space-y-3">
            {formData.questions?.map((q, i) => (
              <div
                key={i}
                className="flex justify-between items-start py-2 border-b border-slate-50 last:border-0"
              >
                <div>
                  <span className="font-medium text-slate-700 block line-clamp-1">
                    {i + 1}. {q.questionText}
                  </span>
                  <span className="text-xs text-slate-500">
                    {q.questionType === QuestionType.MULTIPLE_CHOICE
                      ? 'اختيار من متعدد'
                      : q.questionType === QuestionType.TRUE_FALSE
                      ? 'صح أم خطأ'
                      : 'مقال'}
                  </span>
                </div>
                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold shrink-0">
                  {q.points} درجات
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
        <Button variant="ghost" onClick={onPrev} className="cursor-pointer">
          <ArrowRight className="w-4 h-4 ml-2" />
          رجوع للأسئلة
        </Button>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleSubmit((data) => onSubmit(data, false))}
            disabled={isPending}
            className="cursor-pointer"
          >
            حفظ كمسودة
          </Button>
          <Button
            onClick={handleSubmit((data) => onSubmit(data, true))}
            disabled={isPending}
            className="cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 ml-2" />
            نشر {type === 'ASSIGNMENT' ? 'الواجب' : 'الاختبار'}
          </Button>
        </div>
      </div>
    </div>
  );
}
