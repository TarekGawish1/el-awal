"use client";

import React from "react";
import { AlertCircle, UserMinus, BookOpen, Loader2 } from "lucide-react";
import {
  RejectTargetState,
  CancelModalTargetState,
  DirectEnrollTargetState,
} from "../../types/course-management.types";
import { CourseDetail } from "../../types/courses.types";

export interface CourseEnrollmentActionModalsProps {
  rejectTarget: RejectTargetState | null;
  rejectionReason: string;
  setRejectionReason: (val: string) => void;
  onCloseRejectModal: () => void;
  onConfirmReject: () => void;
  isRejectPending: boolean;

  cancelModalTarget: CancelModalTargetState | null;
  cancellationReason: string;
  setCancellationReason: (val: string) => void;
  onCloseCancelModal: () => void;
  onConfirmCancel: () => void;
  isCancelPending: boolean;

  directEnrollTarget: DirectEnrollTargetState | null;
  directEnrollCourseId: string;
  setDirectEnrollCourseId: (val: string) => void;
  teacherCourses: CourseDetail[];
  onCloseDirectEnrollModal: () => void;
  onConfirmDirectEnroll: () => void;
  isDirectEnrollPending: boolean;
}

export function CourseEnrollmentActionModals({
  rejectTarget,
  rejectionReason,
  setRejectionReason,
  onCloseRejectModal,
  onConfirmReject,
  isRejectPending,

  cancelModalTarget,
  cancellationReason,
  setCancellationReason,
  onCloseCancelModal,
  onConfirmCancel,
  isCancelPending,

  directEnrollTarget,
  directEnrollCourseId,
  setDirectEnrollCourseId,
  teacherCourses,
  onCloseDirectEnrollModal,
  onConfirmDirectEnroll,
  isDirectEnrollPending,
}: CourseEnrollmentActionModalsProps) {
  return (
    <>
      {/* Reject Confirmation Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            dir="rtl"
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden p-6 space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">رفض طلب اشتراك الطالب</h4>
                <p className="text-xs text-slate-500 line-clamp-1">
                  {rejectTarget.studentName} - {rejectTarget.courseName}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                سبب الرفض (سيتم إرساله كإشعار للطالب):
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="مثال: لم يتم استلام المبلغ على محفظة فودافون كاش، يرجى التأكد من الرقم والتحويل مجدداً."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onCloseRejectModal}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isRejectPending}
                onClick={onConfirmReject}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isRejectPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>تأكيد الرفض</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Active Subscription Modal */}
      {cancelModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            dir="rtl"
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden p-6 space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                <UserMinus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">إلغاء اشتراك الطالب في الكورس</h4>
                <p className="text-xs text-slate-500 line-clamp-1">
                  {cancelModalTarget.studentName} - {cancelModalTarget.courseName}
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-xs text-amber-800 leading-relaxed">
              تنبيه: سيؤدي إلغاء الاشتراك إلى إيقاف وصول الطالب لدروس وفيديوهات الكورس فوراً وإرسال إشعار له بسبب الإلغاء.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                سبب إلغاء الاشتراك (اختياري - سيظهر للطالب في الإشعار):
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="مثال: تم استرداد المبلغ، أو انتهاء فترة الاشتراك المتفق عليها."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onCloseCancelModal}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={isCancelPending}
                onClick={onConfirmCancel}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isCancelPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>تأكيد إلغاء الاشتراك</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Enroll Modal for Unsubscribed Student */}
      {directEnrollTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            dir="rtl"
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden p-6 space-y-4"
          >
            <div className="flex items-center gap-3 text-primary-600">
              <div className="w-10 h-10 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">تسجيل الطالب في كورس أونلاين</h4>
                <p className="text-xs text-slate-500 line-clamp-1">
                  {directEnrollTarget.studentName} ({directEnrollTarget.studentCode})
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">الصف الدراسي:</span>
                <span className="font-bold text-slate-800">
                  {directEnrollTarget.gradeLevel || "غير محدد"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                اختر الكورس المطلوب تفعيل الاشتراك به:
              </label>
              {teacherCourses.length === 0 ? (
                <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  لا توجد كورسات متاحة حالياً، يرجى إنشاء كورس أولاً.
                </p>
              ) : (
                <select
                  value={directEnrollCourseId}
                  onChange={(e) => setDirectEnrollCourseId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all cursor-pointer"
                >
                  <option value="" disabled>
                    -- اختر الكورس --
                  </option>
                  {teacherCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.gradeLevel}) - {c.price} ج.م
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onCloseDirectEnrollModal}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isDirectEnrollPending || !directEnrollCourseId}
                onClick={onConfirmDirectEnroll}
                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isDirectEnrollPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>تأكيد التسجيل والتفعيل</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
