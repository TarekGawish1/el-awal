'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Search,
  CheckCircle2,
  Circle,
  Clock,
} from 'lucide-react';
import { useManualHomeworkChecklist } from '../hooks/useManualHomeworkChecklist';

interface ManualHomeworkChecklistProps {
  sessionId: string;
  groupId?: string;
  assessmentId?: string;
  assessmentTitle?: string;
}

export function ManualHomeworkChecklist({
  sessionId,
  groupId,
  assessmentId = 'default-session-homework',
  assessmentTitle = 'واجب الحصة الدراسية',
}: ManualHomeworkChecklistProps) {
  const {
    searchQuery,
    setSearchQuery,
    filteredStudents,
    isLoading,
    updatingId,
    handleToggleHomework,
    handleBulkCheckAll,
    checkedCount,
    totalCount,
    percentage,
  } = useManualHomeworkChecklist({
    sessionId,
    groupId,
    assessmentId,
    assessmentTitle,
  });

  return (
    <div className="space-y-6">
      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">إجمالي طلاب الحصة</p>
          <p className="text-xl font-black text-slate-800 mt-1">{totalCount}</p>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <p className="text-xs font-semibold text-emerald-700">تم تسليم الواجب</p>
          <p className="text-xl font-black text-emerald-800 mt-1">{checkedCount}</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">لم يسلموا بعد</p>
          <p className="text-xl font-black text-slate-700 mt-1">{totalCount - checkedCount}</p>
        </div>

        <div className="bg-primary-50/60 p-4 rounded-2xl border border-primary-200 shadow-xs">
          <p className="text-xs font-semibold text-primary-700">نسبة التسليم</p>
          <p className="text-xl font-black text-primary-800 mt-1">{percentage}%</p>
        </div>
      </div>

      {/* Search & Action Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الطالب أو كود الطالب..."
            className="pr-9 h-10 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkCheckAll}
            className="text-xs h-9"
          >
            تحديد الكل كـ مستلم (تسليم جماعي)
          </Button>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">جاري تحميل قائمة الطلاب...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {searchQuery ? 'لا يوجد طلاب يطابقون البحث الحالي.' : 'لا يوجد طلاب مسجلين في هذه الحصة.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">كود الطالب</th>
                  <th className="py-3.5 px-4">اسم الطالب</th>
                  <th className="py-3.5 px-4 text-center">حالة استلام الواجب في السنتر</th>
                  <th className="py-3.5 px-4 text-center">حضور الحصة (تلقائي)</th>
                  <th className="py-3.5 px-4 text-center">وقت الاستلام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, idx) => (
                  <tr
                    key={student.studentId}
                    className={`transition-colors hover:bg-slate-50/60 ${
                      student.isChecked ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {student.studentCode || '—'}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{student.fullName}</p>
                    </td>

                    {/* Homework Delivery Toggle Checkbox Button */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        disabled={updatingId === student.studentId}
                        onClick={() => handleToggleHomework(student)}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold transition-all shadow-2xs cursor-pointer ${
                          student.isChecked
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {student.isChecked ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                            <span>تم استلام ومراجعة الواجب</span>
                          </>
                        ) : (
                          <>
                            <Circle className="w-4 h-4 text-slate-400" />
                            <span>لم يُسلَّم</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Automatic Session Attendance Status Badge */}
                    <td className="py-3 px-4 text-center">
                      {student.attendanceStatus === 'PRESENT' ? (
                        <Badge variant="success" className="px-2.5 py-1 font-bold">
                          حاضر ✓
                        </Badge>
                      ) : student.attendanceStatus === 'EXCUSED' ? (
                        <Badge variant="warning" className="px-2.5 py-1 font-bold">
                          معذور
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="px-2.5 py-1 text-slate-400">
                          غائب
                        </Badge>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-slate-400">
                      {student.checkedAt ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {student.checkedAt}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
