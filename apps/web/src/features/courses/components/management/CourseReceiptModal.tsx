"use client";

import React from "react";
import { Image as ImageIcon, X, ExternalLink, UserMinus, Check } from "lucide-react";
import { SelectedReceiptState } from "../../types/course-management.types";

import { API_BASE_URL } from "@/lib/api/endpoints";

export function resolveReceiptUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  const cleanBase = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  return `${cleanBase}${url.startsWith("/") ? "" : "/"}${url}`;
}

export interface CourseReceiptModalProps {
  selectedReceipt: SelectedReceiptState | null;
  onClose: () => void;
  onApprove: (enrollmentId: string) => void;
  isApprovePending: boolean;
  onOpenRejectModal: (target: { enrollmentId: string; studentName: string; courseName: string }) => void;
  onOpenCancelModal: (target: { enrollmentId: string; studentName: string; courseName: string }) => void;
}

export function CourseReceiptModal({
  selectedReceipt,
  onClose,
  onApprove,
  isApprovePending,
  onOpenRejectModal,
  onOpenCancelModal,
}: CourseReceiptModalProps) {
  if (!selectedReceipt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        dir="rtl"
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-amber-400" />
              <span>إيصال تحويل: {selectedReceipt.studentName}</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">{selectedReceipt.courseName}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Details Meta Chips */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <span className="text-slate-500 font-normal">المبلغ المحول:</span>
            <span className="text-emerald-600 font-mono">{selectedReceipt.amount} ج.م</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <span className="text-slate-500 font-normal">رقم المحفظة المحول منها:</span>
            <span className="font-mono text-primary-600">{selectedReceipt.phone}</span>
          </div>
          <a
            href={selectedReceipt.url}
            target="_blank"
            rel="noreferrer"
            className="mr-auto text-primary-600 hover:underline flex items-center gap-1 font-bold text-xs"
          >
            <span>فتح الصورة بجودة كاملة</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Image Preview Container */}
        <div className="p-6 overflow-y-auto flex items-center justify-center bg-slate-950/5 min-h-[300px]">
          <img
            src={selectedReceipt.url}
            alt="صورة إيصال التحويل"
            className="max-h-[55vh] w-auto max-w-full rounded-2xl shadow-lg border border-slate-200 object-contain"
          />
        </div>

        {/* Actions Bar */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
          {selectedReceipt.isActive ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const target = {
                    enrollmentId: selectedReceipt.enrollmentId,
                    studentName: selectedReceipt.studentName,
                    courseName: selectedReceipt.courseName,
                  };
                  onClose();
                  onOpenCancelModal(target);
                }}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <UserMinus className="w-4 h-4" />
                <span>إلغاء اشتراك هذا الطالب</span>
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onApprove(selectedReceipt.enrollmentId)}
                disabled={isApprovePending}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>تأكيد الإيصال وقبول الاشتراك</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = {
                    enrollmentId: selectedReceipt.enrollmentId,
                    studentName: selectedReceipt.studentName,
                    courseName: selectedReceipt.courseName,
                  };
                  onClose();
                  onOpenRejectModal(target);
                }}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                رفض الطلب
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
