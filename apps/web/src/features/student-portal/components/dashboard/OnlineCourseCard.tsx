'use client';

import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import {
  BookOpen,
  Play,
  Clock,
  Award,
  CheckCircle,
  TrendingUp,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { resolveAssetUrl } from '@/lib/utils/asset-url';

interface OnlineCourseCardProps {
  course: any;
  index: number;
  myCourses: any[];
  onQuickEnroll: (course: any) => void;
  onViewCertificate?: (course: { title: string; teacherName?: string }) => void;
  onOpenPromo: (promo: { title: string; videoUrl: string; teacherName?: string }) => void;
  isEnrollPending?: boolean;
}

export function OnlineCourseCard({
  course,
  index,
  myCourses,
  onQuickEnroll,
  onViewCertificate,
  onOpenPromo,
  isEnrollPending = false,
}: OnlineCourseCardProps) {
  const enrollment = myCourses.find(
    (c: any) => c.courseId === course.id || c.id === course.id,
  );
  const isEnrolled =
    enrollment &&
    (enrollment.enrollmentStatus === 'ACTIVE' ||
      (!enrollment.enrollmentStatus && enrollment.accessStatus === 'ACTIVE'));
  const isPending = enrollment?.enrollmentStatus === 'PENDING';
  const isRejected = enrollment?.enrollmentStatus === 'DROPPED';

  const progress = Number(enrollment?.progressPercentage || 0);
  const totalLessons = Number(
    enrollment?.totalLessons ?? course.lessonsCount ?? course._count?.lessons ?? 0,
  );
  const completedLessons = Number(
    enrollment?.completedLessons ??
      (totalLessons > 0 ? Math.round((progress / 100) * totalLessons) : 0),
  );
  const isCompleted =
    isEnrolled &&
    (Boolean(enrollment?.isCompleted) ||
      (progress >= 100 && (totalLessons > 0 || completedLessons > 0)));
  const isCertificateEligible = Boolean(enrollment?.isCertificateEligible);

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all text-right ${
        isPending
          ? 'border-amber-300 ring-1 ring-amber-200'
          : isCompleted
          ? 'border-emerald-200 ring-1 ring-emerald-100'
          : 'border-slate-100 hover:border-slate-200'
      }`}
    >
      {/* Card Banner / Thumbnail */}
      <div className="h-36 w-full bg-slate-100 relative overflow-hidden shrink-0 group/cover">
        {course.coverImageUrl ? (
          <>
            <img
              src={resolveAssetUrl(course.coverImageUrl)}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30 pointer-events-none" />
          </>
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${
              isCompleted
                ? 'from-emerald-600 via-teal-600 to-teal-700'
                : index % 3 === 0
                ? 'from-blue-600 to-indigo-600'
                : index % 3 === 1
                ? 'from-indigo-600 to-purple-600'
                : 'from-emerald-600 to-teal-600'
            } flex items-center justify-center text-white`}
          >
            <BookOpen className="w-12 h-12 opacity-30" />
          </div>
        )}

        {/* Preview Video Play Overlay */}
        {(course.previewVideoUrl || course.freeVideoUrl) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPromo({
                title: course.title,
                videoUrl: course.previewVideoUrl || course.freeVideoUrl,
                teacherName: course.teacher?.user?.fullName || course.teacherName,
              });
            }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-all group/play cursor-pointer"
            title="مشاهدة الفيديو التعريفي (البرومو) للكورس"
          >
            <div className="w-11 h-11 bg-white/90 group-hover/play:bg-white text-primary-600 rounded-full flex items-center justify-center shadow-lg group-hover/play:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          </button>
        )}

        {/* Badges on top */}
        <div className="absolute top-3 inset-x-3 flex items-start justify-between z-20 pointer-events-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="bg-slate-900/80 backdrop-blur-md text-white border border-white/20 text-[11px] font-bold shadow-xs">
              {course.subject || 'مادة عامة'}
            </Badge>
            <Badge className="bg-black/60 backdrop-blur-md text-white border border-white/10 text-[11px]">
              {course.gradeLevel}
            </Badge>
            {isPending && (
              <Badge className="bg-amber-500 text-white border-none text-[11px] font-bold shadow-xs flex items-center gap-1 animate-pulse">
                <Clock className="w-3 h-3" />
                <span>قيد المراجعة</span>
              </Badge>
            )}
            {isCompleted ? (
              <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-none text-[11px] font-extrabold shadow-md flex items-center gap-1 ring-1 ring-white/30">
                <Award className="w-3.5 h-3.5 text-amber-200" />
                <span>مكتمل 100% 🎓</span>
              </Badge>
            ) : isEnrolled ? (
              <Badge className="bg-emerald-500 text-white border-none text-[11px] font-bold shadow-xs flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>مشترك بالفعل{progress > 0 ? ` • ${progress}%` : ''}</span>
              </Badge>
            ) : null}
          </div>

          <Badge className="bg-white/90 backdrop-blur-md text-slate-800 border-none text-[11px] font-bold shadow-xs shrink-0">
            {course.academicTerm === 'FIRST_TERM' ? 'ترم أول' : 'ترم ثاني'}
          </Badge>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-bold text-lg text-slate-900 line-clamp-1 group-hover:text-primary-600 transition-colors">
              {course.title}
            </h4>
            {Number(course.price) > 0 ? (
              <span className="font-black text-primary-700 shrink-0 text-sm bg-primary-50 border border-primary-100 px-2.5 py-0.5 rounded-lg">
                {course.price} ج.م
              </span>
            ) : (
              <span className="font-bold text-emerald-700 shrink-0 text-xs bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-lg">
                مجاني
              </span>
            )}
          </div>

          <p className="text-xs font-semibold text-slate-500">
            المعلم: <strong className="text-slate-800">{course.teacher?.user?.fullName || course.teacherName || 'أ. أحمد غريب'}</strong>
          </p>

          <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
            {course.description || 'شرح مبسط ومفصل للمنهج مع تدريبات تفاعلية ومذكرات رقمية.'}
          </p>
        </div>

        {/* Progress Box for Enrolled Courses */}
        {isEnrolled && (
          <div
            className={`p-3 rounded-xl border transition-all ${
              isCompleted
                ? 'bg-gradient-to-b from-emerald-50/90 to-teal-50/50 border-emerald-200 shadow-2xs'
                : 'bg-slate-50/90 border-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-1.5">
                {isCompleted ? (
                  <span className="text-emerald-800 flex items-center gap-1.5 font-extrabold text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>أتممت هذه الدورة بنجاح</span>
                  </span>
                ) : (
                  <span className="text-slate-700 flex items-center gap-1.5 font-semibold text-xs">
                    <TrendingUp className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                    <span>مستوى التقدم في الكورس</span>
                  </span>
                )}
              </div>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-lg shrink-0 ${
                  isCompleted
                    ? 'bg-emerald-200 text-emerald-950 font-bold'
                    : 'bg-primary-100/80 text-primary-800'
                }`}
              >
                {progress}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isCompleted
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-xs'
                    : 'bg-gradient-to-r from-primary-600 to-indigo-500'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-medium">
              <span>
                {totalLessons > 0
                  ? `${completedLessons} من ${totalLessons} درس مكتمل`
                  : isCompleted
                  ? 'جميع الدروس مكتملة'
                  : 'في بداية المسار'}
              </span>
              {isCompleted && isCertificateEligible && onViewCertificate && (
                <button
                  type="button"
                  onClick={() =>
                    onViewCertificate({
                      title: course.title,
                      teacherName: course.teacher?.user?.fullName || course.teacherName,
                    })
                  }
                  className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>عرض الشهادة</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Card Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
          <Link
            href={`/student/courses/${course.id}`}
            className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs text-center transition-colors shadow-2xs"
          >
            تفاصيل المنهج
          </Link>

          {isCompleted ? (
            <Link
              href={`/student/courses/${course.id}/learn`}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs text-center transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <Award className="w-3.5 h-3.5 text-amber-200" />
              <span>مراجعة الكورس 🎓</span>
            </Link>
          ) : isEnrolled ? (
            <Link
              href={`/student/courses/${course.id}/learn`}
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs text-center transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>استئناف التعلم</span>
            </Link>
          ) : isPending ? (
            <button
              type="button"
              onClick={() => onQuickEnroll(course)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs text-center transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>قيد المراجعة ⏳</span>
            </button>
          ) : isRejected ? (
            <button
              type="button"
              onClick={() => onQuickEnroll(course)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs text-center transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة الاشتراك</span>
            </button>
          ) : Number(course.price || 0) === 0 || course.isFree ? (
            <button
              type="button"
              onClick={() => onQuickEnroll(course)}
              disabled={isEnrollPending}
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs text-center transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isEnrollPending ? 'جاري التسجيل...' : 'ابدأ التعلم مجاناً'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onQuickEnroll(course)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs text-center transition-colors shadow-xs cursor-pointer"
            >
              اشترك الآن
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
