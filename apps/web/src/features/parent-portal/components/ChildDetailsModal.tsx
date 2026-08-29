'use client';

import React from 'react';
import { useStudent } from '@/features/students/hooks/use-students';
import { useStudentAttendanceHistory } from '@/features/attendance/hooks/use-attendance';
import { useStudentPaymentHistory } from '@/features/finance/hooks/useFinance';
import { Button, Badge, Skeleton } from '@/components/ui';
import { X, User, Users, CheckCircle, ClipboardList, Check, Wallet, AlertCircle } from 'lucide-react';

interface ChildDetailsModalProps {
  studentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ChildDetailsModal({ studentId, isOpen, onClose }: ChildDetailsModalProps) {
  const { data: student, isLoading: isStudentLoading, isError: isStudentError } = useStudent(studentId || '');
  const { data: attendanceHistory, isLoading: isAttendanceLoading } = useStudentAttendanceHistory(studentId || '', 10);
  const { data: paymentHistory, isLoading: isPaymentLoading } = useStudentPaymentHistory(studentId || '');

  if (!isOpen || !studentId) return null;

  const isLoading = isStudentLoading || isAttendanceLoading || isPaymentLoading;
  const studentName = student?.user?.fullName || 'الطالب';
  const enrollments = student?.groupEnrollments || [];

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[88dvh] overflow-y-auto space-y-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xl">
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
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : isStudentError || !student ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">لم يتم العثور على بيانات الطالب</p>
          </div>
        ) : (
          <div className="space-y-6">
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

            {/* Performance & Attendance */}
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
                          <td className="p-2 text-slate-700 font-bold whitespace-nowrap text-start">الواجب</td>
                          {[...attendanceHistory].reverse().map((record: any) => {
                            const isPresent = record.status === 'PRESENT';
                            const hwDone = record.homeworkStatus === 'COMPLETED' || record.homeworkStatus === 'SUBMITTED' || record.homeworkStatus === 'EXCUSED';
                            return (
                              <td key={`hw-${record.id}`} className="p-2">
                                {!isPresent ? (
                                  <div className="mx-auto w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 bg-slate-50 text-slate-400" title="لم يحضر">
                                    <span className="text-lg leading-none font-medium">-</span>
                                  </div>
                                ) : (
                                  <div className={`mx-auto w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                                    hwDone 
                                      ? 'bg-blue-100 border-blue-200 text-blue-600' 
                                      : 'bg-amber-100 border-amber-200 text-amber-600'
                                  }`}
                                  title={hwDone ? 'تم حل الواجب' : 'لم يحل الواجب'}>
                                    {hwDone ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                  </div>
                                )}
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
                  {paymentHistory.slice(0, 5).map((payment: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {payment.paymentType === 'BOOKLET' ? 'مذكرة دراسية' : `اشتراك شهر ${payment.periodMonth}/${payment.periodYear}`}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(payment.createdAt).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="text-sm font-black text-emerald-600">{payment.amountPaid} ج.م</p>
                        <Badge variant="success" className="text-[10px] mt-1 py-0 px-1.5 h-4">تم الدفع</Badge>
                      </div>
                    </div>
                  ))}
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
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button variant="primary" size="sm" onClick={onClose} className="rounded-xl px-6">
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
}
