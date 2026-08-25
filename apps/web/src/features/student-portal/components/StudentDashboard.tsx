'use client';

import React from 'react';
import { useStudentProfile, useStudentCourses, useStudentAssessments, useStudentAttendance, useGroupSessions } from '../hooks/useStudentPortal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BookOpen, FileText, QrCode, TrendingUp, Calendar, AlertTriangle, Clock, Users, Monitor } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

export function StudentDashboard() {
  const { data: profile, isLoading: isProfileLoading } = useStudentProfile();
  const { data: courses, isLoading: isCoursesLoading } = useStudentCourses();
  const { data: assessments, isLoading: isAssessmentsLoading } = useStudentAssessments();
  const { data: attendance, isLoading: isAttendanceLoading } = useStudentAttendance();

  // These hooks are dual-shape: online they return the cursor-paginated { data, meta } envelope,
  // while their offline/error fallbacks return a bare array. Normalize to a plain list either way.
  const assessmentList = Array.isArray(assessments) ? assessments : (assessments?.data || []);
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

  return (
    <div className="space-y-6">
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

        <div className="z-10 flex-shrink-0 bg-white p-3 rounded-xl shadow-md w-32 h-32 flex items-center justify-center relative group cursor-pointer transition-transform hover:scale-105">
          <div className="text-center">
            <QrCode className="w-12 h-12 text-primary-600 mx-auto mb-2" />
            <span className="text-[10px] font-bold text-slate-800">بطاقة الـ QR</span>
          </div>
          <Link href="/student/attendance" className="absolute inset-0" />
        </div>
      </div>

      {/* Next Session Details Card */}
      {nextSession && (
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* مجموعات السنتر */}
        <Card className="border-none shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0"><Users className="w-5 h-5" /></div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 truncate">مجموعات السنتر</p>
              <h4 className="text-2xl font-bold text-slate-800">{isProfileLoading ? '-' : enrolledGroups.length}</h4>
            </div>
          </CardContent>
        </Card>

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
              <h4 className="text-2xl font-bold text-slate-800">{isAssessmentsLoading ? '-' : assessmentList.length || 0}</h4>
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
                  <Link key={course.courseId} href={`/student/courses/${course.courseId}/learn`} className="block bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors border border-slate-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-800">{course.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">{course.teacherName}</p>
                      </div>
                      <Badge variant="outline" className="bg-white">نسبة الإنجاز: {course.progressPercentage || 0}%</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="border-b border-slate-50 bg-slate-50/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              أحدث الاختبارات
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!assessmentList.length ? (
              <div className="text-center py-8 text-slate-500 flex flex-col items-center">
                <FileText className="w-10 h-10 text-slate-300 mb-3" />
                <p>لا توجد اختبارات متاحة حالياً</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assessmentList.slice(0, 3).map((assessment: any) => {
                  const isOnlineCourse = !!assessment.course && !assessment.group;
                  const isOnsiteGroup = !!assessment.group;
                  return (
                    <Link key={assessment.id} href={`/student/assessments/${assessment.id}`} className="block bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors border border-slate-100">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {isOnsiteGroup && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                                <Users className="w-3 h-3" />
                                مجموعة السنتر
                              </span>
                            )}
                            {isOnlineCourse && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                                <Monitor className="w-3 h-3" />
                                دورة أونلاين
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-800 truncate">{assessment.title}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {isOnsiteGroup && assessment.group?.name ? `${assessment.group.name} · ` : ''}
                            {isOnlineCourse && assessment.course?.title ? `${assessment.course.title} · ` : ''}
                            الدرجة: {assessment.totalScore}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {assessment._count?.submissions > 0 ? (
                            <Badge variant="success">تم التسليم</Badge>
                          ) : (
                            <Badge variant="warning">مطلوب تسليمه</Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
