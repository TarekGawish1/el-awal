'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  FileText,
  CheckCircle2,
  Check,
  HelpCircle,
  ImageIcon,
  Maximize2,
} from 'lucide-react';
import { parseEssayAnswer } from '@/features/assessments/utils/answer-parser';

export interface ExamSubmissionReviewListProps {
  assessment: any;
  mySubmission: any;
  onPreviewImage: (url: string) => void;
}

export function ExamSubmissionReviewList({
  assessment,
  mySubmission,
  onPreviewImage,
}: ExamSubmissionReviewListProps) {
  return (
    <div className="space-y-6">
      {mySubmission.teacherFeedback && (
        <div className="bg-primary-50/60 border border-primary-200/60 rounded-2xl p-4 flex items-start gap-3 text-primary-800 text-sm">
          <HelpCircle className="w-5 h-5 shrink-0 text-primary-600 mt-0.5" />
          <div>
            <p className="font-bold">ملاحظات المعلم وتقييمه</p>
            <p className="text-xs text-primary-700 mt-1 leading-relaxed">
              {mySubmission.teacherFeedback}
            </p>
          </div>
        </div>
      )}

      {mySubmission.attachmentUrl && (
        <a
          href={mySubmission.attachmentUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50/60 px-4 py-2.5 text-sm font-bold text-primary-700 transition-colors hover:bg-primary-50"
        >
          <FileText className="h-4 w-4" />
          تحميل ملف إجابتك المرفوعة
        </a>
      )}

      {mySubmission.status === 'GRADED' ? (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            مراجعة حل الاختبار والإجابات النموذجية
          </h3>

          <div className="space-y-5">
            {assessment.questions?.map((question: any) => {
              const studentAns = mySubmission.answers?.find(
                (a: any) => a.questionId === question.id
              );
              const isCorrect = studentAns?.isCorrect;
              const isEssay = question.questionType === 'ESSAY';

              return (
                <div
                  key={question.id}
                  className={`bg-white p-6 rounded-2xl border shadow-2xs relative overflow-hidden ${
                    isEssay
                      ? 'border-slate-100'
                      : isCorrect
                      ? 'border-green-200 ring-1 ring-green-100/50'
                      : 'border-rose-200 ring-1 ring-rose-100/50'
                  }`}
                >
                  {!isEssay && (
                    <div
                      className={`absolute top-0 right-0 w-1.5 h-full ${
                        isCorrect ? 'bg-green-500' : 'bg-rose-500'
                      }`}
                    />
                  )}

                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-slate-150 text-slate-700 font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">
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

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge
                        variant={isEssay ? 'neutral' : isCorrect ? 'success' : 'error'}
                      >
                        {isEssay
                          ? `الدرجة المحصلة: ${studentAns?.pointsEarned ?? '—'} / ${question.points}`
                          : `${studentAns?.pointsEarned || 0} / ${question.points} نقاط`}
                      </Badge>
                    </div>
                  </div>

                  {/* Display given answer vs correct answer */}
                  <div className="mr-11 space-y-3 mt-4 text-sm">
                    <div className="flex flex-col gap-1.5 p-3.5 bg-slate-50 rounded-xl">
                      <span className="text-xs text-slate-500 font-semibold">
                        إجابتك المسلَّمة:
                      </span>
                      {isEssay ? (
                        (() => {
                          const { text, imageUrl } = parseEssayAnswer(
                            studentAns?.selectedAnswer
                          );
                          if (!text && !imageUrl) {
                            return (
                              <span className="text-slate-400 italic text-xs">
                                لم يتم الإجابة على السؤال
                              </span>
                            );
                          }
                          return (
                            <div className="space-y-3">
                              {text && (
                                <p className="font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">
                                  {text}
                                </p>
                              )}
                              {imageUrl && (
                                <div className="pt-1">
                                  <span className="text-xs text-slate-500 font-medium block mb-1.5 flex items-center gap-1">
                                    <ImageIcon className="w-3.5 h-3.5 text-primary-600" />
                                    صورة الحل المرفقة:
                                  </span>
                                  <div
                                    onClick={() => onPreviewImage(imageUrl)}
                                    className="relative group cursor-pointer inline-block rounded-xl overflow-hidden border border-slate-200 bg-white hover:border-primary-400 transition-all max-w-xs shadow-2xs"
                                    title="اضغط لتكبير الصورة"
                                  >
                                    <img
                                      src={imageUrl}
                                      alt="إجابة الطالب"
                                      className="max-h-44 w-auto object-contain"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                      <Maximize2 className="w-4 h-4" />
                                      عرض الصورة
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <span className="font-semibold text-slate-800">
                          {studentAns?.selectedAnswer
                            ? question.questionType === 'TRUE_FALSE'
                              ? studentAns.selectedAnswer === 'true'
                                ? 'صح'
                                : 'خطأ'
                              : studentAns.selectedAnswer
                            : '— لم يتم الإجابة على السؤال'}
                        </span>
                      )}
                    </div>

                    {!isEssay && (
                      <div className="flex flex-col gap-1 p-3 bg-green-50/60 border border-green-100 rounded-xl text-green-800">
                        <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> الإجابة النموذجية الصحيحة:
                        </span>
                        <span className="font-bold">
                          {question.questionType === 'TRUE_FALSE'
                            ? question.correctAnswer === 'true'
                              ? 'صح'
                              : 'خطأ'
                            : question.correctAnswer}
                        </span>
                      </div>
                    )}

                    {question.explanation && (
                      <div className="p-3.5 bg-blue-50/50 text-blue-800 rounded-xl border border-blue-100 text-xs leading-relaxed">
                        <span className="font-bold block mb-1">الشرح والتوضيح:</span>
                        {question.explanation}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Card className="border-slate-100 shadow-2xs">
          <CardContent className="p-8 text-center flex flex-col items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-blue-400 mb-3" />
            <h3 className="text-lg font-bold text-slate-700">تم تسليم الحل وإرساله بنجاح</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              لقد تم رصد استلام إجاباتك لهذا الاختبار، وهو يحتوي على أسئلة مقالية تتطلب تقييماً وتصحيحاً يدوياً من قِبل المعلم.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              ستتمكن من الاطلاع على درجتك وإجاباتك النموذجية فور قيام المعلم باعتماد التصحيح.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
