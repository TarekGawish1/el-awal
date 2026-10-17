'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  BookOpen,
  Play,
  Clock,
  Award,
  User,
  Video,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';
import { resolveAssetUrl } from '@/lib/utils/asset-url';

export interface EnrolledCourseCardProps {
  course: any;
  onWatchPreview: (data: { title: string; videoUrl: string; teacherName?: string }) => void;
  onOpenPendingSubscription: (course: any) => void;
  onOpenCertificate: (data: { title: string; teacherName?: string }) => void;
}

export const EnrolledCourseCard = memo(function EnrolledCourseCard({
  course: c,
  onWatchPreview,
  onOpenPendingSubscription,
  onOpenCertificate,
}: EnrolledCourseCardProps) {
  return (
    <Card
      key={c.courseId}
      className={`border shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group ${
        c.enrollmentStatus === 'PENDING'
          ? 'border-amber-300 ring-1 ring-amber-200'
          : 'border-none shadow-slate-200/50'
      }`}
    >
      <div className="h-44 w-full bg-slate-100 relative overflow-hidden shrink-0">
        {c.coverImageUrl ? (
          <img
            src={resolveAssetUrl(c.coverImageUrl)}
            alt={c.title}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-primary-600 to-primary-700 flex items-center justify-center text-white">
            <BookOpen className="w-12 h-12 opacity-40" />
          </div>
        )}

        {/* Play preview video overlay */}
        {c.previewVideoUrl && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onWatchPreview({
                title: c.title,
                videoUrl: c.previewVideoUrl,
                teacherName: c.teacherName,
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
          <Badge
            variant="default"
            className="bg-white/95 text-slate-800 border-none shadow-xs font-semibold"
          >
            {c.subject || 'عام'}
          </Badge>
          {c.enrollmentStatus === 'PENDING' && (
            <Badge className="bg-amber-500 text-white border-none text-[11px] font-bold shadow-xs flex items-center gap-1 animate-pulse">
              <Clock className="w-3 h-3" />
              <span>قيد المراجعة</span>
            </Badge>
          )}
          {c.progressPercentage >= 100 && (
            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-none text-[11px] font-extrabold shadow-sm flex items-center gap-1 ring-1 ring-white/30">
              <Award className="w-3.5 h-3.5 text-amber-200" />
              <span>مكتمل 100% 🎓</span>
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-800 line-clamp-1 group-hover:text-primary-600 transition-colors leading-tight">
            {c.title}
          </h3>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              المعلم: {c.teacherName}
            </p>
            {c.previewVideoUrl && (
              <button
                type="button"
                onClick={() =>
                  onWatchPreview({
                    title: c.title,
                    videoUrl: c.previewVideoUrl,
                    teacherName: c.teacherName,
                  })
                }
                className="text-[11px] font-bold text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Video className="w-3.5 h-3.5" />
                <span>فيديو تعريفي 🎬</span>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed pt-1">
            {c.description || 'لا يوجد وصف تفصيلي متاح لهذه الدورة.'}
          </p>
        </div>

        <div className="space-y-3 pt-3 border-t border-slate-100">
          {/* Progress tracker */}
          <div
            className={`p-3 rounded-xl border transition-all ${
              c.progressPercentage >= 100
                ? 'bg-gradient-to-b from-emerald-50/90 to-teal-50/50 border-emerald-200'
                : 'bg-slate-50 border-slate-100'
            }`}
          >
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span
                className={
                  c.progressPercentage >= 100
                    ? 'text-emerald-800 font-bold flex items-center gap-1'
                    : 'text-slate-600 flex items-center gap-1'
                }
              >
                {c.progressPercentage >= 100 ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>أتممت الدورة بنجاح 🎉</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                    <span>نسبة الإنجاز</span>
                  </>
                )}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-xs font-black ${
                  c.progressPercentage >= 100
                    ? 'bg-emerald-200 text-emerald-950'
                    : 'bg-primary-100/70 text-primary-800'
                }`}
              >
                {c.progressPercentage || 0}%
              </span>
            </div>
            <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  c.progressPercentage >= 100
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-xs'
                    : 'bg-primary-600'
                }`}
                style={{ width: `${Math.min(c.progressPercentage || 0, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-medium">
              <span>{c.totalModules} فصول</span>
              <span>
                {c.completedLessons != null
                  ? `${c.completedLessons} من ${c.totalLessons} درس مكتمل`
                  : `${c.totalLessons} دروس رقمية`}
              </span>
            </div>
          </div>

          {c.enrollmentStatus === 'PENDING' ? (
            <button
              type="button"
              onClick={() =>
                onOpenPendingSubscription({
                  id: c.courseId,
                  title: c.title,
                  price: c.price,
                  teacherName: c.teacherName,
                  subject: c.subject,
                  gradeLevel: c.gradeLevel,
                })
              }
              className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer mt-2 transition-colors shadow-lg shadow-amber-500/20"
            >
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>طلبك قيد المراجعة ⏳ (عرض الإيصال)</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 mt-2">
              <Link
                href={`/student/courses/${c.courseId}/learn`}
                className={`flex-1 rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm ${
                  c.progressPercentage >= 100
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                }`}
              >
                {c.progressPercentage >= 100 ? (
                  <>
                    <Award className="w-3.5 h-3.5 text-amber-200" />
                    <span>مراجعة الدورة 🎓</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {c.progressPercentage > 0
                        ? 'استئناف التعلم'
                        : 'دخول غرفة التعلم والمشاهدة'}
                    </span>
                  </>
                )}
              </Link>

              {c.progressPercentage >= 100 && c.isCertificateEligible && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenCertificate({ title: c.title, teacherName: c.teacherName })
                  }
                  className="px-3 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  title="تحميل شهادة الإتمام"
                >
                  <Award className="w-4 h-4 text-amber-600" />
                  <span className="hidden sm:inline">شهادتي</span>
                </button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

