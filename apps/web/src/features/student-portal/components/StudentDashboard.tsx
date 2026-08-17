'use client';

import React from 'react';
import { useStudentProfile, useStudentCourses, useStudentAssessments, useStudentAttendance } from '../hooks/useStudentPortal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BookOpen, FileText, QrCode, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

export function StudentDashboard() {
  const { data: profile, isLoading: isProfileLoading } = useStudentProfile();
  const { data: courses, isLoading: isCoursesLoading } = useStudentCourses();
  const { data: assessments, isLoading: isAssessmentsLoading } = useStudentAssessments();
  const { data: attendance, isLoading: isAttendanceLoading } = useStudentAttendance();

  if (isProfileLoading) {
    return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  const enrolledGroups = profile?.groupEnrollments || [];
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><BookOpen className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">الدورات المسجلة</p>
              <h4 className="text-2xl font-bold text-slate-800">{isCoursesLoading ? '-' : courses?.data?.length || 0}</h4>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><FileText className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">الاختبارات القادمة</p>
              <h4 className="text-2xl font-bold text-slate-800">{isAssessmentsLoading ? '-' : assessments?.meta?.totalItems || 0}</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">نسبة الحضور</p>
              <h4 className="text-2xl font-bold text-slate-800">
                {isAttendanceLoading ? '-' : attendance?.meta?.attendanceRate ? `${attendance.meta.attendanceRate}%` : '100%'}
              </h4>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/student/payments'}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Calendar className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">المدفوعات</p>
              <h4 className="text-sm font-bold text-slate-800 mt-1">الاطلاع على السجل</h4>
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
            {!courses?.data?.length ? (
              <div className="text-center py-8 text-slate-500 flex flex-col items-center">
                <BookOpen className="w-10 h-10 text-slate-300 mb-3" />
                <p>لا توجد دورات مسجلة حالياً</p>
              </div>
            ) : (
              <div className="space-y-4">
                {courses.data.slice(0, 3).map((course: any) => (
                  <Link key={course.id} href={`/student/courses/${course.id}`} className="block bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors border border-slate-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-800">{course.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">{course.teacher?.user?.fullName}</p>
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
            {!assessments?.data?.length ? (
              <div className="text-center py-8 text-slate-500 flex flex-col items-center">
                <FileText className="w-10 h-10 text-slate-300 mb-3" />
                <p>لا توجد اختبارات متاحة حالياً</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assessments.data.slice(0, 3).map((assessment: any) => (
                  <Link key={assessment.id} href={`/student/assessments/${assessment.id}`} className="block bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors border border-slate-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-800">{assessment.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">الدرجة النهائية: {assessment.totalScore}</p>
                      </div>
                      {assessment._count?.submissions > 0 ? (
                        <Badge variant="success">تم التسليم</Badge>
                      ) : (
                        <Badge variant="warning">مطلوب تسليمه</Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
