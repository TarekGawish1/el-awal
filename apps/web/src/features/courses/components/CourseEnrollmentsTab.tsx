'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  QrCode,
  Search,
  Trash2,
  CheckCircle,
  ShieldCheck,
  Phone,
  Layers,
  GraduationCap,
  Calendar,
} from 'lucide-react';
import { useCourseEnrollments, useRevokeStudentEnrollment } from '../hooks/useCourses';
import { GroupStudentSelectModal } from './GroupStudentSelectModal';
import { CreateStudentEnrollModal } from './CreateStudentEnrollModal';
import { CourseQrEnrollModal } from './CourseQrEnrollModal';
import toast from 'react-hot-toast';

interface CourseEnrollmentsTabProps {
  courseId: string;
  courseTitle: string;
  courseGradeLevel?: string;
}

export function CourseEnrollmentsTab({
  courseId,
  courseTitle,
  courseGradeLevel,
}: CourseEnrollmentsTabProps) {
  const { data: enrollments = [], isLoading } = useCourseEnrollments(courseId);
  const revokeMutation = useRevokeStudentEnrollment(courseId);

  const [searchTerm, setSearchTerm] = useState('');
  const [isGroupSelectModalOpen, setIsGroupSelectModalOpen] = useState(false);
  const [isCreateStudentModalOpen, setIsCreateStudentModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((e) => {
      const matchSearch =
        e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.phone.includes(searchTerm);
      return matchSearch;
    });
  }, [enrollments, searchTerm]);

  const enrolledStudentIds = enrollments.map((e) => e.studentId);

  return (
    <div className="space-y-6 text-right animate-in fade-in">
      {/* Header Controls & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/40">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">الطلاب والمشتركون في الكورس</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                إجمالي المشتركين: <strong className="text-blue-600 dark:text-blue-400 font-mono">{enrollments.length}</strong> طالب
              </p>
            </div>
          </div>
        </div>

        {/* 3 Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsGroupSelectModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-2xl text-xs font-bold transition-all border border-blue-100 dark:border-blue-800/40 shadow-sm"
          >
            <Users className="w-4 h-4" />
            <span>ضم طلاب من المجموعات</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateStudentModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition-colors border border-slate-200 dark:border-slate-700"
          >
            <UserPlus className="w-4 h-4 text-emerald-500" />
            <span>إضافة طالب جديد وحجزه</span>
          </button>

          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-blue-600/30"
          >
            <QrCode className="w-4 h-4" />
            <span>مسح QR الطالب للضم الفوري</span>
          </button>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex items-center gap-3 shadow-sm">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم الطالب، كود الطالب، أو رقم الهاتف..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pr-10 pl-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
        </div>
      </div>

      {/* Students Table List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-xs">جاري تحميل قائمة المشتركين...</div>
        ) : filteredEnrollments.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">لا يوجد طلاب مشتركون بعد</p>
            <p className="text-[11px] text-slate-400">استخدم الأزرار أعلاه لإضافة الطلاب أو مسح أكواد الـ QR.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                <tr>
                  <th className="py-3.5 px-5">اسم الطالب</th>
                  <th className="py-3.5 px-4">كود الطالب</th>
                  <th className="py-3.5 px-4">رقم الهاتف</th>
                  <th className="py-3.5 px-4">الصف الدراسي</th>
                  <th className="py-3.5 px-4">المجموعات الدراسية</th>
                  <th className="py-3.5 px-4">تاريخ الاشتراك</th>
                  <th className="py-3.5 px-4 text-center">إلغاء الاشتراك</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEnrollments.map((stu) => (
                  <tr key={stu.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">
                      {stu.fullName}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {stu.studentCode}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {stu.phone}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {stu.gradeLevel || 'غير محدد'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {stu.groups?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {stu.groups.map((g, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">أونلاين فقط</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {new Date(stu.enrolledAt).toLocaleDateString('ar-EG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من إلغاء اشتراك الطالب ${stu.fullName} من هذا الكورس؟`)) {
                            revokeMutation.mutate(stu.studentId);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
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
      </div>

      {/* Modals */}
      {isGroupSelectModalOpen && (
        <GroupStudentSelectModal
          isOpen={isGroupSelectModalOpen}
          courseId={courseId}
          courseTitle={courseTitle}
          courseGradeLevel={courseGradeLevel}
          alreadyEnrolledStudentIds={enrolledStudentIds}
          onClose={() => setIsGroupSelectModalOpen(false)}
        />
      )}

      {isCreateStudentModalOpen && (
        <CreateStudentEnrollModal
          isOpen={isCreateStudentModalOpen}
          courseId={courseId}
          courseTitle={courseTitle}
          defaultGradeLevel={courseGradeLevel}
          onClose={() => setIsCreateStudentModalOpen(false)}
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
    </div>
  );
}
