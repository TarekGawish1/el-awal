'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useStudentDashboardOverview } from '../hooks/useStudentPortal';
import { QrCode, RotateCcw, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

const CourseCertificateModal = dynamic(
  () => import('./CourseCertificateModal').then((mod) => mod.CourseCertificateModal),
  { ssr: false }
);

import { StudentRecentAssessments } from './StudentRecentAssessments';
import { StudentLatestHomework } from './StudentLatestHomework';
import { GroupReservation } from './GroupReservation';
import { useAuth } from '@/features/auth';
import { StudentDashboardKpiGrid } from './dashboard/StudentDashboardKpiGrid';
import { StudentNextSessionCard } from './dashboard/StudentNextSessionCard';
import { StudentEnrolledCoursesList } from './dashboard/StudentEnrolledCoursesList';
import { OnlineCoursesCatalog } from './dashboard/OnlineCoursesCatalog';

export function StudentDashboard() {
  const { user } = useAuth();
  const { data: overview, isLoading, isError, refetch } = useStudentDashboardOverview();

  // Certificate modal state
  const [certCourse, setCertCourse] = useState<{ title: string; teacherName?: string } | null>(null);
  const isCertOpen = certCourse !== null;

  const profile = overview?.student;
  const courses = overview?.enrolledCourses || [];
  const upcomingExams = overview?.recentExams || [];
  const attendanceRate = overview?.kpis?.attendanceRatePercentage ?? 100;
  const nextSession = overview?.nextSession || null;
  const enrolledGroups = profile?.groupEnrollments || [];
  const isCoursesLoading = isLoading;
  const isAssessmentsLoading = isLoading;
  const isAttendanceLoading = isLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3 my-6">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
        <h3 className="font-bold text-red-900">تعذر تحميل بيانات لوحة التحكم</h3>
        <p className="text-sm text-red-700">يرجى المحاولة مرة أخرى.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" /> إعادة المحاولة
        </button>
      </div>
    );
  }

  const studentName = profile?.fullName || user?.fullName || 'طالب';

  const certData = certCourse
    ? {
        studentName,
        courseTitle: certCourse.title,
        teacherName: certCourse.teacherName,
        completedDate: new Date().toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      }
    : null;

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
        <div className="flex-1 space-y-2 z-10 text-center md:text-right">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">أهلاً بك، {studentName}</h1>
          <p className="text-primary-100 text-sm md:text-base opacity-90 max-w-lg">
            {profile?.gradeLevel} • الكود: {profile?.studentCode}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
            {enrolledGroups.map((enrollment: any) => (
              <Badge
                key={enrollment.group.id}
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 border-none text-white shadow-none"
              >
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
            <OnlineCoursesCatalog
              gradeLevel={profile.gradeLevel}
              academicStage={profile.academicStage || undefined}
              enrolledCourses={courses}
              onViewCertificate={(course) => setCertCourse(course)}
            />
          )}

          {/* Next Session Details Card */}
          {nextSession && profile?.attendanceMode !== 'ONLINE' && (
            <StudentNextSessionCard nextSession={nextSession} />
          )}

          <StudentDashboardKpiGrid
            coursesCount={courses?.length || 0}
            upcomingExamsCount={upcomingExams.length || 0}
            attendanceRate={attendanceRate}
            isCoursesLoading={isCoursesLoading}
            isAssessmentsLoading={isAssessmentsLoading}
            isAttendanceLoading={isAttendanceLoading}
          />

          <StudentLatestHomework homework={overview?.latestHomework} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StudentEnrolledCoursesList
              courses={courses}
              onViewCertificate={(course) => setCertCourse(course)}
            />

            <StudentRecentAssessments exams={overview?.recentExams} />
          </div>
        </>
      )}
    </div>
  );
}
