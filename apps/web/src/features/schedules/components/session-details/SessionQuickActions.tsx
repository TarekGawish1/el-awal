'use client';

import React from 'react';
import Link from 'next/link';
import { QrCode, Wallet, BookOpen, ClipboardList, GraduationCap } from 'lucide-react';
import { LessonSessionItem } from '../../types/schedules.types';

interface SessionQuickActionsProps {
  session: LessonSessionItem;
  groupAssessments: any[];
}

export function SessionQuickActions({ session, groupAssessments }: SessionQuickActionsProps) {
  const sessionDateOnly = session.sessionDate.includes('T')
    ? session.sessionDate.split('T')[0]
    : session.sessionDate;
  const sessionDateObj = new Date(sessionDateOnly);
  const sessionYear = !isNaN(sessionDateObj.getFullYear())
    ? sessionDateObj.getFullYear()
    : new Date().getFullYear();
  const sessionMonth = !isNaN(sessionDateObj.getMonth())
    ? sessionDateObj.getMonth() + 1
    : new Date().getMonth() + 1;

  const assessmentsAny = groupAssessments as any[];
  const thisSessionAssignment = assessmentsAny.find(
    (a: any) => a.type === 'ASSIGNMENT' && a.dueDate?.includes(sessionDateOnly)
  );
  const thisSessionExam = assessmentsAny.find(
    (a: any) =>
      a.type === 'EXAM' &&
      (a.startDate?.includes(sessionDateOnly) || a.dueDate?.includes(sessionDateOnly))
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Attendance QR Action */}
      <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 flex flex-col justify-between gap-3 transition-all hover:bg-emerald-50 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-900 font-extrabold text-xs">
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span>رصد الحضور والـ QR</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium">
            {session._count?.attendanceRecords || 0} طالب تم تسجيل حضورهم لهذه الحصة
          </p>
        </div>

        <Link
          href={`/teacher/attendance?sessionId=${session.id}&groupId=${session.groupId}&date=${sessionDateOnly}`}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>رصد الحضور بالـ QR</span>
        </Link>
      </div>

      {/* Payments / Finance QR & Manual Action */}
      <div className="p-4 bg-indigo-50/80 rounded-2xl border border-indigo-200 flex flex-col justify-between gap-3 transition-all hover:bg-indigo-50 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-indigo-900 font-extrabold text-xs">
            <Wallet className="w-4 h-4 text-indigo-600" />
            <span>رصد المدفوعات (QR ويدوي)</span>
          </div>
          <p className="text-[11px] text-indigo-700 font-medium">
            تسجيل سداد المصروفات والاشتراكات الشهرية للمجموعة
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/teacher/finance?groupId=${session.groupId}&year=${sessionYear}&month=${sessionMonth}&scan=true`}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>رصد بالـ QR</span>
          </Link>
          <Link
            href={`/teacher/finance?groupId=${session.groupId}&year=${sessionYear}&month=${sessionMonth}&record=true`}
            className="w-full py-2.5 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>رصد يدوي</span>
          </Link>
        </div>
      </div>

      {/* Homework & Exams Submissions Quick Action */}
      {(thisSessionAssignment || thisSessionExam) && (
        <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 flex flex-col justify-between gap-3 transition-all hover:bg-amber-50 shadow-2xs sm:col-span-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-xs">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <span>حلول الواجبات وإجابات الامتحانات للحصة</span>
              </div>
            </div>
            <p className="text-[11px] text-amber-700 font-medium">
              عرض وتصحيح تسليمات الطلاب للواجب والامتحان المرتبط بهذه الحصة
            </p>
          </div>

          <div className={`grid gap-2 ${thisSessionAssignment && thisSessionExam ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {thisSessionAssignment && (
              <Link
                href={`/teacher/assessments/${thisSessionAssignment.id}/submissions`}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>حلول الواجب ({thisSessionAssignment._count?.submissions || 0})</span>
              </Link>
            )}

            {thisSessionExam && (
              <Link
                href={`/teacher/assessments/${thisSessionExam.id}/submissions`}
                className="w-full py-2.5 bg-white hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>إجابات الامتحان ({thisSessionExam._count?.submissions || 0})</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
