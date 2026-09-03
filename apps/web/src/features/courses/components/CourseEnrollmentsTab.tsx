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
  CreditCard,
  Check,
  X,
  Eye,
  ExternalLink,
  Download,
  AlertCircle,
  Phone,
  ArrowUpDown,
} from 'lucide-react';
import {
  useCourseEnrollments,
  useRevokeStudentEnrollment,
  usePendingEnrollments,
  useApproveEnrollment,
  useRejectEnrollment,
} from '../hooks/useCourses';
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
  const { data: pendingRequests = [], isLoading: isPendingLoading } = usePendingEnrollments(courseId);

  const revokeMutation = useRevokeStudentEnrollment(courseId);
  const approveMutation = useApproveEnrollment(courseId);
  const rejectMutation = useRejectEnrollment(courseId);

  const [activeSubTab, setActiveSubTab] = useState<'ENROLLED' | 'PENDING'>('ENROLLED');
  const [searchTerm, setSearchTerm] = useState('');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isCreateStudentModalOpen, setIsCreateStudentModalOpen] = useState(false);
  const [studentToRevoke, setStudentToRevoke] = useState<{ id: string; name: string } | null>(null);

  // Receipt Preview & Rejection Modals
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);
  const [rejectingItem, setRejectingItem] = useState<{ id: string; studentName: string } | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  const filteredStudents = students.filter(
    (s: CourseEnrollmentStudent) =>
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.studentCode && s.studentCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.phone && s.phone.includes(searchTerm))
  );

  const filteredPending = pendingRequests.filter(
    (p: any) =>
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.studentCode && p.studentCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.phone && p.phone.includes(searchTerm)) ||
      (p.senderPhone && p.senderPhone.includes(searchTerm))
  );

  const alreadyEnrolledIds = students.map((s: CourseEnrollmentStudent) => s.studentId);

  const handleApprove = (enrollmentId: string) => {
    approveMutation.mutate(enrollmentId);
  };

  const handleConfirmReject = () => {
    if (!rejectingItem) return;
    rejectMutation.mutate({
      enrollmentId: rejectingItem.id,
      reason: rejectionReasonInput.trim() || 'تعذر التحقق من صحة إيصال التحويل أو لم يتم استلام المبلغ.',
    });
    setRejectingItem(null);
    setRejectionReasonInput('');
  };

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
            إدارة الطلاب المشتركين يدوياً أو مراجعة طلبات وإيصالات فودافون كاش الأونلاين
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setIsGroupModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white rounded-xl text-xs font-bold transition-all border border-primary-100 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>ضم من المجموعات</span>
          </button>

          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-primary-600 hover:text-white text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>مسح كود QR</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateStudentModalOpen(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>تسجيل طالب جديد</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher: Enrolled vs Pending Receipts */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('ENROLLED')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'ENROLLED'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>الطلاب المشتركون</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/10 font-bold">
            {students.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('PENDING')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
            activeSubTab === 'PENDING'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>طلبات الاشتراك وإيصالات فودافون كاش</span>
          {pendingRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-amber-950 font-black animate-pulse">
              {pendingRequests.length} جديد
            </span>
          )}
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 shadow-sm">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeSubTab === 'ENROLLED'
                ? 'بحث باسم الطالب، كود الطالب، أو رقم الهاتف...'
                : 'بحث برقم المحفظة، اسم الطالب، أو كود الطالب...'
            }
            className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
        </div>
        <span className="text-xs font-bold text-slate-500 px-3 whitespace-nowrap">
          {activeSubTab === 'ENROLLED' ? `${filteredStudents.length} طالب` : `${filteredPending.length} طلب`}
        </span>
      </div>

      {/* Active Tab View */}
      {activeSubTab === 'ENROLLED' ? (
        /* Enrolled Students Table */
        isLoading ? (
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
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
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
        )
      ) : (
        /* Pending Subscription Requests Table */
        isPendingLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          </div>
        ) : filteredPending.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
            <CreditCard className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">لا توجد طلبات اشتراك معلقة حالياً</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              أي طلب اشتراك يقوم به الطلاب عبر فودافون كاش مع إيصال التحويل سيظهر هنا مباشرة للمراجعة والتفعيل.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="py-3.5 px-4">اسم الطالب</th>
                  <th className="py-3.5 px-4">رقم محفظة التحويل</th>
                  <th className="py-3.5 px-4">المبلغ</th>
                  <th className="py-3.5 px-4">إيصال التحويل</th>
                  <th className="py-3.5 px-4">تاريخ الإرسال</th>
                  <th className="py-3.5 px-4 text-center">القرار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredPending.map((req: any) => (
                  <tr key={req.enrollmentId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-900">{req.fullName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {req.phone || req.studentCode || '—'}
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-red-500" />
                        <span>{req.senderPhone || 'غير محدد'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-rose-600">
                      {req.transferAmount} ج.م
                    </td>
                    <td className="py-3.5 px-4">
                      {req.receiptImageUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewReceiptUrl(req.receiptImageUrl)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors border border-slate-200 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-primary-600" />
                          <span>معاينة الإيصال</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">بدون صورة</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(req.enrolledAt).toLocaleDateString('ar-EG', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(req.enrollmentId)}
                          disabled={approveMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>قبول وتفعيل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setRejectingItem({ id: req.enrollmentId, studentName: req.fullName })
                          }
                          disabled={rejectMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>رفض</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
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

      {/* High-Resolution Receipt Preview Modal */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
          <div
            dir="rtl"
            className="relative bg-white rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-red-500" />
                <h4 className="font-bold text-sm">إيصال تحويل فودافون كاش</h4>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewReceiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="فتح بالحجم الأصلي"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewReceiptUrl(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-auto flex items-center justify-center bg-slate-100/50 min-h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewReceiptUrl}
                alt="إيصال التحويل"
                className="max-w-full max-h-[70vh] rounded-xl object-contain border border-slate-200 shadow-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Prompt Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div
            dir="rtl"
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4"
          >
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h4 className="font-bold text-sm text-slate-900">رفض طلب اشتراك الطالب</h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              هل أنت متأكد من رفض طلب اشتراك الطالب <strong>{rejectingItem.studentName}</strong>؟ يمكنك كتابة سبب الرفض ليظهر للطالب في حسابه.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">سبب الرفض (اختياري)</label>
              <textarea
                rows={3}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="مثال: لم يتم استلام المبلغ بالمحفظة، أو صورة الإيصال غير واضحة..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejectMutation.isPending}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                {rejectMutation.isPending ? 'جاري الرفض...' : 'تأكيد رفض الطلب'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Student Enrollment Confirmation */}
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
