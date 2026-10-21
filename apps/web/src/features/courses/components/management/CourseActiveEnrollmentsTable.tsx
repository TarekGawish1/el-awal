"use client";

import React from "react";
import { Users, Phone, CheckCircle, UserMinus } from "lucide-react";
import { SelectedReceiptState } from "../../types/course-management.types";
import Image from "next/image";
import { resolveReceiptUrl } from "./CourseReceiptModal";
import { isOptimizableImage } from "@/lib/utils/asset-url";

export interface CourseActiveEnrollmentsTableProps {
  filteredActive: any[];
  activeStudents: any[];
  onOpenReceipt: (receipt: SelectedReceiptState) => void;
  onOpenCancel: (target: { enrollmentId: string; studentName: string; courseName: string }) => void;
}

export function CourseActiveEnrollmentsTable({
  filteredActive,
  activeStudents,
  onOpenReceipt,
  onOpenCancel,
}: CourseActiveEnrollmentsTableProps) {
  if (filteredActive.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
        <Users className="w-10 h-10 text-slate-300 mb-1" />
        <p className="text-sm font-bold text-slate-700">
          {activeStudents.length === 0
            ? "لا يوجد طلاب مفعل اشتراكهم بعد"
            : "لا يوجد طلاب مطابقون لخيارات الفلترة أو البحث"}
        </p>
        <p className="text-xs text-slate-400">
          عند قبول أي طلب اشتراك سيظهر الطالب هنا في قائمة المشتركين الفعليين.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold">
          <tr>
            <th className="px-6 py-4">اسم وبيانات الطالب</th>
            <th className="px-6 py-4">الكورس المشترك به</th>
            <th className="px-6 py-4">بيانات السداد</th>
            <th className="px-6 py-4">إيصال السداد</th>
            <th className="px-6 py-4">تاريخ التفعيل والانضمام</th>
            <th className="px-6 py-4">حالة الوصول</th>
            <th className="px-6 py-4 text-left">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredActive.map((student) => {
            const receiptUrl = student.receiptImageUrl
              ? resolveReceiptUrl(student.receiptImageUrl)
              : null;

            return (
              <tr key={student.enrollmentId} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900 text-sm">{student.studentName}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {student.studentCode && (
                      <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                        {student.studentCode}
                      </span>
                    )}
                    {student.studentPhone && (
                      <span className="text-xs text-slate-500 font-mono">{student.studentPhone}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs font-bold text-slate-700 bg-slate-100 inline-flex px-2.5 py-1 rounded-md border border-slate-200">
                    {student.courseName}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs font-bold text-slate-800 font-mono">
                    {student.transferAmount || student.coursePrice} ج.م
                  </div>
                  {student.senderPhone && (
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{student.senderPhone}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {receiptUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenReceipt({
                          url: receiptUrl,
                          studentName: student.studentName,
                          courseName: student.courseName,
                          amount: student.transferAmount || student.coursePrice,
                          phone: student.senderPhone || student.studentPhone,
                          enrollmentId: student.enrollmentId,
                          isActive: true,
                        })
                      }
                      className="group flex items-center gap-2 p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-primary-300 rounded-xl transition-all cursor-pointer shadow-2xs"
                      title="انقر لمعاينة إيصال الدفع"
                    >
                      <Image
                        src={receiptUrl}
                        alt="إيصال"
                        width={40}
                        height={40}
                        className="w-10 h-10 object-cover rounded-lg border border-slate-200 group-hover:scale-105 transition-transform"
                        unoptimized={!isOptimizableImage(receiptUrl)}
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
                    <span className="text-[11px] text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 font-medium inline-block">
                      يدوي / بدون إيصال
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-xs text-slate-500 font-mono">{student.date}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>نشط ومفعل</span>
                  </span>
                </td>
                <td className="px-6 py-4 text-left">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenCancel({
                        enrollmentId: student.enrollmentId,
                        studentName: student.studentName,
                        courseName: student.courseName,
                      })
                    }
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ml-auto"
                    title="إلغاء اشتراك الطالب وتعليق وصوله للكورس"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>إلغاء الاشتراك</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
