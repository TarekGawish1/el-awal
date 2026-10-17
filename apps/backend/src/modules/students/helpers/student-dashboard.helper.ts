import { PaymentStatus } from '@prisma/client';

export function formatCourseSummaries(
  courseEnrollments: any[],
  completedCountsByCourse: Map<string, number>,
) {
  return courseEnrollments.map((ce) => {
    const totalLessons =
      ce.course.modules?.flatMap((m: any) => m.lessons).length || 0;
    const completedLessons = completedCountsByCourse.get(ce.courseId) ?? 0;
    const progressPercentage =
      totalLessons > 0
        ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
        : 0;
    return {
      courseId: ce.courseId,
      title: ce.course.title,
      coverImageUrl: ce.course.coverImageUrl,
      teacherName: ce.course.teacher?.user?.fullName || 'أستاذ أحمد غريب',
      progressPercentage,
      totalLessons,
      completedLessons,
      isCertificateEligible: progressPercentage >= 100,
    };
  });
}

export function formatDashboardPayload(params: {
  student: any;
  primaryGroup: any;
  courseSummaries: any[];
  upcomingExams: any[];
  attendanceRatePercentage: number;
  totalAttendance: number;
  attendedCount: number;
  currentYear: number;
  currentMonth: number;
  currentMonthPayment: any;
  nextSession: any;
  latestHomework: any;
}) {
  const {
    student,
    courseSummaries,
    upcomingExams,
    attendanceRatePercentage,
    totalAttendance,
    attendedCount,
    currentYear,
    currentMonth,
    currentMonthPayment,
    nextSession,
    latestHomework,
  } = params;

  return {
    student: {
      id: student.id,
      studentCode: student.studentCode,
      fullName: student.user.fullName,
      phone: student.user.phone,
      email: student.user.email,
      gradeLevel: student.gradeLevel,
      academicStage: student.academicStage,
      attendanceMode: student.attendanceMode,
      groupEnrollments: student.groupEnrollments.map((ge: any) => ({
        id: ge.id,
        status: ge.status,
        group: {
          id: ge.group.id,
          name: ge.group.name,
          gradeLevel: ge.group.gradeLevel,
          academicStage: student.academicStage,
          monthlyFee: Number(ge.group.monthlyFee || 0),
          schedules: ge.group.schedules,
        },
      })),
    },
    kpis: {
      onlineCoursesCount: courseSummaries.length,
      upcomingExamsCount: upcomingExams.length,
      attendanceRatePercentage,
      totalAttendanceSessions: totalAttendance,
      presentAttendanceSessions: attendedCount,
      currentMonthBilling: {
        periodYear: currentYear,
        periodMonth: currentMonth,
        isPaid: currentMonthPayment?.paymentStatus === PaymentStatus.PAID,
        amountPaid: Number(currentMonthPayment?.amountPaid || 0),
        status: currentMonthPayment?.paymentStatus || PaymentStatus.PENDING,
      },
    },
    nextSession,
    enrolledCourses: courseSummaries,
    recentExams: upcomingExams,
    latestHomework,
  };
}
