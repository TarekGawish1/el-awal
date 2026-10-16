'use client';

import React from 'react';
import { useCourseDetails } from '@/features/student-portal/hooks/useStudentPortal';
import { formatLessonDurationArabic } from '@/features/courses/utils/video-optimizer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import {
  BookOpen,
  Video,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface CourseDetailsViewProps {
  courseId: string;
  onBack: () => void;
  onStartLesson: (id: string) => void;
}

export function CourseDetailsView({
  courseId,
  onBack,
  onStartLesson,
}: CourseDetailsViewProps) {
  const { data: course, isLoading, isError } = useCourseDetails(courseId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onBack} size="sm">
          رجوع
        </Button>
        <Alert variant="error">فشل في تحميل تفاصيل المنهج الدراسي.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header back button */}
      <button
        onClick={onBack}
        className="flex items-center text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-5 h-5 ml-1" />
        الرجوع لجميع دوراتي
      </button>

      {/* Course card banner */}
      <Card className="border-none shadow-sm shadow-slate-200/50 bg-gradient-to-br from-white to-slate-50/20 overflow-hidden relative">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <BookOpen className="w-16 h-16 opacity-75" />
          </div>

          <div className="space-y-2 text-center md:text-right flex-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <Badge
                variant="default"
                className="bg-primary-50 text-primary-700 border-none font-semibold"
              >
                {course.subject}
              </Badge>
              <Badge
                variant="outline"
                className="border-slate-200 bg-white/50 text-slate-600"
              >
                الصف: {course.gradeLevel}
              </Badge>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">
              {course.title}
            </h2>
            <p className="text-sm text-slate-500 max-w-2xl">
              {course.description || 'لا يوجد وصف تفصيلي للمنهج مضاف حالياً.'}
            </p>
            <p className="text-xs text-slate-400 font-semibold pt-1">
              المعلم المحاضر: {course.teacher?.user?.fullName}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Curriculum outline */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-600" />
          المحتوى الدراسي للمنهج ({course.modules?.length || 0} فصول)
        </h3>

        {course.modules?.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/60">
            <p className="text-slate-500 font-medium">
              لم يتم نشر أي فصول أو دروس لهذا المنهج بعد.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {course.modules.map((mod: any, mIdx: number) => (
              <div
                key={mod.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden"
              >
                {/* Module title header */}
                <div className="bg-slate-50/75 p-5 border-b border-slate-100 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm shrink-0">
                    {mIdx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-md leading-tight">
                      {mod.title}
                    </h4>
                    {mod.description && (
                      <p className="text-xs text-slate-400 mt-1 leading-normal">
                        {mod.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Lessons list inside module */}
                <div className="divide-y divide-slate-100">
                  {mod.lessons?.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      لا توجد دروس مضافة لهذا الفصل حتى الآن.
                    </div>
                  ) : (
                    mod.lessons.map((lesson: any) => {
                      const isVideo = lesson.lessonType === 'VIDEO';
                      return (
                        <div
                          key={lesson.id}
                          onClick={() => onStartLesson(lesson.id)}
                          className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg shrink-0 ${
                                isVideo
                                  ? 'bg-rose-50 text-rose-500'
                                  : 'bg-blue-50 text-blue-500'
                              }`}
                            >
                              {isVideo ? (
                                <Video className="w-4 h-4" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <h5 className="font-semibold text-sm text-slate-700 group-hover:text-primary-600 transition-colors">
                                {lesson.title}
                              </h5>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                <span>
                                  {isVideo ? 'فيديو محاضرة' : 'ملف / ملخص دراسي'}
                                </span>
                                {lesson.videoDurationSeconds > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      {formatLessonDurationArabic(
                                        lesson.videoDurationSeconds
                                      )}
                                    </span>
                                  </>
                                )}
                                {lesson.isPreview && (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold py-0 text-[9px]">
                                    عرض مجاني
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 group-hover:translate-x-[-4px] transition-all" />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
