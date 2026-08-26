'use client';

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  QrCode,
  Search,
  CheckCircle,
  Clock,
  Trash2,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { useCourseEnrollments, useRevokeStudentEnrollment } from '../hooks/useCourses';
import { CourseEnrollmentStudent } from '../types/courses.types';
import { GroupStudentSelectModal } from './GroupStudentSelectModal';
import { CourseQrEnrollModal } from './CourseQrEnrollModal';
import { CreateStudentEnrollModal } from './CreateStudentEnrollModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface CourseEnrollmentsTabProps {
  courseId: string;
  courseTitle: string;
}

export function CourseEnrollmentsTab({ courseId, courseTitle }: CourseEnrollmentsTabProps) {
  const { data: students = [], isLoading } = useCourseEnrollments(courseId);
  const revokeMutation = useRevokeStudentEnrollment(courseId);

  const [searchTerm, setSearchTerm] = useState('');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isCreateStudentModalOpen, setIsCreateStudentModalOpen] = useState(false);
  const [studentToRevoke, setStudentToRevoke] = useState<{ id: string; name: string } | null>(null);

  const filteredStudents = students.filter(
    (s: CourseEnrollmentStudent) =>
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.studentCode && s.studentCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.phone && s.phone.includes(searchTerm))
  );

  const alreadyEnrolledIds = students.map((s: CourseEnrollmentStudent) => s.studentId);

  return (
    <div className="space-y-6 text-right animate-in fade-in">
      {/* Header Banner & Enrollment Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="w-5 h-5 text-primary-600" />
            <h2 className="text-base font-bold text-slate-900">الطلاب والمشتركون في الكورس</h2>
          </div>
          <p className="text-xs text-slate-500">
            إدارة الطلاب المشتركين يدوياً أو عبر مسح QR كود أو التعيين عبر المجموعات الدراسية
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setIsGroupModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white rounded-xl text-xs font-bold transition-all border border-primary-100"
          >
            <Users className="w-4 h-4" />
            <span>ضم من المجموعات</span>
          </button>

          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-primary-600 hover:text-white text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200"
          >
            <QrCode className="w-4 h-4" />
            <span>مسح كود QR</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateStudentModalOpen(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>تسجيل طالب جديد</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 shadow-sm">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم الطالب، كود الطالب، أو رقم الهاتف..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
        </div>
        <span className="text-xs font-bold text-slate-500 px-3 whitespace-nowrap">
          {filteredStudents.length} طالب
        </span>
      </div>

      {/* Students Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
          <Users className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">لا يوجد طلاب مسجلين في هذا الكورس حالياً</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            استخدم الخيارات بأعلى الشاشة لضم طلاب من المجموعات الدراسية أو مسح كود QR أو تسجيل حساب طالب جديد.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-700 font-bold">
              <tr>
                <th className="py-3.5 px-4">اسم الطالب</th>
                <th className="py-3.5 px-4">كود الطالب</th>
                <th className="py-3.5 px-4">الصف والمرحلة</th>
                <th className="py-3.5 px-4">طريقة الاشتراك</th>
                <th className="py-3.5 px-4">نسبة الإنجاز</th>
                <th className="py-3.5 px-4">تاريخ الاشتراك</th>
                <th className="py-3.5 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredStudents.map((stu: CourseEnrollmentStudent) => (
                <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div>
                      <p className="font-bold text-slate-900">{stu.fullName}</p>
                      {stu.phone && <p className="text-[11px] text-slate-400 font-mono">{stu.phone}</p>}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                    {stu.studentCode || '—'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{stu.gradeLevel}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary-50 text-primary-700 border border-primary-100">
                      {stu.accessType === 'MANUAL'
                        ? 'يدوي / مباشر'
                        : stu.accessType === 'QR_SCAN'
                        ? 'مسح كود QR'
                        : 'عبر المجموعة'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {stu.progressPercentage !== undefined ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${stu.progressPercentage}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-slate-600">
                          {stu.progressPercentage}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">لم يبدأ بعد</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {new Date(stu.enrolledAt).toLocaleDateString('ar-EG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => setStudentToRevoke({ id: stu.studentId, name: stu.fullName })}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="إلغاء الاشتراك"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals for 3 Enrollment Channels */}
      {isGroupModalOpen && (
        <GroupStudentSelectModal
          isOpen={isGroupModalOpen}
          courseId={courseId}
          courseTitle={courseTitle}
          alreadyEnrolledStudentIds={alreadyEnrolledIds}
          onClose={() => setIsGroupModalOpen(false)}
        />
      )}

      {isQrModalOpen && (
        <CourseQrEnrollModal
          isOpen={isQrModalOpen}
          courseId={courseId}
          courseTitle={courseTitle}
          onClose={() => setIsQrModalOpen(false)}
        />
      )}

      {isCreateStudentModalOpen && (
        <CreateStudentEnrollModal
          isOpen={isCreateStudentModalOpen}
          courseId={courseId}
          courseTitle={courseTitle}
          onClose={() => setIsCreateStudentModalOpen(false)}
        />
      )}

      {/* Custom Confirmation Dialog (No JS Confirm) */}
      <ConfirmModal
        isOpen={Boolean(studentToRevoke)}
        title="تأكيد إلغاء اشتراك الطالب"
        message={`هل أنت متأكد من إلغاء اشتراك الطالب "${studentToRevoke?.name}" من هذا الكورس؟ سيفقد الطالب صلاحية الوصول لفيديوهات واختبارات الكورس.`}
        confirmText="إلغاء الاشتراك الآن"
        cancelText="تراجع"
        variant="danger"
        isLoading={revokeMutation.isPending}
        onConfirm={() => {
          if (studentToRevoke) {
            revokeMutation.mutate(studentToRevoke.id);
            setStudentToRevoke(null);
          }
        }}
        onClose={() => setStudentToRevoke(null)}
      />
    </div>
  );
}
