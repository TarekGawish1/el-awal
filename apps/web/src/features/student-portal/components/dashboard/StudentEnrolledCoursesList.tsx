'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BookOpen, Award, FileQuestion } from 'lucide-react';
import Image from 'next/image';
import { resolveAssetUrl, isOptimizableImage } from '@/lib/utils/asset-url';

interface StudentEnrolledCoursesListProps {
  courses?: any[];
  onViewCertificate: (course: { title: string; teacherName?: string }) => void;
}

export function StudentEnrolledCoursesList({
  courses = [],
  onViewCertificate,
}: StudentEnrolledCoursesListProps) {
  return (
    <Card className="border-slate-100 shadow-sm">
      <CardHeader className="border-b border-slate-50 bg-slate-50/50 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          متابعة الدورات
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {!courses?.length ? (
          <div className="text-center py-8 text-slate-500 flex flex-col items-center">
            <BookOpen className="w-10 h-10 text-slate-300 mb-3" />
            <p>لا توجد دورات مسجلة حالياً</p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.slice(0, 3).map((course: any) => (
              <div
                key={course.courseId}
                className="bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {course.coverImageUrl ? (
                      <Image
                        src={resolveAssetUrl(course.coverImageUrl)}
                        alt={course.title}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200"
                        unoptimized={!isOptimizableImage(resolveAssetUrl(course.coverImageUrl))}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                        <BookOpen className="w-6 h-6" />
                      </div>
                    )}
                    <Link
                      href={`/student/courses/${course.courseId}/learn`}
                      className="flex-1 min-w-0"
                    >
                      <h4 className="font-bold text-slate-800 truncate hover:text-primary-600 transition-colors">
                        {course.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">{course.teacherName}</p>
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {course.progressPercentage >= 100 && course.isCertificateEligible !== false ? (
                      <button
                        type="button"
                        onClick={() =>
                          onViewCertificate({
                            title: course.title,
                            teacherName: course.teacherName,
                          })
                        }
                        title="تحميل شهادة الإتمام"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white shadow-sm shadow-amber-200 hover:shadow-md hover:-translate-y-0.5 transition-all"
                      >
                        <Award className="w-3.5 h-3.5" />
                        شهادتي
                      </button>
                    ) : course.progressPercentage >= 100 && course.isCertificateEligible === false ? (
                      <Link
                        href={`/student/courses/${course.courseId}/learn`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                        title="أكملت الدروس - اضغط لإتمام الاختبارات واستلام الشهادة"
                      >
                        <FileQuestion className="w-3 h-3 text-amber-600" />
                        يتبقى الاختبارات
                      </Link>
                    ) : (
                      <Badge variant="outline" className="bg-white">
                        نسبة الإنجاز: {course.progressPercentage || 0}%
                      </Badge>
                    )}
                  </div>
                </div>
                {/* Progress bar */}
                <div className="px-4 pb-3">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span
                      className={
                        course.progressPercentage >= 100
                          ? 'text-emerald-700 font-bold flex items-center gap-1'
                          : 'text-slate-500 font-medium'
                      }
                    >
                      {course.progressPercentage >= 100
                        ? 'أتممت الدورة (100%)'
                        : `التقدم: ${course.progressPercentage || 0}%`}
                    </span>
                    {course.totalLessons > 0 && (
                      <span className="text-slate-400 text-[10px]">
                        {course.completedLessons ??
                          Math.round(
                            ((course.progressPercentage || 0) / 100) *
                              course.totalLessons,
                          )}{' '}
                        من {course.totalLessons} درس
                      </span>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        course.progressPercentage >= 100
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          : 'bg-primary-500'
                      }`}
                      style={{
                        width: `${Math.min(course.progressPercentage || 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
