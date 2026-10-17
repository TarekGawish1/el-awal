'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { StudentQrBadge } from './StudentQrBadge';
import { StudentPasswordModal } from './StudentPasswordModal';
import { StudentEditForm } from './StudentEditForm';
import { 
  X, Phone, User, Users, AlertCircle, ExternalLink, Trash2, 
  UserX, CheckCircle, KeyRound, Edit2, ChevronDown, ChevronUp
} from 'lucide-react';
import { formatWhatsAppNumber } from '@/lib/utils/formatters';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CreatorBadge } from '@/components/ui/CreatorBadge';
import { useStudentDetailsModal } from '../hooks/useStudentDetailsModal';
import { StudentAttendanceHistorySection } from './student-details/StudentAttendanceHistorySection';
import { StudentPaymentHistorySection } from './student-details/StudentPaymentHistorySection';
import { StudentGroupsSection } from './student-details/StudentGroupsSection';
import { StudentStatusSection } from './student-details/StudentStatusSection';
import { StudentGuardianSection } from './student-details/StudentGuardianSection';
import { StudentDangerZone } from './student-details/StudentDangerZone';

interface StudentDetailsModalProps {
  studentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StudentDetailsModal({ studentId, isOpen, onClose }: StudentDetailsModalProps) {
  const {
    student,
    isLoading,
    isError,
    studentName,
    studentPhone,
    enrollments,
    parents,
    parentPhone,
    payments,
    totalPaid,
    totalDue,
    attendanceHistory,
    isConfirmingDelete,
    setIsConfirmingDelete,
    isPasswordModalOpen,
    setIsPasswordModalOpen,
    passwordModalTab,
    setPasswordModalTab,
    isEditing,
    setIsEditing,
    isQrExpanded,
    setIsQrExpanded,
    groupToRemove,
    setGroupToRemove,
    updateStatusMutation,
    deleteStudentMutation,
    removeStudentMutation,
    handleConfirmRemoveGroup,
    handleDeleteStudent,
  } = useStudentDetailsModal({ studentId, onClose });

  if (!isOpen || !studentId) return null;

  const getStageLabel = (stage?: string) => {
    if (stage === 'PRIMARY') return 'المرحلة الابتدائية';
    if (stage === 'MIDDLE') return 'المرحلة الإعدادية';
    if (stage === 'SECONDARY') return 'المرحلة الثانوية';
    return stage || 'غير محدد';
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-3xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[95dvh] sm:max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-start sm:items-center justify-between border-b border-slate-100 p-4 sm:p-6 bg-slate-50/50 rounded-t-3xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xl sm:text-2xl shadow-inner border border-primary-200">
              {studentName.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">{studentName}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs font-mono bg-white border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-md shadow-sm">
                  {student?.studentCode || `STU-${studentId.slice(0, 6)}`}
                </span>
                {student && (
                  <Badge variant={student.academicStatus === 'ACTIVE' ? 'success' : 'default'} className="text-xs py-0.5 px-2">
                    {student.academicStatus === 'ACTIVE' ? 'نشط' : (student.academicStatus || 'نشط')}
                  </Badge>
                )}
                {student?.gradeLevel && (
                  <span className="text-xs text-slate-500 hidden sm:inline-flex px-2 py-0.5 bg-slate-100 rounded-md">
                    {getStageLabel(student.academicStage)} • {student.gradeLevel}
                  </span>
                )}
              </div>
              <CreatorBadge
                createdByName={(student as any)?.createdByName}
                createdAt={student?.createdAt}
                updatedByName={(student as any)?.updatedByName}
                updatedAt={student?.updatedAt}
                className="mt-2"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            {!isEditing && !isLoading && !isError && student && (
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => setIsEditing(true)}
                className="rounded-xl shadow-sm hidden sm:flex cursor-pointer"
              >
                <Edit2 className="w-4 h-4 rtl:ml-1.5 ltr:mr-1.5" />
                تعديل البيانات
              </Button>
            )}
            <div className="flex items-center gap-1.5 mt-2 sm:mt-0">
              <Link href={`/teacher/students/${studentId}`} onClick={onClose}>
                <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-10 sm:h-10 text-slate-500 hover:text-primary-600 rounded-xl" title="فتح الصفحة الكاملة">
                  <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* MODAL CONTENT AREA (Scrollable) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 relative">
          
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
              </div>
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          ) : isError || !student ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">تعذر تحميل بيانات الطالب</h3>
              <p className="text-sm text-slate-500">لم يتم العثور على بيانات الطالب أو حدث خطأ أثناء التحميل.</p>
              <Button onClick={onClose} variant="outline" className="mt-4 rounded-xl">إغلاق</Button>
            </div>
          ) : isEditing ? (
            <StudentEditForm 
              student={student} 
              onSuccess={() => setIsEditing(false)} 
              onCancel={() => setIsEditing(false)} 
            />
          ) : (
            <div className="space-y-8 max-w-3xl mx-auto">
              
              {/* Mobile Edit Button (visible only on small screens) */}
              <div className="sm:hidden mb-4">
                <Button 
                  variant="primary" 
                  className="w-full rounded-xl shadow-sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                  تعديل بيانات الطالب
                </Button>
              </div>

              {/* QUICK ACTION BAR */}
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPasswordModalTab('student');
                    setIsPasswordModalOpen(true);
                  }}
                  className="bg-white border-amber-200 hover:bg-amber-50 rounded-xl text-xs font-bold text-amber-800 shadow-xs flex-1 sm:flex-none justify-center cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 rtl:ml-1.5 ltr:mr-1.5 text-amber-600" />
                  كلمة مرور الطالب
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPasswordModalTab('parent');
                    setIsPasswordModalOpen(true);
                  }}
                  className="bg-emerald-50 hover:bg-emerald-100 border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 shadow-xs flex-1 sm:flex-none justify-center cursor-pointer"
                >
                  <Users className="w-4 h-4 rtl:ml-1.5 ltr:mr-1.5 text-emerald-600" />
                  كلمة مرور ولي الأمر 🔐
                </Button>
                
                {parentPhone && (
                  <>
                    <a
                      href={`tel:${parentPhone.replace(/[^0-9+]/g, '')}`}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center h-9 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors border border-blue-100"
                    >
                      <Phone className="w-4 h-4 rtl:ml-1.5 ltr:mr-1.5" />
                      اتصال بولي الأمر
                    </a>
                    <a
                      href={`https://wa.me/${formatWhatsAppNumber(parentPhone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none inline-flex items-center justify-center h-9 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors border border-emerald-100"
                    >
                      <svg className="w-4 h-4 rtl:ml-1.5 ltr:mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      واتساب ولي الأمر
                    </a>
                  </>
                )}
              </div>

              {/* STUDENT OVERVIEW */}
              <section>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary-600" />
                  بيانات الطالب الأساسية
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[11px] font-medium text-slate-500 mb-1">المرحلة الدراسية</p>
                    <p className="text-sm font-bold text-slate-900">{getStageLabel(student.academicStage)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[11px] font-medium text-slate-500 mb-1">الصف الدراسي</p>
                    <p className="text-sm font-bold text-slate-900">{student.gradeLevel || 'غير محدد'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[11px] font-medium text-slate-500 mb-1">تاريخ التسجيل</p>
                    <p className="text-sm font-bold text-slate-900">
                      {new Date(student.createdAt || Date.now()).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[11px] font-medium text-slate-500 mb-1">رقم الهاتف</p>
                    <p className="text-sm font-bold text-slate-900 font-mono" dir="ltr">{studentPhone || '—'}</p>
                  </div>
                </div>
              </section>

              {/* ATTENDANCE SECTION */}
              <StudentAttendanceHistorySection attendanceHistory={attendanceHistory} />

              {/* PAYMENT HISTORY & OUTSTANDING BALANCE */}
              <StudentPaymentHistorySection
                payments={payments}
                totalPaid={totalPaid}
                totalDue={totalDue}
              />

              {/* GROUPS */}
              <StudentGroupsSection
                enrollments={enrollments}
                studentGradeLevel={student.gradeLevel}
                onClose={onClose}
                onRemoveGroup={setGroupToRemove}
              />

              {/* GUARDIAN */}
              <StudentGuardianSection parents={parents} />

              {/* STUDENT STATUS */}
              <StudentStatusSection
                studentId={student.id}
                academicStatus={student.academicStatus}
                updateStatusMutation={updateStatusMutation}
              />

              {/* QR CODE COLLAPSIBLE */}
              <section className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                <button 
                  className="w-full p-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
                  onClick={() => setIsQrExpanded(!isQrExpanded)}
                >
                  <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    رمز الطالب QR
                  </span>
                  {isQrExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {isQrExpanded && (
                  <div className="p-4 pt-2 border-t border-slate-100 flex justify-center">
                    <div className="max-w-[320px] w-full">
                      <StudentQrBadge studentId={student.id} studentPhone={studentPhone} />
                    </div>
                  </div>
                )}
              </section>

              {/* DANGER ZONE */}
              <StudentDangerZone
                studentName={studentName}
                isConfirmingDelete={isConfirmingDelete}
                setIsConfirmingDelete={setIsConfirmingDelete}
                deleteStudentMutation={deleteStudentMutation}
                onDeleteStudent={handleDeleteStudent}
              />

            </div>
          )}
        </div>
      </div>

      <StudentPasswordModal
        studentId={studentId}
        studentName={studentName}
        isOpen={isPasswordModalOpen}
        initialTab={passwordModalTab}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      <ConfirmModal
        isOpen={!!groupToRemove}
        title="تأكيد إزالة الطالب من المجموعة"
        message={`هل أنت متأكد من إزالة الطالب "${studentName}" من "${groupToRemove?.name}"؟`}
        confirmLabel={removeStudentMutation.isPending ? "جاري الإزالة..." : "نعم، إزالة الطالب"}
        cancelLabel="إلغاء"
        variant="danger"
        isLoading={removeStudentMutation.isPending}
        onConfirm={handleConfirmRemoveGroup}
        onClose={() => setGroupToRemove(null)}
      />
    </div>
  );
}

export default StudentDetailsModal;
