"use client";

import React from "react";
import { UserX, Phone, Globe, MessageCircle, Plus } from "lucide-react";

export interface CourseUnsubscribedStudentsTableProps {
  filteredUnsubscribed: any[];
  unsubscribedStudents: any[];
  onOpenDirectEnroll: (student: any) => void;
}

export function CourseUnsubscribedStudentsTable({
  filteredUnsubscribed,
  unsubscribedStudents,
  onOpenDirectEnroll,
}: CourseUnsubscribedStudentsTableProps) {
  if (filteredUnsubscribed.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
        <UserX className="w-10 h-10 text-slate-300 mb-1" />
        <p className="text-sm font-bold text-slate-700">
          {unsubscribedStudents.length === 0
            ? "لا يوجد طلاب مسجلون أونلاين غير مشتركين"
            : "لا يوجد طلاب مطابقون لخيارات البحث"}
        </p>
        <p className="text-xs text-slate-400">
          جميع الطلاب المسجلين بنظام الأونلاين لديهم اشتراكات فعالة أو طلبات معلقة.
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
            <th className="px-6 py-4">الصف الدراسي</th>
            <th className="px-6 py-4">بيانات ولي الأمر</th>
            <th className="px-6 py-4">تاريخ التسجيل</th>
            <th className="px-6 py-4">حالة الحساب</th>
            <th className="px-6 py-4 text-left">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredUnsubscribed.map((student) => {
            const studentPhoneClean = (student.studentPhone || "").replace(/\D/g, "");
            const waStudentPhone = studentPhoneClean.startsWith("20")
              ? studentPhoneClean
              : studentPhoneClean.startsWith("0")
              ? `2${studentPhoneClean}`
              : `20${studentPhoneClean}`;

            return (
              <tr key={student.studentId} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900 text-sm">{student.studentName}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {student.studentCode && (
                      <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                        {student.studentCode}
                      </span>
                    )}
                    {student.studentPhone && (
                      <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {student.studentPhone}
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-6 py-4">
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    {student.gradeLevel || "غير محدد"}
                  </span>
                </td>

                <td className="px-6 py-4">
                  {student.parentPhone ? (
                    <div>
                      <div className="text-xs font-mono text-slate-700 font-semibold" dir="ltr">
                        {student.parentPhone}
                      </div>
                      {student.parentName && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{student.parentName}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">—</span>
                  )}
                </td>

                <td className="px-6 py-4 text-xs text-slate-500 font-mono">{student.date}</td>

                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                    <Globe className="w-3 h-3" />
                    <span>مسجل أونلاين (غير مشترك)</span>
                  </span>
                </td>

                <td className="px-6 py-4 text-left">
                  <div className="flex items-center justify-end gap-2">
                    {student.studentPhone && (
                      <a
                        href={`https://wa.me/${waStudentPhone}?text=${encodeURIComponent(
                          `مرحباً ${student.studentName}، نتواصل معك من منصة الأول للرياضيات (أستاذ أحمد غريب) بخصوص تفعيل اشتراكك في الكورسات الأونلاين.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-colors shadow-2xs"
                        title="تواصل مع الطالب عبر واتساب"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>واتساب</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenDirectEnroll(student)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                      title="تسجيل وتفعيل الاشتراك في كورس أونلاين مباشرة"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>تسجيل في كورس</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
