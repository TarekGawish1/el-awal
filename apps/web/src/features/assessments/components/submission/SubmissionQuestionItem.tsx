'use client';

import React from 'react';
import { 
  Check, MessageSquare, ImageIcon, CheckCircle2, XCircle, HelpCircle, Maximize2 
} from 'lucide-react';
import { QuestionType } from '../../types/assessments.types';
import { parseEssayAnswer } from '../../utils/answer-parser';
import { isAnswerMatch, QuestionGradeState } from '../../hooks/useSubmissionGrading';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

interface SubmissionQuestionItemProps {
  question: any;
  answer: any;
  qGrade: QuestionGradeState;
  onScoreChange: (questionId: string, maxPoints: number, rawValue: string) => void;
  onFeedbackChange: (questionId: string, value: string) => void;
  onApplyPresetScore: (questionId: string, points: number) => void;
  onPreviewImage: (url: string) => void;
}

export function SubmissionQuestionItem({
  question,
  answer,
  qGrade,
  onScoreChange,
  onFeedbackChange,
  onApplyPresetScore,
  onPreviewImage,
}: SubmissionQuestionItemProps) {
  const qId = question.id!;
  const maxPoints = Number(question.points) || 1;
  const isAutoGradedType = question.questionType === QuestionType.MULTIPLE_CHOICE || question.questionType === QuestionType.TRUE_FALSE;
  const isEssay = question.questionType === QuestionType.ESSAY;

  const hasAnswer = Boolean(answer?.answerGiven && answer.answerGiven.trim().length > 0);
  const isCorrect = isAutoGradedType && hasAnswer && (
    answer?.isCorrect === true || isAnswerMatch(question.questionType, answer?.answerGiven, question.correctAnswer)
  );

  return (
    <div 
      className={`bg-white rounded-2xl border shadow-xs transition-all overflow-hidden ${
        qGrade.error 
          ? 'border-red-400 ring-2 ring-red-100' 
          : isAutoGradedType
            ? (hasAnswer ? (isCorrect ? 'border-emerald-200' : 'border-rose-200') : 'border-slate-200')
            : 'border-slate-200'
      }`}
    >
      {/* Question Top Bar */}
      <div className="p-5 md:p-6 border-b border-slate-100">
        <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-700 font-extrabold flex items-center justify-center shrink-0 text-sm">
              {question.questionNumber}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <Badge variant="outline" className="text-[11px] bg-slate-50 text-slate-600 font-medium">
                  {isEssay ? 'سؤال مقالي' : question.questionType === QuestionType.TRUE_FALSE ? 'صواب أو خطأ' : 'اختيار من متعدد'}
                </Badge>

                {/* Automatic Grading Status Badge */}
                {isAutoGradedType && (
                  hasAnswer ? (
                    isCorrect ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        إجابة صحيحة (تم التصحيح تلقائياً)
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        إجابة خاطئة (تم التصحيح تلقائياً)
                      </Badge>
                    )
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                      متروك بدون إجابة (صفر)
                    </Badge>
                  )
                )}

                {isEssay && (
                  <Badge className="bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-bold flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    سؤال مقالي (يتطلب تقييم المعلم)
                  </Badge>
                )}
              </div>

              <h3 className="text-base md:text-lg font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
                {question.questionText}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAutoGradedType ? (
              <Badge className={`font-mono font-bold text-xs px-2.5 py-1 ${
                hasAnswer 
                  ? (isCorrect ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300')
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                الدرجة: {isCorrect ? maxPoints : 0} / {maxPoints}
              </Badge>
            ) : (
              <Badge variant="default" className="bg-slate-100 text-slate-800 font-mono font-bold text-xs px-2.5 py-1">
                الدرجة المخصصة: {maxPoints}
              </Badge>
            )}
          </div>
        </div>

        {/* Pre-defined Correct Answer for Teacher reference */}
        {isAutoGradedType && question.correctAnswer && (
          <div className="mr-11 mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex items-center gap-2 text-slate-700">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">الإجابة النموذجية الصحيحة:</span>
            <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {question.questionType === QuestionType.TRUE_FALSE 
                ? (['true', 'صح', 'صحيحة', 'صواب', '1'].includes(question.correctAnswer.trim().toLowerCase()) ? 'صح / صواب' : 'خطأ')
                : question.correctAnswer}
            </span>
          </div>
        )}

        {/* Student's Given Answer Section */}
        <div className="mr-11 mt-3">
          <span className="text-xs font-bold text-slate-500 block mb-1.5">إجابة الطالب:</span>
          {hasAnswer ? (
            <div className={`p-4 rounded-xl border ${
              isAutoGradedType
                ? (isCorrect ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950' : 'bg-rose-50/70 border-rose-300 text-rose-950')
                : 'bg-slate-50/70 border-slate-200 text-slate-800'
            }`}>
              {question.questionType === QuestionType.TRUE_FALSE && (
                <div className="font-bold text-sm flex items-center gap-2">
                  {['true', 'صح', 'صحيحة', 'صواب', '1'].includes(answer.answerGiven.trim().toLowerCase()) ? (
                    <span className="text-emerald-800 flex items-center gap-1">✓ إجابة الطالب: صواب / صحيحة</span>
                  ) : (
                    <span className="text-rose-800 flex items-center gap-1">✗ إجابة الطالب: خطأ</span>
                  )}
                </div>
              )}

              {question.questionType === QuestionType.MULTIPLE_CHOICE && (
                <div className="font-bold text-sm">
                  {answer.answerGiven}
                </div>
              )}

              {isEssay && (() => {
                const { text, imageUrl } = parseEssayAnswer(answer.answerGiven);
                return (
                  <div className="space-y-3">
                    {text ? (
                      <div className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-800">
                        {text}
                      </div>
                    ) : null}

                    {imageUrl ? (
                      <div className="pt-2 border-t border-slate-200/60">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-primary-600" />
                            صورة الحل المرفقة من الطالب:
                          </span>
                          <button
                            type="button"
                            onClick={() => onPreviewImage(imageUrl)}
                            className="text-xs font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1 bg-primary-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            تكبير الصورة
                          </button>
                        </div>
                        <div 
                          className="rounded-xl overflow-hidden border border-slate-200 bg-white max-w-sm p-1 shadow-2xs cursor-zoom-in group"
                          onClick={() => onPreviewImage(imageUrl)}
                        >
                          <img
                            src={imageUrl}
                            alt="إجابة الطالب"
                            className="max-h-60 w-auto rounded-lg object-contain mx-auto group-hover:opacity-95 transition-opacity"
                          />
                        </div>
                      </div>
                    ) : null}

                    {!text && !imageUrl && (
                      <span className="text-slate-400 italic text-xs">لم يتم إدخال نص أو صورة</span>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 text-xs italic">
              لم يقم الطالب بالإجابة على هذا السؤال
            </div>
          )}
        </div>
      </div>

      {/* Per-Question Grading Controls Box */}
      {isEssay ? (
        <div className="bg-slate-50/90 p-4 md:p-5 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            {/* Score input & shortcuts for Essay */}
            <div className="md:col-span-4 space-y-2">
              <Label className="block text-xs font-bold text-slate-700">
                الدرجة الممنوحة <span className="text-red-500">*</span>
              </Label>
              <div className="relative flex items-center">
                <Input
                  type="number"
                  step="any"
                  min={0}
                  max={maxPoints}
                  value={qGrade.pointsEarned}
                  onChange={(e) => onScoreChange(qId, maxPoints, e.target.value)}
                  placeholder="0"
                  className={`font-mono font-bold text-base text-left pl-14 ${
                    qGrade.error ? 'border-red-500 bg-red-50/50' : 'bg-white'
                  }`}
                />
                <div className="absolute left-3 text-xs font-bold font-mono text-slate-400 pointer-events-none">
                  / {maxPoints}
                </div>
              </div>
              {qGrade.error && (
                <p className="text-red-500 text-xs font-medium">{qGrade.error}</p>
              )}

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => onApplyPresetScore(qId, maxPoints)}
                  className="text-[11px] font-bold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  الدرجة كاملة ({maxPoints})
                </button>
                {maxPoints > 1 && (
                  <button
                    type="button"
                    onClick={() => onApplyPresetScore(qId, maxPoints / 2)}
                    className="text-[11px] font-bold px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    نصفها ({maxPoints / 2})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onApplyPresetScore(qId, 0)}
                  className="text-[11px] font-bold px-2 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  صفر (0)
                </button>
              </div>
            </div>

            {/* Per-question teacher feedback for Essay */}
            <div className="md:col-span-8 space-y-2">
              <Label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <span>تعليق المعلم على هذا السؤال المقالي (اختياري)</span>
              </Label>
              <Input
                type="text"
                value={qGrade.teacherFeedback}
                onChange={(e) => onFeedbackChange(qId, e.target.value)}
                placeholder="ملاحظات وتوجيهات للطالب على الإجابة المقالية..."
                className="bg-white text-xs"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Compact Teacher Feedback Row for Auto-Graded Questions */
        <div className="bg-slate-50/60 px-5 py-3 border-t border-slate-100 flex items-center gap-3">
          <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
          <Input
            type="text"
            value={qGrade.teacherFeedback}
            onChange={(e) => onFeedbackChange(qId, e.target.value)}
            placeholder="إضافة تعليق أو ملاحظة للطالب على هذا السؤال (اختياري)..."
            className="bg-white text-xs h-8"
          />
        </div>
      )}
    </div>
  );
}
