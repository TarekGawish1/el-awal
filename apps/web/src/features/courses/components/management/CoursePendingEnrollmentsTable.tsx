"use client";

import React from "react";
import { CheckCircle, Phone, Check, X } from "lucide-react";
import { SelectedReceiptState } from "../../types/course-management.types";
import Image from "next/image";
import { resolveReceiptUrl } from "./CourseReceiptModal";
import { isOptimizableImage } from "@/lib/utils/asset-url";

export interface CoursePendingEnrollmentsTableProps {
  filteredPending: any[];
  pendingRequests: any[];
  onOpenReceipt: (receipt: SelectedReceiptState) => void;
  onApprove: (enrollmentId: string) => void;
  isApprovePending: boolean;
  onOpenReject: (target: { enrollmentId: string; studentName: string; courseName: string }) => void;
  isRejectPending: boolean;
}

export function CoursePendingEnrollmentsTable({
  filteredPending,
  pendingRequests,
  onOpenReceipt,
  onApprove,
  isApprovePending,
  onOpenReject,
  isRejectPending,
}: CoursePendingEnrollmentsTableProps) {
  if (filteredPending.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
        <CheckCircle className="w-10 h-10 text-emerald-500/80 mb-1" />
        <p className="text-sm font-bold text-slate-700">
          {pendingRequests.length === 0
            ? "لا توجد طلبات اشتراك معلقة حالياً"
            : "لا توجد طلبات مطابقة لخيارات الفلترة أو البحث"}
        </p>
        <p className="text-xs text-slate-400 max-w-sm">
          {pendingRequests.length === 0
            ? "عند قيام أي طالب برفع إيصال التحويل والاشتراك في أي كورس من كورساتك، سيظهر طلبه هنا فوراً في الوقت الفعلي مع صورة الإيصال."
            : "جرب اختيار كورس آخر أو مسح كلمة البحث لمعاينة جميع الطلبات المعلقة."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold">
          <tr>
            <th className="px-6 py-4">اسم الطالب وبياناته</th>
            <th className="px-6 py-4">الكورس المطلوب</th>
            <th className="px-6 py-4">بيانات التحويل</th>
            <th className="px-6 py-4">إيصال السداد</th>
            <th className="px-6 py-4">تاريخ الطلب</th>
            <th className="px-6 py-4 text-left">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredPending.map((req) => (
            <tr key={req.enrollmentId} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-6 py-4">
                <div className="font-bold text-slate-900 text-sm">{req.studentName}</div>
                <div className="flex items-center gap-2 mt-1">
                  {req.studentCode && (
                    <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                      {req.studentCode}
                    </span>
                  )}
                  {req.studentPhone && (
                    <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {req.studentPhone}
                    </span>
                  )}
                </div>
              </td>

              <td className="px-6 py-4">
                <div className="text-xs font-bold text-primary-700 bg-primary-50 inline-flex px-2.5 py-1 rounded-lg border border-primary-100">
                  {req.courseName}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-1 font-semibold">
                  سعر الكورس: {req.coursePrice} ج.م
                </div>
              </td>

              <td className="px-6 py-4">
                <div className="text-xs font-bold text-emerald-700 bg-emerald-50 inline-flex px-2.5 py-1 rounded-lg border border-emerald-200/60 font-mono">
                  {req.transferAmount} ج.م
                </div>
                <div className="text-xs text-slate-600 font-mono mt-1 flex items-center gap-1">
                  <span className="text-[11px] text-slate-400 font-sans">محول من:</span>
                  <span className="font-bold">{req.senderPhone}</span>
                </div>
              </td>

              <td className="px-6 py-4">
                {req.receiptImageUrl ? (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenReceipt({
                        url: resolveReceiptUrl(req.receiptImageUrl),
                        studentName: req.studentName,
                        courseName: req.courseName,
                        amount: req.transferAmount,
                        phone: req.senderPhone,
                        enrollmentId: req.enrollmentId,
                      })
                    }
                    className="group flex items-center gap-2 p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                  >
                    <Image
                      src={resolveReceiptUrl(req.receiptImageUrl)}
                      alt="إيصال"
                      width={40}
                      height={40}
                      className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-xs group-hover:scale-105 transition-transform"
                      unoptimized={!isOptimizableImage(resolveReceiptUrl(req.receiptImageUrl))}
                    />
                    <div className="text-right">
                      <span className="block text-xs font-bold text-primary-600 group-hover:underline">
                        معاينة الإيصال
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium">
                        انقر للتكبير 🔍
                      </span>
                    </div>
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 italic">لم يرفق إيصال</span>
                )}
              </td>

              <td className="px-6 py-4 text-xs text-slate-500 font-mono">{req.date}</td>

              <td className="px-6 py-4 text-left">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onApprove(req.enrollmentId)}
                    disabled={isApprovePending}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                    title="قبول الاشتراك وتفعيل الكورس للطالب"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>قبول</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenReject({
                        enrollmentId: req.enrollmentId,
                        studentName: req.studentName,
                        courseName: req.courseName,
                      })
                    }
                    disabled={isRejectPending}
                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                    title="رفض الطلب"
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
  );
}
