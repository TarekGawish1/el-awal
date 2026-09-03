'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  useStudentProfile,
  useStudentCourses,
  useStudentAssessments,
  useStudentAttendance,
  useGroupSessions,
  useEnrollInCourse,
} from '../hooks/useStudentPortal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BookOpen, FileText, QrCode, TrendingUp, Calendar, AlertTriangle, Clock, Users, Monitor, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { CourseCertificateModal } from './CourseCertificateModal';
import { CourseSubscriptionModal } from './CourseSubscriptionModal';
import { StudentRecentAssessments } from './StudentRecentAssessments';
import { StudentLatestHomework } from './StudentLatestHomework';
import { GroupReservation } from './GroupReservation';
import { filterUpcomingGroupExams } from '../utils/assessments';

export function StudentDashboard() {
  const { data: profile, isLoading: isProfileLoading } = useStudentProfile();
  const { data: courses, isLoading: isCoursesLoading } = useStudentCourses();
  const { data: assessments, isLoading: isAssessmentsLoading } = useStudentAssessments();
  const { data: attendance, isLoading: isAttendanceLoading } = useStudentAttendance();

  // Certificate modal state
  const [certCourse, setCertCourse] = useState<{ title: string; teacherName?: string } | null>(null);
  const isCertOpen = certCourse !== null;

  // These hooks are dual-shape: online they return the cursor-paginated { data, meta } envelope,
  // while their offline/error fallbacks return a bare array. Normalize to a plain list either way.
  const assessmentList = Array.isArray(assessments) ? assessments : (assessments?.data || []);
  // Only count upcoming group exams (no homework, no expired deadlines).
  const upcomingExams = filterUpcomingGroupExams(assessmentList);
  const attendanceRecords = Array.isArray(attendance) ? attendance : (attendance?.data || []);

  // Attendance rate is derived client-side from the student's visible records, mirroring the
  // dedicated attendance page: present / total (present = PRESENT), defaulting to 100 when there
  // are no records yet. The cursor-paginated API returns { data, meta } with no precomputed rate.
  const attendancePresentCount = attendanceRecords.filter((r: any) => r.status === 'PRESENT').length;
  const attendanceRate = attendanceRecords.length > 0
    ? Math.round((attendancePresentCount / attendanceRecords.length) * 100)
    : 100;

  const enrolledGroups = profile?.groupEnrollments || [];
  const primaryGroupId = enrolledGroups[0]?.group?.id;

  const { data: sessions } = useGroupSessions(primaryGroupId);

  const nextSession = React.useMemo(() => {
    if (!sessions) return null;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const upcoming = sessions
      .filter((session: any) => {
        const sessionDateStr = session.sessionDate.split('T')[0];
        return sessionDateStr >= todayStr;
      })
      .sort((a: any, b: any) => {
        const dateA = new Date(a.sessionDate);
        const dateB = new Date(b.sessionDate);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime();
        }
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
      
    return upcoming[0] || null;
  }, [sessions]);

  const formatSessionDateTime = (sessionDateStr: string, startTime: string) => {
    if (!sessionDateStr) return '';
    const date = new Date(sessionDateStr);
    
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const dayName = days[date.getDay()];
    
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const monthName = months[date.getMonth()];
    
    const day = date.getDate();
    
    let timeStr = startTime || '';
    if (startTime) {
      const parts = startTime.split(':');
      if (parts.length >= 2) {
        let hour = parseInt(parts[0], 10);
        const minute = parts[1];
        const ampm = hour >= 12 ? 'مساءً' : 'صباحاً';
        hour = hour % 12;
        hour = hour ? hour : 12;
        timeStr = `الساعة ${hour}:${minute} ${ampm}`;
      }
    }
    
    return `${dayName}، ${day} ${monthName} - ${timeStr}`;
  };

  if (isProfileLoading) {
    return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  const studentName = profile?.user?.fullName || 'طالب';

  const certData = certCourse ? {
    studentName,
    courseTitle: certCourse.title,
    teacherName: certCourse.teacherName,
    completedDate: new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  } : null;

  return (
    <div className="space-y-6">
      {/* Certificate Modal (Dashboard entry point) */}
      {certData && (
        <CourseCertificateModal
          isOpen={isCertOpen}
          onClose={() => setCertCourse(null)}
          data={certData}
        />
      )}
      {/* Header Profile Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        <div className="flex-1 space-y-2 z-10 text-center md:text-right">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">أهلاً بك، {studentName} 👋</h1>
          <p className="text-primary-100 text-sm md:text-base opacity-90 max-w-lg">
            {profile?.gradeLevel} • الكود: {profile?.studentCode}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
            {enrolledGroups.map((enrollment: any) => (
              <Badge key={enrollment.group.id} variant="secondary" className="bg-white/20 hover:bg-white/30 border-none text-white shadow-none">
                {enrollment.group.name}
              </Badge>
            ))}
          </div>
        </div>

        {profile?.attendanceMode !== 'ONLINE' && (
          <div className="z-10 flex-shrink-0 bg-white p-3 rounded-xl shadow-md w-32 h-32 flex items-center justify-center relative group cursor-pointer transition-transform hover:scale-105">
            <div className="text-center">
              <QrCode className="w-12 h-12 text-primary-600 mx-auto mb-2" />
              <span className="text-[10px] font-bold text-slate-800">بطاقة الـ QR</span>
            </div>
            <Link href="/student/attendance" className="absolute inset-0" />
          </div>
        )}
      </div>

      {profile?.attendanceMode !== 'ONLINE' && (!enrolledGroups.length || enrolledGroups[0].status === 'PENDING') ? (
        <GroupReservation pendingEnrollment={enrolledGroups[0]?.status === 'PENDING' ? enrolledGroups[0] : undefined} />
      ) : (
        <>
          {profile?.attendanceMode === 'ONLINE' && (
            <OnlineCoursesCatalog gradeLevel={profile.gradeLevel} academicStage={profile.academicStage || undefined} />
          )}

          {/* Next Session Details Card */}
          {nextSession && profile?.attendanceMode !== 'ONLINE' && (
        <Card className="border-none bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 shadow-xs rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500 text-white rounded-xl shadow-sm">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-amber-100/80 border-amber-200 text-amber-900 text-xs font-extrabold shadow-none">
                    موعد الحصة القادمة
                  </Badge>
                  {nextSession.topic && (
                    <span className="text-xs font-medium text-slate-500">
                      | {nextSession.topic}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  {formatSessionDateTime(nextSession.sessionDate, nextSession.startTime)}
                </h3>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {nextSession.schedule?.location ? (
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/50">
                  📍 {nextSession.schedule.location}
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/50">
                  📍 مقر السنتر
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* دورات أونلاين */}
        <Card className="border-none shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0"><Monitor className="w-5 h-5" /></div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 truncate">دورات أونلاين</p>
              <h4 className="text-2xl font-bold text-slate-800">{isCoursesLoading ? '-' : courses?.length || 0}</h4>
            </div>
          </CardContent>
        </Card>
        
        {/* الاختبارات القادمة */}
        <Card className="border-none shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl flex-shrink-0"><FileText className="w-5 h-5" /></div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 truncate">الاختبارات القادمة</p>
              <h4 className="text-2xl font-bold text-slate-800">{isAssessmentsLoading ? '-' : upcomingExams.length || 0}</h4>
            </div>
          </CardContent>
        </Card>

        {/* نسبة الحضور */}
        <Card className="border-none shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl flex-shrink-0"><TrendingUp className="w-5 h-5" /></div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 truncate">نسبة الحضور</p>
              <h4 className="text-2xl font-bold text-slate-800">
                {isAttendanceLoading ? '-' : `${attendanceRate}%`}
              </h4>
            </div>
          </CardContent>
        </Card>

        {/* المدفوعات */}
        <Card className="border-none shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/student/payments'}>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl flex-shrink-0"><Calendar className="w-5 h-5" /></div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 truncate">المدفوعات</p>
              <h4 className="text-xs font-bold text-slate-800 mt-1">الاطلاع على السجل</h4>
            </div>
          </CardContent>
        </Card>
      </div>

      <StudentLatestHomework />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <div key={course.courseId} className="bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center justify-between p-4">
                      <Link href={`/student/courses/${course.courseId}/learn`} className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 truncate">{course.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">{course.teacherName}</p>
                      </Link>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        {course.progressPercentage >= 100 ? (
                          <button
                            type="button"
                            onClick={() => setCertCourse({ title: course.title, teacherName: course.teacherName })}
                            title="تحميل شهادة الإتمام"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white shadow-sm shadow-amber-200 hover:shadow-md hover:-translate-y-0.5 transition-all"
                          >
                            <Award className="w-3.5 h-3.5" />
                            شهادتي
                          </button>
                        ) : (
                          <Badge variant="outline" className="bg-white">نسبة الإنجاز: {course.progressPercentage || 0}%</Badge>
                        )}
                      </div>
                    </div>
                    {/* Progress bar */}
                    {course.progressPercentage < 100 && (
                      <div className="px-4 pb-3">
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full transition-all"
                            style={{ width: `${Math.min(course.progressPercentage || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <StudentRecentAssessments />
      </div>
      </>
      )}
    </div>
  );
}

function OnlineCoursesCatalog({ gradeLevel, academicStage }: { gradeLevel?: string; academicStage?: string }) {
  const router = useRouter();
  const { data: myCourses = [] } = useStudentCourses();
  const enrollMutation = useEnrollInCourse();

  const [courses, setCourses] = useState<any[]>([]);
  const [allPlatformCourses, setAllPlatformCourses] = useState<any[]>([]);
  const [scope, setScope] = useState<'MY_GRADE' | 'ALL'>('MY_GRADE');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCourses() {
      setIsLoading(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.al-awal.online/api/v1';

        // 1. Fetch grade-specific courses
        let url = `${baseUrl}/courses/catalog?limit=12`;
        if (gradeLevel) url += `&gradeLevel=${encodeURIComponent(gradeLevel)}`;
        if (academicStage) url += `&academicStage=${encodeURIComponent(academicStage)}`;

        const [gradeRes, allRes] = await Promise.all([
          fetch(url),
          fetch(`${baseUrl}/courses/catalog?limit=12`),
        ]);

        if (gradeRes.ok) {
          const gradeData = await gradeRes.json();
          setCourses(gradeData.data || []);
        }

        if (allRes.ok) {
          const allData = await allRes.json();
          setAllPlatformCourses(allData.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch courses:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCourses();
  }, [gradeLevel, academicStage]);

  const displayedCourses = scope === 'MY_GRADE' && courses.length > 0 ? courses : allPlatformCourses;

  const [selectedCourseForSub, setSelectedCourseForSub] = useState<any | null>(null);

  const handleQuickEnroll = (course: any) => {
    setSelectedCourseForSub(course);
  };

  if (isLoading) {
    return (
      <div className="py-6 space-y-4">
        <Skeleton className="h-8 w-64 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (displayedCourses.length === 0) {
    return (
      <Card className="border-slate-100 shadow-sm mb-6">
        <CardContent className="p-8 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">لا توجد كورسات متاحة حالياً</h3>
          <p className="text-slate-500 mt-2">عفواً، لا يوجد كورسات أونلاين منشورة على المنصة في الوقت الحالي.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">
              الدورات الأونلاين المتاحة للاشتراك
            </h3>
            <p className="text-xs text-slate-500">
              {courses.length > 0 && scope === 'MY_GRADE'
                ? `معروض كورسات مخصصة لـ (${gradeLevel || 'مرحلتك الدراسية'})`
                : 'معروض جميع الكورسات الأونلاين المتاحة على المنصة'}
            </p>
          </div>
        </div>

        {/* Scope selector tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setScope('MY_GRADE')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              scope === 'MY_GRADE'
                ? 'bg-white text-primary-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            لمرحلتي ({courses.length})
          </button>
          <button
            type="button"
            onClick={() => setScope('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              scope === 'ALL'
                ? 'bg-white text-primary-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            جميع الكورسات ({allPlatformCourses.length})
          </button>
        </div>
      </div>

      {courses.length === 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
          <BookOpen className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block mb-0.5">تنويه للطلاب:</strong>
            <span>لا توجد كورسات مخصصة حصرياً لـ ({gradeLevel || 'مرحلتك'}) حالياً، ولكن تم عرض كافة الكورسات المتاحة على المنصة لتتمكن من استكشافها والاشتراك بها.</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedCourses.map((course: any, index: number) => {
          const isEnrolled = myCourses.some((c: any) => c.courseId === course.id || c.id === course.id);

          return (
            <div
              key={course.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md hover:border-slate-200 transition-all text-right"
            >
              {/* Card Banner */}
              <div
                className={`h-32 bg-gradient-to-br ${
                  index % 3 === 0
                    ? 'from-blue-600 to-indigo-600'
                    : index % 3 === 1
                    ? 'from-indigo-600 to-purple-600'
                    : 'from-emerald-600 to-teal-600'
                } relative p-4 flex items-start justify-between text-white`}
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge className="bg-white/20 text-white border-none text-[11px] font-bold">
                    {course.subject || 'مادة عامة'}
                  </Badge>
                  <Badge className="bg-black/20 text-white border-none text-[11px]">
                    {course.gradeLevel}
                  </Badge>
                </div>

                <Badge className="bg-white/25 text-white border-none text-[11px] font-bold">
                  {course.academicTerm === 'FIRST_TERM' ? 'ترم أول' : 'ترم ثاني'}
                </Badge>
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
                    المعلم: <strong className="text-slate-800">{course.teacher?.user?.fullName || course.teacherName || 'أ. طارق عبد الله'}</strong>
                  </p>

                  <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
                    {course.description || 'شرح مبسط ومفصل للمنهج مع تدريبات تفاعلية ومذكرات رقمية.'}
                  </p>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <Link
                    href={`/student/courses/${course.id}`}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs text-center transition-colors shadow-2xs"
                  >
                    تفاصيل المنهج
                  </Link>

                  {isEnrolled ? (
                    <Link
                      href={`/student/courses/${course.id}/learn`}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs text-center transition-colors shadow-xs"
                    >
                      استئناف التعلم
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleQuickEnroll(course)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs text-center transition-colors shadow-xs cursor-pointer"
                    >
                      اشترك الآن
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedCourseForSub && (
        <CourseSubscriptionModal
          isOpen={!!selectedCourseForSub}
          onClose={() => setSelectedCourseForSub(null)}
          course={{
            id: selectedCourseForSub.id,
            title: selectedCourseForSub.title,
            price: selectedCourseForSub.price,
            teacherName: selectedCourseForSub.teacher?.user?.fullName || selectedCourseForSub.teacherName,
            teacherPhone: selectedCourseForSub.teacher?.user?.phone,
            subject: selectedCourseForSub.subject,
            gradeLevel: selectedCourseForSub.gradeLevel,
          }}
        />
      )}
    </div>
  );
}
