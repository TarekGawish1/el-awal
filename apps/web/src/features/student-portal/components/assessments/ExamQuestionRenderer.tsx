'use client';

import React, { memo } from 'react';
import { Badge } from '@/components/ui/Badge';
import {
  CheckCircle2,
  Maximize2,
  Trash2,
  Camera,
} from 'lucide-react';

export interface ExamQuestionRendererProps {
  question: any;
  currentAnswer?: string;
  onSelectOption: (questionId: string, option: string) => void;
  onTextChange: (questionId: string, text: string) => void;
  essayImage?: { file: File; previewUrl: string };
  onEssayImageSelect: (questionId: string, file?: File | null) => void;
  onRemoveEssayImage: (questionId: string) => void;
  onPreviewImage: (url: string) => void;
  fileInputRef: (el: HTMLInputElement | null) => void;
}

export const ExamQuestionRenderer = memo(function ExamQuestionRenderer({
  question,
  currentAnswer,
  onSelectOption,
  onTextChange,
  essayImage,
  onEssayImageSelect,
  onRemoveEssayImage,
  onPreviewImage,
  fileInputRef,
}: ExamQuestionRendererProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs relative">
      <div className="flex justify-between items-start gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="bg-slate-100 text-slate-600 font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">
            {question.questionNumber}
          </div>
          <div>
            <h4 className="text-md font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
              {question.questionText}
            </h4>

            {question.imageUrl && (
              <div className="mt-4 rounded-xl overflow-hidden border border-slate-150 max-w-md">
                <img
                  src={question.imageUrl}
                  alt="Question"
                  className="w-full h-auto object-contain"
                />
              </div>
            )}
          </div>
        </div>

        <Badge
          variant="outline"
          className="border-slate-100 bg-slate-50 text-slate-600 shrink-0"
        >
          {question.points} نقاط
        </Badge>
      </div>

      {/* MCQ rendering */}
      {question.questionType === 'MULTIPLE_CHOICE' && question.optionsData && (
        <div className="mr-11 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {question.optionsData.map((opt: string, i: number) => {
            const isSelected = currentAnswer === opt;
            const optImg = (question.optionImages as string[] | undefined)?.[i];
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelectOption(question.id, opt)}
                className={`p-3.5 rounded-xl border text-right text-sm transition-all flex flex-col gap-2 cursor-pointer ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50/50 text-primary-800 font-semibold ring-2 ring-primary-100'
                    : 'border-slate-150 bg-slate-50 text-slate-600 hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'border-primary-600 bg-primary-600'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  {opt}
                </div>
                {optImg && (
                  <img
                    src={optImg}
                    alt={`صورة الخيار ${i + 1}`}
                    className="w-full max-h-36 object-cover rounded-lg border border-slate-200 mt-1"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* True / False rendering */}
      {question.questionType === 'TRUE_FALSE' && (
        <div className="mr-11 flex gap-4 mt-4">
          {['true', 'false'].map((val) => {
            const isSelected = currentAnswer === val;
            const label = val === 'true' ? 'صح' : 'خطأ';
            return (
              <button
                key={val}
                type="button"
                onClick={() => onSelectOption(question.id, val)}
                className={`px-6 py-2.5 rounded-xl border text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? val === 'true'
                      ? 'border-green-500 bg-green-50 text-green-700 font-extrabold ring-2 ring-green-100'
                      : 'border-rose-500 bg-rose-50 text-rose-700 font-extrabold ring-2 ring-rose-100'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    isSelected
                      ? val === 'true'
                        ? 'border-green-600 bg-green-600'
                        : 'border-rose-600 bg-rose-600'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Essay rendering */}
      {question.questionType === 'ESSAY' && (
        <div className="mr-11 mt-4 space-y-3">
          <div>
            <span className="text-xs font-bold text-slate-600 block mb-1.5">
              اكتب إجابتك النصية (أو ارفع صورة للحل من الكشكول / الورقة):
            </span>
            <textarea
              rows={4}
              placeholder="اكتب إجابتك المقالية بالتفصيل هنا..."
              value={currentAnswer || ''}
              onChange={(e) => onTextChange(question.id, e.target.value)}
              className="w-full p-4 border border-slate-200 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-400 text-sm placeholder:text-slate-400 bg-white"
            />
          </div>

          {/* Attached Essay Image */}
          <div>
            {essayImage ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    onClick={() => onPreviewImage(essayImage.previewUrl)}
                    className="w-14 h-14 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 cursor-pointer relative group"
                    title="اضغط لتكبير الصورة"
                  >
                    <img
                      src={essayImage.previewUrl}
                      alt="صورة الإجابة"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      تم إرفاق صورة الحل
                    </span>
                    <p className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                      {essayImage.file.name} (
                      {(essayImage.file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPreviewImage(essayImage.previewUrl)}
                    className="text-xs font-bold text-slate-600 hover:text-primary-700 bg-white border border-slate-200 hover:border-primary-300 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    عرض
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById(
                        `essay-file-${question.id}`
                      ) as HTMLInputElement;
                      input?.click();
                    }}
                    className="text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:border-slate-300 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    تغيير
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveEssayImage(question.id)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById(
                      `essay-file-${question.id}`
                    ) as HTMLInputElement;
                    input?.click();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-primary-50/60 hover:border-primary-400 text-xs font-bold text-slate-700 hover:text-primary-700 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-primary-600" />
                  إرفاق صورة لإجابة هذا السؤال (من الكشكول أو الورقة)
                </button>
              </div>
            )}

            <input
              id={`essay-file-${question.id}`}
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => {
                onEssayImageSelect(question.id, e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

