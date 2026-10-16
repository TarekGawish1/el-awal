'use client';

import React from 'react';
import {
  Trophy,
  Award,
  FileQuestion,
  ArrowLeft,
} from 'lucide-react';
import { PostVideoPromptState } from '../../hooks/useLessonProgress';

export interface LearningRoomBannersProps {
  isCourseFullyCompleted: boolean;
  areAllLessonsCompleted: boolean;
  areAllQuizzesCompleted: boolean;
  hasCertificate?: boolean;
  courseTitle: string;
  completedQuizzesCount: number;
  totalQuizzesCount: number;
  requireExamPassingToUnlock?: boolean;
  onClaimCertificate: () => void;
  onGoToQuizzes: () => void;
  nextStepInfo: any;
  onNextStepAction: (info: any) => void;
  postVideoPrompt: PostVideoPromptState | null;
  onStartAssessmentFromPrompt: (quizId: string, lessonId: string) => void;
  onShowInTabFromPrompt: () => void;
  onDismissPrompt: () => void;
}

export function LearningRoomBanners({
  isCourseFullyCompleted,
  areAllLessonsCompleted,
  areAllQuizzesCompleted,
  hasCertificate,
  courseTitle,
  completedQuizzesCount,
  totalQuizzesCount,
  requireExamPassingToUnlock,
  onClaimCertificate,
  onGoToQuizzes,
  nextStepInfo,
  onNextStepAction,
  postVideoPrompt,
  onStartAssessmentFromPrompt,
  onShowInTabFromPrompt,
  onDismissPrompt,
}: LearningRoomBannersProps) {
  return (
    <>
      {/* 🎓 Course Full Completion (Lessons + Exams) Celebration Banner */}
      {isCourseFullyCompleted && hasCertificate !== false && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 p-1 shadow-lg shadow-amber-200/50">
          <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 rounded-xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>

            <div className="flex items-center gap-4 z-10">
              <div className="p-3 bg-amber-100 rounded-2xl shadow-sm">
                <Trophy className="w-8 h-8 text-amber-600" />
              </div>
              <div className="text-right">
                <h3 className="text-lg font-extrabold text-amber-900">
                  أحسنت! أتممت الدورة واختباراتها بالكامل!
                </h3>
                <p className="text-sm text-amber-700/80 mt-0.5">
                  لقد أكملت جميع الدروس واجتزت كافة الاختبارات في دورة{' '}
                  <span className="font-bold">{courseTitle}</span> بنجاح
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClaimCertificate}
              className="z-10 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm rounded-xl shadow-md shadow-amber-300/50 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap cursor-pointer"
            >
              <Award className="w-5 h-5" />
              احصل على شهادتك
            </button>
          </div>
        </div>
      )}

      {/* 📝 Lessons Complete but Exams Pending Banner */}
      {areAllLessonsCompleted && !areAllQuizzesCompleted && hasCertificate !== false && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-primary-600 p-1 shadow-md shadow-indigo-100">
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50/70 to-slate-50 rounded-xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 z-10">
              <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl shadow-sm shrink-0">
                <FileQuestion className="w-8 h-8" />
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-extrabold text-indigo-950">
                    أتممت جميع الدروس! يتبقى عليك إتمام الاختبارات للحصول على الشهادة
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    تم إنجاز {completedQuizzesCount} من {totalQuizzesCount} اختبارات
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-indigo-800/80 mt-1">
                  لا يمكنك استلام شهادة إتمام دورة <span className="font-bold">{courseTitle}</span>{' '}
                  إلا بعد حل {requireExamPassingToUnlock ? 'واجتياز' : 'وتسليم'} جميع الاختبارات المرفقة بالدورة.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onGoToQuizzes}
              className="z-10 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-primary-600 hover:from-indigo-700 hover:to-primary-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap cursor-pointer"
            >
              <FileQuestion className="w-4 h-4" />
              الانتقال للاختبارات والتقييم
            </button>
          </div>
        </div>
      )}

      {/* Next-Step Guidance Banner */}
      {nextStepInfo && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs transition-all ${
            nextStepInfo.type === 'unit_quiz'
              ? 'bg-gradient-to-r from-amber-50 to-orange-50/70 border-amber-200 text-amber-950'
              : nextStepInfo.type === 'course_quiz'
              ? 'bg-gradient-to-r from-indigo-50 to-purple-50/70 border-indigo-200 text-indigo-950'
              : 'bg-primary-50/70 border-primary-200 text-primary-950'
          }`}
        >
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                nextStepInfo.type === 'unit_quiz'
                  ? 'bg-amber-500 text-white'
                  : nextStepInfo.type === 'course_quiz'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-primary-600 text-white'
              }`}
            >
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold uppercase tracking-wide opacity-80">
                  الخطوة التالية الموصى بها
                </span>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    nextStepInfo.isOptional
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-200/90 text-amber-900 border border-amber-300'
                  }`}
                >
                  {nextStepInfo.badge}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold mt-0.5">{nextStepInfo.title}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNextStepAction(nextStepInfo)}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
              nextStepInfo.type === 'unit_quiz'
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : nextStepInfo.type === 'course_quiz'
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            <span>{nextStepInfo.actionText}</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Interactive Post-Video Assessment Prompt Modal */}
      {postVideoPrompt?.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center relative overflow-hidden animate-in zoom-in-95">
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Award className="w-8 h-8" />
              </div>

              <h3 className="text-lg font-black text-slate-900 leading-tight">
                أحسنت! أكملت مشاهدة شرح الدرس
              </h3>
              <p className="text-xs text-slate-600 mt-2 font-medium">
                {postVideoPrompt.isHomework
                  ? 'يوجد واجب منزلي مخصص لهذا الدرس، هل ترغب في البدء في حله الآن؟'
                  : 'يوجد اختبار مخصص لقياس فهمك لهذا الدرس، هل ترغب في بدء الاختبار الآن؟'}
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 my-5 text-right flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary-600 shrink-0 shadow-xs">
                    <FileQuestion className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        {postVideoPrompt.isHomework ? 'واجب الدرس' : 'اختبار الدرس'}
                      </span>
                      {postVideoPrompt.assessment.isOptional ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          اختياري
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                          إجباري للمتابعة
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-black text-slate-800 mt-1">
                      {postVideoPrompt.assessment.title}
                    </h4>
                  </div>
                </div>
                <div className="text-left shrink-0">
                  <span className="text-xs font-black font-mono text-slate-700">
                    {postVideoPrompt.assessment.totalScore} د
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    onStartAssessmentFromPrompt(
                      postVideoPrompt.assessment.id,
                      postVideoPrompt.lessonId
                    )
                  }
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-primary-500/20 transition-all cursor-pointer"
                >
                  <span>
                    {postVideoPrompt.isHomework ? 'بدء حل الواجب الآن ✍️' : 'بدء الاختبار الآن ✍️'}
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onShowInTabFromPrompt}
                    className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    عرض في التبويب
                  </button>
                  <button
                    type="button"
                    onClick={onDismissPrompt}
                    className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    لاحقاً
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
