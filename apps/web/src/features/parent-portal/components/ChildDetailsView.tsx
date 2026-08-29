'use client';

import React from 'react';
import { useStudent } from '@/features/students/hooks/use-students';
import { useStudentAttendanceHistory } from '@/features/attendance/hooks/use-attendance';
import { useStudentPaymentHistory } from '@/features/finance/hooks/useFinance';
import { useGroup } from '@/features/groups/hooks/useGroups';
import { Badge, Skeleton } from '@/components/ui';
import { Users, ClipboardList, Check, Wallet, AlertCircle, X, Calendar, BookOpen, Clock, FileWarning, TrendingUp, HelpCircle } from 'lucide-react';

interface ChildDetailsViewProps {
  studentId: string;
}

export function ChildDetailsView({ studentId }: ChildDetailsViewProps) {
  const { data: student, isLoading: isStudentLoading, isError: isStudentError } = useStudent(studentId);
  const { data: attendanceHistory, isLoading: isAttendanceLoading } = useStudentAttendanceHistory(studentId, 10);
  const { data: paymentHistory, isLoading: isPaymentLoading } = useStudentPaymentHistory(studentId);
  
  const enrollments = student?.groupEnrollments || [];
  const primaryGroupId = enrollments[0]?.group?.id;
  const { data: primaryGroup } = useGroup(primaryGroupId || '');

  const isLoading = isStudentLoading || isAttendanceLoading || isPaymentLoading;
  const studentName = student?.user?.fullName || 'الطالب';

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (isStudentError || !student) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700">لم يتم العثور على بيانات الطالب</p>
      </div>
    );
  }

  // --- Calculations ---
  const totalAttended = attendanceHistory?.filter((r: any) => r.status === 'PRESENT').length || 0;
  const hwCompleted = attendanceHistory?.filter((r: any) => r.status === 'PRESENT' && (r.homeworkStatus === 'COMPLETED' || r.homeworkStatus === 'SUBMITTED' || r.homeworkStatus === 'EXCUSED')).length || 0;
  const hwMissing = attendanceHistory?.filter((r: any) => r.status === 'PRESENT' && r.homeworkStatus === 'MISSING').length || 0;
  const hwIncomplete = attendanceHistory?.filter((r: any) => r.status === 'PRESENT' && r.homeworkStatus === 'INCOMPLETE').length || 0;

  const totalPaid = paymentHistory?.filter((p: any) => p.paymentStatus === 'PAID').reduce((acc: number, p: any) => acc + (Number(p.amountPaid) || 0), 0) || 0;
  const totalUnpaid = paymentHistory?.filter((p: any) => p.paymentStatus !== 'PAID').reduce((acc: number, p: any) => acc + (Number(p.amountExpected) || 0), 0) || 0;

  // Next Session Calculation
  let nextSessionStr = 'غير محدد';
  if (primaryGroup?.schedules?.length) {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    const currentHourMinute = today.getHours() * 60 + today.getMinutes();

    let nextSchedule = null;
    let daysUntilNext = 7;

    for (const schedule of primaryGroup.schedules) {
      const schDay = schedule.dayOfWeek;
      const [sh, sm] = schedule.startTime.split(':').map(Number);
      const schTime = sh * 60 + sm;

      let diff = schDay - currentDayOfWeek;
      if (diff < 0 || (diff === 0 && schTime <= currentHourMinute)) {
        diff += 7;
      }
      if (diff < daysUntilNext) {
        daysUntilNext = diff;
        nextSchedule = schedule;
      } else if (diff === daysUntilNext && nextSchedule) {
        const [nsh, nsm] = nextSchedule.startTime.split(':').map(Number);
        if (schTime < (nsh * 60 + nsm)) {
          nextSchedule = schedule;
        }
      }
    }

    if (nextSchedule) {
      const nextDate = new Date(today.getTime() + daysUntilNext * 24 * 60 * 60 * 1000);
      const daysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      
      let [sh, sm] = nextSchedule.startTime.split(':');
      let h = parseInt(sh, 10);
      const ampm = h >= 12 ? 'م' : 'ص';
      h = h % 12 || 12;
      
      nextSessionStr = `${daysAr[nextSchedule.dayOfWeek]}، ${nextDate.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })} - ${h}:${sm} ${ampm}`;
    }
  }


  return (
    <div className="space-y-6">
      {/* Student Header */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xl shrink-0">
          {studentName.charAt(0)}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{studentName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              {student?.studentCode || `STU-${studentId.slice(0, 6)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Academic Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
          <span className="text-xs font-semibold text-slate-500">المرحلة الدراسية</span>
          <p className="text-sm font-bold text-slate-900">
            {student.academicStage === 'PRIMARY' ? 'المرحلة الابتدائية' : 
             student.academicStage === 'MIDDLE' ? 'المرحلة الإعدادية' : 
             student.academicStage === 'SECONDARY' ? 'المرحلة الثانوية' : 
             student.academicStage || 'غير محدد'}
          </p>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
          <span className="text-xs font-semibold text-slate-500">الصف الدراسي</span>
          <p className="text-sm font-bold text-slate-900">{student.gradeLevel || 'غير محدد'}</p>
        </div>
      </div>

      {/* Financial Overview (Current Month & Summaries) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Monthly Fee */}
        <div className="bg-gradient-to-l from-emerald-50 to-emerald-100/50 p-4 rounded-2xl border border-emerald-100 flex flex-col justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-700 mb-0.5">الاشتراك الشهري ({primaryGroup?.name || 'المجموعة'})</p>
              <p className="text-lg font-black text-slate-800">
                {primaryGroup?.monthlyFee ? `${primaryGroup.monthlyFee} ج.م` : 'غير محدد'}
              </p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-200/50 flex justify-between items-center">
            <span className="text-[10px] font-semibold text-slate-500">حالة الشهر الحالي</span>
            {paymentHistory?.some((p: any) => p.periodMonth === new Date().getMonth() + 1 && p.periodYear === new Date().getFullYear() && p.paymentStatus === 'PAID') ? (
              <Badge variant="success" className="px-2 py-0 h-5 text-[10px]">تم الدفع</Badge>
            ) : (
              <Badge variant="error" className="px-2 py-0 h-5 text-[10px]">غير مدفوع</Badge>
            )}
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 flex flex-col justify-center gap-2">
          <p className="text-xs font-bold text-blue-700 mb-0.5">إجمالي المدفوعات السابقة</p>
          <p className="text-2xl font-black text-blue-700">{totalPaid} ج.م</p>
          <p className="text-[10px] text-slate-500 font-medium">تشمل المذكرات والاشتراكات المسددة</p>
        </div>

        {/* Total Unpaid / Overdue */}
        <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50 flex flex-col justify-center gap-2">
          <p className="text-xs font-bold text-red-700 mb-0.5">المتأخرات والمبالغ المستحقة</p>
          <p className="text-2xl font-black text-red-700">{totalUnpaid} ج.م</p>
          <p className="text-[10px] text-slate-500 font-medium">المبالغ المطلوب سدادها</p>
        </div>
      </div>

      {/* Upcoming (Session & Exams) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 flex items-start gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-xl mt-0.5">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-600 mb-1">معاد الحصة القادمة</p>
            <p className="text-sm font-bold text-slate-800">{nextSessionStr}</p>
            {primaryGroup && <p className="text-[10px] text-slate-500 mt-1 font-semibold">{primaryGroup.name}</p>}
          </div>
        </div>
        
        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 flex items-start gap-3">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-xl mt-0.5">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-600 mb-1">الامتحان القادم</p>
            <p className="text-sm font-bold text-slate-800">لا يوجد امتحانات قادمة مسجلة</p>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">سيتم إشعارك عند تحديد موعد</p>
          </div>
        </div>
      </div>

      {/* Detailed Homework & Performance */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-primary-600" />
          المستوى الأكاديمي والواجبات
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-500 mb-1">مستوى الأداء</p>
            <p className="text-lg font-black text-slate-800">
              {totalAttended > 0 ? (hwCompleted / totalAttended > 0.8 ? 'ممتاز' : hwCompleted / totalAttended > 0.5 ? 'جيد' : 'ضعيف') : 'غير محدد'}
            </p>
          </div>
          <div className="bg-green-50 p-3 rounded-2xl border border-green-100 text-center">
            <p className="text-[10px] font-bold text-green-700 mb-1">تم حله</p>
            <p className="text-lg font-black text-green-700">{hwCompleted}</p>
          </div>
          <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 text-center">
            <p className="text-[10px] font-bold text-amber-700 mb-1">واجب ناقص</p>
            <p className="text-lg font-black text-amber-700">{hwIncomplete}</p>
          </div>
          <div className="bg-red-50 p-3 rounded-2xl border border-red-100 text-center">
            <p className="text-[10px] font-bold text-red-700 mb-1">لم يُحل</p>
            <p className="text-lg font-black text-red-700">{hwMissing}</p>
          </div>
        </div>
      </div>

      {/* Performance & Attendance History Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <ClipboardList className="w-4 h-4 text-primary-600" />
          سجل الحضور والواجبات (آخر 10 حصص)
        </h4>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 bg-green-50 p-3 rounded-xl border border-green-100 text-center">
              <p className="text-xs text-green-700 font-bold mb-1">نسبة الحضور</p>
              <p className="text-xl font-black text-green-700">
                {attendanceHistory && attendanceHistory.length > 0
                  ? Math.round(
                      (attendanceHistory.filter((r: any) => r.status === 'PRESENT').length /
                        attendanceHistory.length) *
                        100,
                    )
                  : 0}
                %
              </p>
            </div>
            <div className="flex-1 bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
              <p className="text-xs text-blue-700 font-bold mb-1">نسبة حل الواجب</p>
              <p className="text-xl font-black text-blue-700">
                {attendanceHistory &&
                attendanceHistory.filter((r: any) => r.status === 'PRESENT').length > 0
                  ? Math.round(
                      (attendanceHistory.filter(
                        (r: any) => r.status === 'PRESENT' && (r.homeworkStatus === 'COMPLETED' || r.homeworkStatus === 'SUBMITTED' || r.homeworkStatus === 'EXCUSED'),
                      ).length /
                        attendanceHistory.filter((r: any) => r.status === 'PRESENT').length) *
                        100,
                    )
                  : 0}
                %
              </p>
            </div>
          </div>

          <div className="space-y-2 overflow-x-auto custom-scrollbar pb-2">
            {attendanceHistory && attendanceHistory.length > 0 ? (
              <table className="w-full text-center text-xs">
                <thead>
                  <tr>
                    <th className="p-2 border-b border-slate-100 text-slate-500 font-bold whitespace-nowrap text-start">الحصة</th>
                    {attendanceHistory.map((_: any, i: number) => (
                      <th key={i} className="p-2 border-b border-slate-100 font-mono text-slate-400 min-w-[40px]">{attendanceHistory.length - i}</th>
                    )).reverse()}
                  </tr>
                </thead>
                <tbody>
                  {/* Attendance Row */}
                  <tr>
                    <td className="p-2 border-b border-slate-50 text-slate-700 font-bold whitespace-nowrap text-start">الحضور</td>
                    {[...attendanceHistory].reverse().map((record: any) => {
                      const isPresent = record.status === 'PRESENT';
                      return (
                        <td key={`att-${record.id}`} className="p-2 border-b border-slate-50">
                          <div className={`mx-auto w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                            isPresent 
                              ? 'bg-green-100 border-green-200 text-green-600' 
                              : 'bg-red-50 border-red-200 text-red-500'
                          }`}
                          title={isPresent ? 'حاضر' : 'غائب'}>
                            {isPresent ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  {/* Homework Row */}
                  <tr>
                    <td className="p-2 text-slate-700 font-bold whitespace-nowrap text-start border-t border-slate-100">الواجب</td>
                    {[...attendanceHistory].reverse().map((record: any) => {
                      const isPresent = record.status === 'PRESENT';
                      
                      let hwIcon = <span className="text-lg leading-none font-medium text-slate-400">-</span>;
                      let hwClass = "bg-slate-50 border-slate-200";
                      let hwTitle = "لم يحضر";

                      if (isPresent) {
                        if (record.homeworkStatus === 'COMPLETED' || record.homeworkStatus === 'SUBMITTED' || record.homeworkStatus === 'EXCUSED') {
                          hwIcon = <Check className="w-4 h-4" />;
                          hwClass = "bg-blue-100 border-blue-200 text-blue-600";
                          hwTitle = "تم حل الواجب";
                        } else if (record.homeworkStatus === 'INCOMPLETE') {
                          hwIcon = <FileWarning className="w-4 h-4" />;
                          hwClass = "bg-amber-100 border-amber-200 text-amber-600";
                          hwTitle = "واجب ناقص";
                        } else if (record.homeworkStatus === 'MISSING') {
                          hwIcon = <X className="w-4 h-4" />;
                          hwClass = "bg-red-100 border-red-200 text-red-600";
                          hwTitle = "لم يحل الواجب";
                        } else {
                          hwIcon = <HelpCircle className="w-4 h-4" />;
                          hwClass = "bg-slate-100 border-slate-200 text-slate-500";
                          hwTitle = "غير مسجل";
                        }
                      }

                      return (
                        <td key={`hw-${record.id}`} className="p-2 border-t border-slate-100">
                          <div className={`mx-auto w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${hwClass}`} title={hwTitle}>
                            {hwIcon}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center text-slate-500 text-sm bg-slate-50 rounded-xl">
                لا يوجد سجل حصص مسجل لهذا الطالب بعد.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <Wallet className="w-4 h-4 text-emerald-600" />
          سجل المدفوعات
        </h4>
        {paymentHistory && paymentHistory.length > 0 ? (
          <div className="space-y-2">
              {paymentHistory.slice(0, 5).map((payment: any, i: number) => {
              const isPaid = payment.paymentStatus === 'PAID';
              
              return (
                <div key={i} className={`flex justify-between items-center p-3 rounded-xl border ${isPaid ? 'bg-slate-50 border-slate-100' : 'bg-red-50/50 border-red-100'}`}>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {payment.paymentType === 'BOOKLET' ? 'مذكرة دراسية' : `اشتراك شهر ${payment.periodMonth}/${payment.periodYear}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(payment.createdAt).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className={`text-sm font-black ${isPaid ? 'text-emerald-600' : 'text-red-600'}`}>{payment.amountPaid || payment.amountExpected || 0} ج.م</p>
                    {isPaid ? (
                      <Badge variant="success" className="text-[10px] mt-1 py-0 px-1.5 h-4">تم الدفع</Badge>
                    ) : (
                      <Badge variant="error" className="text-[10px] mt-1 py-0 px-1.5 h-4">غير مدفوع</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-slate-500 text-sm bg-slate-50 rounded-xl">
            لا يوجد سجل مدفوعات مسجل حتى الآن.
          </div>
        )}
      </div>

      {/* Groups */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-primary-600" />
          المجموعات المسجلة ({enrollments.length})
        </h4>
        {enrollments.length === 0 ? (
          <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl">غير مسجل في مجموعات حالياً.</p>
        ) : (
          <div className="space-y-1.5">
            {enrollments.map((en: any, i: number) => (
              <div key={en.group?.id || i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm">
                <span className="font-semibold text-slate-800">{en.group?.name || 'المجموعة الدراسية'}</span>
                <Badge variant="outline" className="text-xs">نشط</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
