'use client';

import React from 'react';
import {
  Layers,
  Video,
  CheckCircle,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  Lock,
  Play,
} from 'lucide-react';
import { CourseModule, CourseLesson } from '@/features/courses/types/courses.types';
import toast from 'react-hot-toast';

interface CourseSyllabusSidebarProps {
  modules: CourseModule[];
  allLessons?: CourseLesson[]; // ordered flat list for sequential unlock calculation
  activeLessonId: string | null;
  onSelectLesson: (lessonId: string) => void;
  onSelectQuiz?: (quizId: string) => void;
  completedLessonIds?: string[];
  enforceSequentialLessons?: boolean;
  requireExamPassingToUnlock?: boolean;
}

export function CourseSyllabusSidebar({
  modules = [],
  allLessons,
  activeLessonId,
  onSelectLesson,
  onSelectQuiz,
  completedLessonIds = [],
  enforceSequentialLessons = false,
  requireExamPassingToUnlock = false,
}: CourseSyllabusSidebarProps) {
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const completedCount = completedLessonIds.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  /**
   * Compute the set of unlocked lesson IDs when sequential enforcement is active.
   * - The very first lesson in the course is always unlocked.
   * - Each subsequent lesson is unlocked only if the lesson directly before it is completed AND its quiz is satisfied.
   */
  const unlockedLessonIds = React.useMemo<Set<string>>(() => {
    const unlocked = new Set<string>();

    if (!enforceSequentialLessons) {
      // When not enforcing, all lessons are unlocked
      modules.forEach((m) => m.lessons?.forEach((l) => unlocked.add(l.id)));
      return unlocked;
    }

    // Use allLessons prop if provided (already ordered), otherwise flatten modules
    const ordered: CourseLesson[] = allLessons?.length
      ? allLessons
      : modules.flatMap((m) => (m.lessons || []).slice().sort((a, b) => a.orderIndex - b.orderIndex));

    for (let i = 0; i < ordered.length; i++) {
      const lesson = ordered[i];
      if (i === 0) {
        // First lesson is always accessible
        unlocked.add(lesson.id);
      } else {
        const prev = ordered[i - 1];
        const isPrevCompleted = completedLessonIds.includes(prev.id);

        let isPrevQuizSatisfied = true;
        if (prev.lessonQuiz) {
          const submission = prev.lessonQuiz.mySubmission;
          if (!submission) {
            isPrevQuizSatisfied = false;
          } else if (requireExamPassingToUnlock) {
            const passScore = prev.lessonQuiz.passingScore ?? 0;
            const score = submission.scoreObtained ?? 0;
            const passed = submission.isPassed ?? (score >= passScore);
            if (!passed) {
              isPrevQuizSatisfied = false;
            }
          } else {
            const submitted = submission.status === 'SUBMITTED' || submission.status === 'GRADED';
            if (!submitted) {
              isPrevQuizSatisfied = false;
            }
          }
        }

        if (isPrevCompleted && isPrevQuizSatisfied) {
          unlocked.add(lesson.id);
        }
      }
    }

    return unlocked;
  }, [enforceSequentialLessons, requireExamPassingToUnlock, modules, allLessons, completedLessonIds]);

  const handleLessonClick = (lesson: CourseLesson) => {
    if (!unlockedLessonIds.has(lesson.id)) {
      const ordered: CourseLesson[] = allLessons?.length
        ? allLessons
        : modules.flatMap((m) => (m.lessons || []).slice().sort((a, b) => a.orderIndex - b.orderIndex));
      const idx = ordered.findIndex((l) => l.id === lesson.id);
      const prev = idx > 0 ? ordered[idx - 1] : null;

      if (prev?.lessonQuiz && !prev.lessonQuiz.mySubmission) {
        toast(`يجب حل وتسليم اختبار/واجب الدرس السابق (${prev.title}) أولاً لفتح هذا الدرس 📝🔒`, { icon: '⚠️' });
      } else if (prev?.lessonQuiz && requireExamPassingToUnlock && !prev.lessonQuiz.mySubmission?.isPassed) {
        toast(`يجب اجتياز اختبار الدرس السابق (${prev.title}) بدرجة النجاح (${prev.lessonQuiz.passingScore} من ${prev.lessonQuiz.totalScore}) لفتح هذا الدرس 🎯🔒`, { icon: '⚠️' });
      } else {
        toast('يجب إتمام الدرس السابق أولاً قبل الانتقال لهذا الدرس 🔒', { icon: '⚠️' });
      }
      return;
    }
    onSelectLesson(lesson.id);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-full text-right shadow-sm">
      {/* Header with Progress Bar */}
      <div className="p-5 border-b border-slate-100 bg-slate-50 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">محتوى ومنهج الدورة</span>
          <span className="text-xs font-bold text-primary-600 font-mono">{progressPercent}% مكتمل</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary-600 h-full transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>{totalLessons} دروس مصورة</span>
          <span>{completedCount} من {totalLessons} مكتملة</span>
        </div>

        {/* Sequential enforcement badge */}
        {enforceSequentialLessons && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            <Lock className="w-3 h-3 shrink-0" />
            <span className="font-bold">المنهج مرتب بالتسلسل — أكمل كل درس للانتقال للتالي</span>
          </div>
        )}
      </div>

      {/* Syllabus Units Accordion List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
        {modules.map((mod: CourseModule, modIndex: number) => {
          return (
            <div key={mod.id} className="p-3.5 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-primary-600">
                  الوحدة {modIndex + 1}: {mod.title}
                </span>
                <span className="text-[10px] text-slate-400">{mod.lessons?.length || 0} دروس</span>
              </div>

              {/* Lessons in Unit */}
              <div className="space-y-1">
                {mod.lessons?.map((les: CourseLesson, lesIndex: number) => {
                  const isActive = les.id === activeLessonId;
                  const isCompleted = completedLessonIds.includes(les.id);
                  const isLocked = !unlockedLessonIds.has(les.id);

                  return (
                    <button
                      key={les.id}
                      type="button"
                      onClick={() => handleLessonClick(les)}
                      title={isLocked ? 'أكمل الدرس السابق للوصول لهذا الدرس' : les.title}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all text-right ${
                        isActive
                          ? 'bg-primary-50 text-primary-900 font-bold border-r-4 border-primary-600 shadow-sm'
                          : isLocked
                          ? 'opacity-60 cursor-not-allowed bg-slate-50 text-slate-400'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-600'
                              : isLocked
                              ? 'bg-slate-200 text-slate-400'
                              : isActive
                              ? 'bg-primary-600 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : isLocked ? (
                            <Lock className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                        </div>

                        <div className="truncate">
                          <p className="truncate text-xs">{les.title}</p>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                            {les.videoDurationSeconds ? (
                              <span>{Math.floor(les.videoDurationSeconds / 60)} دقيقة</span>
                            ) : null}
                            {les.isPreview && (
                              <span className="text-emerald-600 font-bold">• مجاني</span>
                            )}
                            {isLocked && (
                              <span className="text-amber-500 font-bold">• مقفل</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {les.lessonQuiz && !isLocked && (
                        <span title="يحتوي على اختبار">
                          <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
