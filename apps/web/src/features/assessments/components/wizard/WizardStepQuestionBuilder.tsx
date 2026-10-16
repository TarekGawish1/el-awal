'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { CreateAssessmentFormData } from '../../types/assessments.schema';
import { QuestionType } from '../../types/assessments.types';
import { AssessmentQuestionEditor } from '../AssessmentQuestionEditor';

export interface WizardStepQuestionBuilderProps {
  methods: UseFormReturn<CreateAssessmentFormData>;
  type: 'EXAM' | 'ASSIGNMENT';
  homeworkMode: 'INTERACTIVE' | 'BOOKLET';
  setHomeworkMode: (mode: 'INTERACTIVE' | 'BOOKLET') => void;
  startPage: number | '';
  setStartPage: (page: number | '') => void;
  endPage: number | '';
  setEndPage: (page: number | '') => void;
  bookletImages: string[];
  setBookletImages: React.Dispatch<React.SetStateAction<string[]>>;
  handleBookletImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isUploadingBooklet: boolean;
  fields: any[];
  append: (question: any) => void;
  remove: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function WizardStepQuestionBuilder({
  methods,
  type,
  homeworkMode,
  setHomeworkMode,
  startPage,
  setStartPage,
  endPage,
  setEndPage,
  bookletImages,
  setBookletImages,
  handleBookletImageUpload,
  isUploadingBooklet,
  fields,
  append,
  remove,
  onPrev,
  onNext,
}: WizardStepQuestionBuilderProps) {
  const {
    formState: { errors },
    watch,
  } = methods;

  const formDataValues = watch();
  const questionsSum =
    formDataValues.questions?.reduce(
      (sum, q) => sum + (Number(q.points) || 0),
      0
    ) || 0;

  return (
    <div className="p-6 sm:p-8 bg-slate-50/50">
      {type === 'ASSIGNMENT' && (
        <div className="mb-8 bg-white p-2 rounded-xl border border-slate-200 flex gap-2 max-w-md mx-auto shadow-sm">
          <button
            type="button"
            onClick={() => setHomeworkMode('INTERACTIVE')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all cursor-pointer ${
              homeworkMode === 'INTERACTIVE'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            📝 أسئلة تفاعلية
          </button>
          <button
            type="button"
            onClick={() => setHomeworkMode('BOOKLET')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all cursor-pointer ${
              homeworkMode === 'BOOKLET'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            📖 واجب من الملزمة
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">الأسئلة</h2>
          <p className="text-slate-500 text-sm">
            {type === 'ASSIGNMENT' && homeworkMode === 'BOOKLET'
              ? 'حدد الصفحات المطلوبة للواجب من الملزمة.'
              : `أضف أسئلة ${
                  type === 'ASSIGNMENT' ? 'الواجب' : 'الاختبار'
                } وحدد الإجابات الصحيحة والدرجات.`}
          </p>
        </div>
        {!(type === 'ASSIGNMENT' && homeworkMode === 'BOOKLET') && (
          <div className="bg-white border border-slate-200 px-4 py-2 rounded-lg flex items-center gap-3 shadow-sm">
            <div className="text-sm font-medium text-slate-500">
              إجمالي درجات الأسئلة:
            </div>
            <div
              className={`text-lg font-bold ${
                questionsSum !== (formDataValues.totalScore || 0)
                  ? 'text-amber-500'
                  : 'text-primary'
              }`}
              title={
                type === 'ASSIGNMENT'
                  ? 'الدرجة الكلية المحددة للواجب'
                  : 'الدرجة الكلية المحددة للاختبار'
              }
            >
              {questionsSum} / {formDataValues.totalScore}
            </div>
          </div>
        )}
      </div>

      {errors.passingScore && (
        <Alert variant="error" className="mb-6">
          <AlertTriangle className="w-5 h-5 ml-2" />
          <p>{errors.passingScore.message}</p>
        </Alert>
      )}

      {type === 'ASSIGNMENT' && homeworkMode === 'BOOKLET' ? (
        // Booklet Mode Form
        <div className="space-y-6 max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              تحديد صفحات الملزمة
            </h3>
            <p className="text-slate-500 text-sm">
              حدد أرقام الصفحات المطلوب حلها من الملزمة وارفع صوراً لها إن وجد.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">
                من صفحة <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                value={startPage}
                onChange={(e) =>
                  setStartPage(e.target.value ? Number(e.target.value) : '')
                }
                placeholder="رقم صفحة البدء"
              />
            </div>
            <div>
              <Label className="mb-2 block">
                إلى صفحة <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                value={endPage}
                onChange={(e) =>
                  setEndPage(e.target.value ? Number(e.target.value) : '')
                }
                placeholder="رقم صفحة النهاية"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="block font-medium">
                صور صفحات الواجب (اختياري)
              </Label>
              <div>
                <input
                  type="file"
                  id="booklet-images-upload"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleBookletImageUpload}
                  disabled={isUploadingBooklet}
                />
                <Label
                  htmlFor="booklet-images-upload"
                  className={`text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors font-bold ${
                    isUploadingBooklet ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isUploadingBooklet ? 'جاري الرفع...' : '➕ رفع صور الصفحات'}
                </Label>
              </div>
            </div>

            {bookletImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                {bookletImages.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-[3/4] rounded-lg border border-slate-200 overflow-hidden group"
                  >
                    <img
                      src={url}
                      alt={`Booklet page ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() =>
                          setBookletImages((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="absolute bottom-2 left-2 bg-slate-900/60 text-white text-xs px-2 py-0.5 rounded font-medium">
                      صفحة {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
                📸 لم يتم رفع أي صور بعد. (يمكنك رفع صورة واحدة أو أكثر لصفحات
                الواجب لمساعدة الطلاب).
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-between">
            <Button variant="ghost" onClick={onPrev} className="cursor-pointer">
              <ArrowRight className="w-4 h-4 ml-2" />
              رجوع
            </Button>
            <Button onClick={onNext} className="cursor-pointer">
              التالي: المراجعة
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
          </div>
        </div>
      ) : (
        // Interactive Mode Form
        <>
          <div className="space-y-6">
            {fields.map((field, index) => (
              <AssessmentQuestionEditor
                key={field.id}
                index={index}
                onRemove={() => remove(index)}
              />
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <Button
              type="button"
              variant="outline"
              className="border-dashed border-2 bg-white hover:bg-slate-50 cursor-pointer"
              onClick={() =>
                append({
                  questionNumber: fields.length + 1,
                  questionType: QuestionType.MULTIPLE_CHOICE,
                  questionText: '',
                  points: 5,
                  displayOrder: fields.length + 1,
                  optionsData: [
                    'الخيار الأول',
                    'الخيار الثاني',
                    'الخيار الثالث',
                    'الخيار الرابع',
                  ],
                  correctAnswer: '',
                })
              }
            >
              <Plus className="w-5 h-5 ml-2" />
              إضافة سؤال جديد
            </Button>
          </div>

          <div className="pt-8 mt-8 border-t border-slate-200 flex justify-between">
            <Button variant="ghost" onClick={onPrev} className="cursor-pointer">
              <ArrowRight className="w-4 h-4 ml-2" />
              رجوع
            </Button>
            <Button onClick={onNext} className="cursor-pointer">
              التالي: المراجعة
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
