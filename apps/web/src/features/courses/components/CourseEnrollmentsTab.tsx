'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  QrCode,
  Search,
  GraduationCap,
  CreditCard,
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
import { EnrolledStudentsTable } from './enrollments/EnrolledStudentsTable';
import { PendingEnrollmentsTable } from './enrollments/PendingEnrollmentsTable';
import { ReceiptPreviewModal } from './enrollments/ReceiptPreviewModal';
import { RejectReasonModal } from './enrollments/RejectReasonModal';

interface CourseEnrollmentsTabProps {
  courseId: string;
  courseTitle: string;
}

export function CourseEnrollmentsTab({ courseId, courseTitle }: CourseEnrollmentsTabProps) {
  const { data: rawStudents, isLoading } = useCourseEnrollments(courseId);
  const { data: rawPendingRequests, isLoading: isPendingLoading } = usePendingEnrollments(courseId);

  const students = useMemo(() => (Array.isArray(rawStudents) ? rawStudents : []), [rawStudents]);
  const pendingRequests = useMemo(() => (Array.isArray(rawPendingRequests) ? rawPendingRequests : []), [rawPendingRequests]);

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
        <EnrolledStudentsTable
          isLoading={isLoading}
          students={filteredStudents}
          onRevoke={setStudentToRevoke}
        />
      ) : (
        <PendingEnrollmentsTable
          isLoading={isPendingLoading}
          requests={filteredPending}
          onPreviewReceipt={setPreviewReceiptUrl}
          onApprove={handleApprove}
          onReject={setRejectingItem}
          isApproving={approveMutation.isPending}
          isRejecting={rejectMutation.isPending}
        />
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
      <ReceiptPreviewModal
        receiptUrl={previewReceiptUrl}
        onClose={() => setPreviewReceiptUrl(null)}
      />

      {/* Reject Reason Prompt Modal */}
      <RejectReasonModal
        rejectingItem={rejectingItem}
        rejectionReason={rejectionReasonInput}
        onReasonChange={setRejectionReasonInput}
        onConfirm={handleConfirmReject}
        onClose={() => setRejectingItem(null)}
        isPending={rejectMutation.isPending}
      />

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
