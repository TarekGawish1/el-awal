'use client';

import React from 'react';
import Link from 'next/link';
import {
  Video,
  Play,
  Clock,
  User,
  Layers,
  Award,
  Sparkles,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface CourseHeaderBannerProps {
  course: any;
  courseId: string;
  isEnrolled: boolean;
  isCompleted: boolean;
  isPending: boolean;
  isDropped: boolean;
  progress: number;
  completedLessons: number;
  totalLessonsCount: number;
  allModules: any[];
  onEnroll: () => void;
  onOpenSubscriptionModal: () => void;
  isEnrolling: boolean;
}

export function CourseHeaderBanner({
  course,
  courseId,
  isEnrolled,
  isCompleted,
  isPending,
  isDropped,
  progress,
  completedLessons,
  totalLessonsCount,
  allModules,
  onEnroll,
  onOpenSubscriptionModal,
  isEnrolling,
}: CourseHeaderBannerProps) {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-primary-950 to-primary-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none" />

      <div className="flex items-center gap-2 text-xs text-primary-200 mb-3 flex-wrap">
        <Link href="/student/courses" className="hover:text-white transition-colors">
          الدورات الأونلاين
        </Link>
        <span>/</span>
        <span>{course.subject}</span>
        <span>/</span>
        <span className="text-white font-bold">{course.title}</span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-primary-500/30 text-primary-200 border-none px-3 py-1 font-bold">
              {course.subject}
            </Badge>
            <Badge className="bg-white/10 text-white border-none px-3 py-1">
              {course.gradeLevel}
            </Badge>
            {course.academicStage && (
              <Badge className="bg-indigo-500/30 text-indigo-200 border-none px-3 py-1">
                {course.academicStage}
              </Badge>
            )}
            <Badge className="bg-emerald-500/20 text-emerald-300 border-none px-3 py-1">
              {course.academicTerm === 'FIRST_TERM' ? 'الترم الأول' : 'الترم الثاني'}
            </Badge>
            {isEnrolled && (
              <Badge className={`${
                isCompleted 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold shadow-sm' 
                  : 'bg-emerald-500/30 text-emerald-200'
              } border-none px-3 py-1 flex items-center gap-1`}>
                {isCompleted ? (
                  <>
                    <Award className="w-3.5 h-3.5 text-amber-200" />
                    <span>مكتمل 100% 🎓</span>
                  </>
                ) : (
                  <span>مشترك بالفعل • {progress}%</span>
                )}
              </Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{course.title}</h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {course.description || 'شرح تفصيلي ومبسط لمنهج المادة مع تدريبات تفاعلية ومذكرات قابلة للتحميل.'}
          </p>

          <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-300 pt-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-primary-400" />
              <span>المعلم: <strong className="text-white">{course.teacher?.user?.fullName || course.teacherName || 'أ. أحمد غريب'}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary-400" />
              <span>{allModules.length} فصول تعليمية</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Video className="w-4 h-4 text-primary-400" />
              <span>{totalLessonsCount} درس رقمي</span>
            </div>
          </div>
        </div>

        {/* Price & Action Box */}
        <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/15 text-center min-w-[240px] flex flex-col justify-center space-y-4 shrink-0">
          <div>
            <span className="text-xs text-slate-300 block mb-1">سعر الاشتراك</span>
            {Number(course.price) > 0 ? (
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-3xl font-black text-white">{course.price}</span>
                <span className="text-sm font-bold text-primary-300">ج.م</span>
              </div>
            ) : (
              <span className="text-2xl font-black text-emerald-400">مجاني بالكامل</span>
            )}
          </div>

          {isEnrolled ? (
            <div className="space-y-3">
              <div className="p-3 bg-white/10 rounded-xl border border-white/15 text-right space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-300 flex items-center gap-1">
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>أتممت هذه الدورة بنجاح 🎉</span>
                      </>
                    ) : (
                      'مستوى التقدم'
                    )}
                  </span>
                  <span className="font-black text-white">{progress}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCompleted ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-primary-400'
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-300">
                  <span>
                    {totalLessonsCount > 0
                      ? `${completedLessons || Math.round((progress / 100) * totalLessonsCount)} من ${totalLessonsCount} درس مكتمل`
                      : (isCompleted ? 'جميع الدروس مكتملة' : 'في بداية المسار')}
                  </span>
                </div>
              </div>

              <Link
                href={`/student/courses/${courseId}/learn`}
                className={`w-full py-3.5 px-6 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 text-sm text-white ${
                  isCompleted
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/25'
                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25'
                }`}
              >
                {isCompleted ? (
                  <>
                    <Award className="w-4 h-4 text-amber-200" />
                    <span>مراجعة محتوى الدورة 🎓</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>دخول غرفة التعلم والمشاهدة</span>
                  </>
                )}
              </Link>
            </div>
          ) : isPending ? (
            <button
              type="button"
              onClick={onOpenSubscriptionModal}
              className="w-full py-3.5 px-6 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Clock className="w-4 h-4 animate-pulse" />
              <span>طلبك قيد المراجعة ⏳ (عرض تفاصيل الإيصال)</span>
            </button>
          ) : isDropped ? (
            <button
              type="button"
              onClick={onOpenSubscriptionModal}
              className="w-full py-3.5 px-6 rounded-xl font-bold bg-primary-600 hover:bg-primary-700 text-white transition-all shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة الاشتراك في الكورس</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onEnroll}
              disabled={isEnrolling}
              className="w-full py-3.5 px-6 rounded-xl font-bold bg-primary-500 hover:bg-primary-600 text-white transition-all shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
            >
              {isEnrolling ? (
                <span>جاري تفعيل الاشتراك...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>اشترك الآن في هذا الكورس</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
