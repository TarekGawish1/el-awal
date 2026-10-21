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
} from 'lucide-react';
import Image from 'next/image';
import { resolveAssetUrl, isOptimizableImage } from '@/lib/utils/asset-url';

export interface AvailableCourseCardProps {
  course: any;
  index: number;
  myCourses?: any[];
  onViewCertificate?: (course: { title: string; teacherName?: string }) => void;
  onWatchPreview?: (course: { title: string; videoUrl: string; teacherName?: string }) => void;
  onEnroll: (course: any) => void;
}

export function AvailableCourseCard({
  course: c,
  index,
  myCourses = [],
  onViewCertificate,
  onWatchPreview,
  onEnroll,
}: AvailableCourseCardProps) {
  const enrollment = myCourses.find(
    (item: any) => item.courseId === c.id || item.id === c.id
  );
  const isEnrolled =
    enrollment &&
    (enrollment.enrollmentStatus === 'ACTIVE' ||
      (!enrollment.enrollmentStatus && enrollment.accessStatus === 'ACTIVE'));
  const isPending = enrollment?.enrollmentStatus === 'PENDING';
  const isRejected = enrollment?.enrollmentStatus === 'DROPPED';

  const progress = Number(enrollment?.progressPercentage || 0);
  const totalLessons = Number(
    enrollment?.totalLessons ?? c.lessonsCount ?? c._count?.lessons ?? 0
  );
  const completedLessons = Number(
    enrollment?.completedLessons ??
      (totalLessons > 0 ? Math.round((progress / 100) * totalLessons) : 0)
  );
  const isCompleted =
    isEnrolled &&
    (Boolean(enrollment?.isCompleted) ||
      (progress >= 100 && (totalLessons > 0 || completedLessons > 0)));
  const isCertificateEligible = Boolean(enrollment?.isCertificateEligible);

  return (
    <div
      key={c.id}
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all text-right ${
        isPending
          ? 'border-amber-300 ring-1 ring-amber-200'
          : isCompleted
          ? 'border-emerald-200 ring-1 ring-emerald-100'
          : 'border-slate-200/80 hover:border-slate-300'
      }`}
    >
      {/* Banner / Cover */}
      <div className="h-44 w-full bg-slate-100 relative overflow-hidden shrink-0">
        {c.coverImageUrl ? (
          <Image
            src={resolveAssetUrl(c.coverImageUrl)}
            alt={c.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-103 transition-transform duration-500"
            unoptimized={!isOptimizableImage(resolveAssetUrl(c.coverImageUrl))}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${
              isCompleted
                ? 'from-emerald-600 via-teal-600 to-teal-700'
                : index % 3 === 0
                ? 'from-blue-600 to-indigo-700'
                : index % 3 === 1
                ? 'from-indigo-600 to-purple-700'
                : 'from-emerald-600 to-teal-700'
            } flex items-center justify-center text-white`}
          >
            <BookOpen className="w-10 h-10 opacity-30" />
          </div>
        )}

        {/* Play preview button overlay if preview video exists */}
        {(c.previewVideoUrl || c.freeVideoUrl) && onWatchPreview && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onWatchPreview({
                title: c.title,
                videoUrl: c.previewVideoUrl || c.freeVideoUrl,
                teacherName: c.teacher?.user?.fullName || c.teacherName,
              });
            }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 hover:bg-black/45 transition-all group/play cursor-pointer"
            title="مشاهدة الفيديو التعريفي (البرومو) للكورس"
          >
            <div className="w-12 h-12 bg-white/90 group-hover/play:bg-white text-primary-600 rounded-full flex items-center justify-center shadow-lg group-hover/play:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          </button>
        )}

        <div className="absolute top-3 right-3 flex items-center gap-1.5 flex-wrap z-20">
          <Badge className="bg-white/95 text-slate-800 border-none text-[11px] font-bold shadow-xs">
            {c.subject || 'مادة عامة'}
          </Badge>
          <Badge className="bg-black/40 text-white border-none text-[11px]">
            {c.gradeLevel}
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

        <div className="absolute top-3 left-3 z-20">
          <Badge className="bg-white/90 text-slate-800 border-none text-[11px] font-bold shadow-xs">
            {c.academicTerm === 'FIRST_TERM' ? 'ترم أول' : 'ترم ثاني'}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-bold text-lg text-slate-900 line-clamp-1 group-hover:text-primary-600 transition-colors">
              {c.title}
            </h4>
            {Number(c.price) > 0 ? (
              <span className="font-black text-primary-700 shrink-0 text-sm bg-primary-50 border border-primary-100 px-2.5 py-0.5 rounded-lg">
                {c.price} ج.م
              </span>
            ) : (
              <span className="font-bold text-emerald-700 shrink-0 text-xs bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-lg">
                مجاني
              </span>
            )}
          </div>

          <p className="text-xs font-semibold text-slate-500">
            المعلم:{' '}
            <strong className="text-slate-800">
              {c.teacher?.user?.fullName || c.teacherName || 'أ. أحمد غريب'}
            </strong>
          </p>

          <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
            {c.description || 'شرح مبسط ومفصل للمنهج مع تدريبات تفاعلية ومذكرات رقمية.'}
          </p>
        </div>

        {/* Progress Box for Enrolled Courses */}
        {isEnrolled && (
          <div
            className={`p-3 rounded-xl border transition-all ${
              isCompleted
                ? 'bg-gradient-to-b from-emerald-50/90 to-teal-50/50 border-emerald-200'
                : 'bg-slate-50 border-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-1.5">
                {isCompleted ? (
                  <span className="text-emerald-800 flex items-center gap-1.5 font-extrabold text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>أتممت هذه الدورة بنجاح 🎉</span>
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
                      title: c.title,
                      teacherName: c.teacher?.user?.fullName || c.teacherName,
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

        {/* Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
          {(c.previewVideoUrl || c.freeVideoUrl) && onWatchPreview && (
            <button
              type="button"
              onClick={() =>
                onWatchPreview({
                  title: c.title,
                  videoUrl: c.previewVideoUrl || c.freeVideoUrl,
                  teacherName: c.teacher?.user?.fullName || c.teacherName,
                })
              }
              className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs text-center transition-colors border border-emerald-200/80 shadow-2xs flex items-center justify-center gap-1 cursor-pointer shrink-0"
              title="مشاهدة الفيديو التعريفي المجاني"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>برومو 🎬</span>
            </button>
          )}

          <Link
            href={`/student/courses/${c.id}`}
            className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs text-center transition-colors shadow-2xs"
          >
            تفاصيل المنهج
          </Link>

          {isCompleted ? (
            <Link
              href={`/student/courses/${c.id}/learn`}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs text-center transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <Award className="w-3.5 h-3.5 text-amber-200" />
              <span>مراجعة الكورس 🎓</span>
            </Link>
          ) : isEnrolled ? (
            <Link
              href={`/student/courses/${c.id}/learn`}
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs text-center transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>استئناف التعلم</span>
            </Link>
          ) : isPending ? (
            <button
              type="button"
              onClick={() => onEnroll(c)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs text-center transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>قيد المراجعة ⏳</span>
            </button>
          ) : isRejected ? (
            <button
              type="button"
              onClick={() => onEnroll(c)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs text-center transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة الاشتراك</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onEnroll(c)}
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
