'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useStudent, useUpdateStudentStatus, useDeleteStudent } from '../hooks/use-students';
import { useStudentAttendanceHistory } from '@/features/attendance/hooks/use-attendance';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { StudentQrBadge } from './StudentQrBadge';
import { StudentPasswordModal } from './StudentPasswordModal';
import { X, Phone, User, Users, Calendar, AlertCircle, ExternalLink, Trash2, UserX, CheckCircle, ShieldAlert, KeyRound, Check, ClipboardList } from 'lucide-react';
import { formatWhatsAppNumber } from '@/lib/utils/formatters';

interface StudentDetailsModalProps {
  studentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StudentDetailsModal({ studentId, isOpen, onClose }: StudentDetailsModalProps) {
  const { data: student, isLoading: isStudentLoading, isError } = useStudent(studentId || '');
  const { data: attendanceHistory, isLoading: isAttendanceLoading } = useStudentAttendanceHistory(studentId || '', 10);
  const updateStatusMutation = useUpdateStudentStatus();
  const deleteStudentMutation = useDeleteStudent();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  if (!isOpen || !studentId) return null;

  const isLoading = isStudentLoading || isAttendanceLoading;

  const studentName = student?.user?.fullName || 'طالب';
  const studentPhone = student?.user?.phone || student?.emergencyPhone || '';
  const enrollments = student?.groupEnrollments || [];
  const parents = student?.parentLinks || [];

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
                {student && (
                  <Badge variant={student.academicStatus === 'ACTIVE' ? 'success' : 'default'} className="text-xs">
                    {student.academicStatus === 'ACTIVE' ? 'نشط' : (student.academicStatus || 'نشط')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/teacher/students/${studentId}`} onClick={onClose}>
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-primary-600" title="فتح الصفحة الكاملة">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : isError || !student ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">لم يتم العثور على بيانات الطالب محلياً</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Actions / Contact Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100 gap-2">
              <span className="text-xs text-slate-500 font-medium">
                رقم الهاتف: <span className="font-mono text-slate-800" dir="ltr">{studentPhone || '—'}</span>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="bg-white border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl text-xs font-bold"
                  title="إدارة كلمة المرور والدخول"
                >
                  <KeyRound className="w-3.5 h-3.5 ml-1 text-amber-600" />
                  <span>كلمة المرور والدخول</span>
                </Button>
                {studentPhone && (
                  <>
                    <a
                      href={`tel:${studentPhone.replace(/[^0-9+]/g, '')}`}
                      className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      title="اتصال هاتفي"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <a
                      href={`https://wa.me/${formatWhatsAppNumber(studentPhone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                      title="مراسلة عبر واتساب"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Academic Info & Groups */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-xs font-semibold text-slate-500">الصف الدراسي</span>
                <p className="text-sm font-bold text-slate-900">{student.gradeLevel || 'غير محدد'}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-xs font-semibold text-slate-500">تاريخ التسجيل</span>
                <p className="text-sm font-bold text-slate-900">
                  {new Date(student.createdAt || Date.now()).toLocaleDateString('ar-EG')}
                </p>
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
                          {[...attendanceHistory].reverse().map((record: any, i) => {
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
                          {[...attendanceHistory].reverse().map((record: any, i) => {
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
                  
                  <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-500 mt-3 font-medium px-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-green-100 border border-green-200"></div>
                      <span>حاضر</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-red-50 border border-red-200"></div>
                      <span>غائب</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-200"></div>
                      <span>أنجز الواجب</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-200"></div>
                      <span>لم ينجز الواجب</span>
                    </div>
                  </div>
                </div>
              </div>
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

            {/* Parents Links */}
            {parents.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  أولياء الأمور
                </h4>
                <div className="space-y-1.5">
                  {parents.map((p: any, i: number) => {
                    const pName = p.parent?.user?.fullName || 'ولي الأمر';
                    const pPhone = p.parent?.user?.phone || '';
                    return (
                      <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm">
                        <div>
                          <p className="font-semibold text-slate-800">{pName}</p>
                          {pPhone && <p className="text-xs text-slate-500 font-mono" dir="ltr">{pPhone}</p>}
                        </div>
                        {pPhone && (
                          <div className="flex gap-1">
                            <a href={`tel:${pPhone.replace(/[^0-9+]/g, '')}`} className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <a href={`https://wa.me/${formatWhatsAppNumber(pPhone)}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-green-50 text-green-600">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Student Status Management Section */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <UserX className="w-4 h-4 text-amber-600" />
                  حالة قيد الطالب في السنتر
                </span>
                <span className="text-xs text-slate-500">
                  الحالة الحالية: <strong className="text-slate-800 font-bold">{student.academicStatus || 'نشط'}</strong>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={student.academicStatus === 'ACTIVE' ? 'primary' : 'outline'}
                  disabled={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate({ id: student.id, status: 'ACTIVE' })}
                  className="text-xs rounded-xl py-1"
                >
                  <CheckCircle className="w-3.5 h-3.5 ml-1" />
                  نشط
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={student.academicStatus === 'LEFT' ? 'secondary' : 'outline'}
                  disabled={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate({ id: student.id, status: 'LEFT' })}
                  className={`text-xs rounded-xl py-1 ${student.academicStatus === 'LEFT' ? 'bg-amber-600 text-white hover:bg-amber-700' : 'text-amber-700 border-amber-200 hover:bg-amber-50'}`}
                >
                  <UserX className="w-3.5 h-3.5 ml-1" />
                  غادر السنتر
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={student.academicStatus === 'SUSPENDED' ? 'secondary' : 'outline'}
                  disabled={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate({ id: student.id, status: 'SUSPENDED' })}
                  className="text-xs rounded-xl py-1 text-red-600 border-red-200 hover:bg-red-50"
                >
                  موقوف مؤقتاً
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={student.academicStatus === 'ARCHIVED' ? 'secondary' : 'outline'}
                  disabled={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate({ id: student.id, status: 'ARCHIVED' })}
                  className="text-xs rounded-xl py-1 text-slate-600 border-slate-200 hover:bg-slate-100"
                >
                  مؤرشف
                </Button>
              </div>
            </div>

            {/* Danger Zone: Delete Student */}
            <div className="p-4 rounded-2xl border border-red-100 bg-red-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-red-600" />
                    حذف الطالب نهائياً من النظام
                  </h4>
                  <p className="text-[11px] text-red-700 mt-0.5">
                    سيتم حذف سجل الطالب وكافة بياناته المرتبطة.
                  </p>
                </div>
                {!isConfirmingDelete ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="text-xs border-red-200 text-red-600 hover:bg-red-100 rounded-xl"
                  >
                    حذف الطالب
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      disabled={deleteStudentMutation.isPending}
                      onClick={() => {
                        deleteStudentMutation.mutate(student.id, {
                          onSuccess: () => {
                            setIsConfirmingDelete(false);
                            onClose();
                          },
                        });
                      }}
                      className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-xl"
                    >
                      {deleteStudentMutation.isPending ? 'جاري الحذف...' : 'تأكيد الحذف'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="text-xs rounded-xl"
                    >
                      إلغاء
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* QR Badge in Modal */}
            <div className="pt-2">
              <StudentQrBadge studentId={student.id} studentPhone={studentPhone} />
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <Link href={`/teacher/students/${studentId}`} onClick={onClose}>
            <Button variant="outline" size="sm" className="rounded-xl">
              <ExternalLink className="w-4 h-4 ml-1.5" />
              عرض الصفحة الكاملة
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={onClose} className="rounded-xl px-6">
            إغلاق
          </Button>
        </div>
      </div>

      {/* Student Password & Credentials Modal */}
      <StudentPasswordModal
        studentId={studentId}
        studentName={studentName}
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}
