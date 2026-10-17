'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, XCircle, ClipboardCheck, RotateCcw } from 'lucide-react';

interface QrHomeworkManualListProps {
  lastScanResult: {
    success: boolean;
    studentName?: string;
    studentCode?: string;
    message: string;
  } | null;
  sessionReport?: any;
  localHomeworkRecords: any[];
  onRemoveHomework: (student: any) => void;
  onManualRecord: (
    student: any,
    status: 'CHECKED_ONSITE' | 'NOT_SUBMITTED' | 'INCOMPLETE' | 'EXCUSED'
  ) => void;
}

export function QrHomeworkManualList({
  lastScanResult,
  sessionReport,
  localHomeworkRecords,
  onRemoveHomework,
  onManualRecord,
}: QrHomeworkManualListProps) {
  const validRecords =
    sessionReport?.records?.filter(
      (s: any) => s.fullName !== 'طالب غير متزامن' && !String(s.studentId).startsWith('qr_tok_')
    ) || [];

  return (
    <div className="md:col-span-6 space-y-4">
      {lastScanResult && (
        <Alert
          variant={lastScanResult.success ? 'success' : 'error'}
          className="p-4 rounded-2xl border transition-all"
        >
          <div className="flex items-start gap-3">
            {lastScanResult.success ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-bold text-sm text-slate-800">
                {lastScanResult.success ? 'تم رصد الواجب بنجاح' : 'تعذر الرصد'}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {lastScanResult.message}
              </p>
            </div>
          </div>
        </Alert>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-primary-500" />
            <span>قائمة الطلاب (تسجيل يدوي)</span>
          </h4>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
            {validRecords.length} طالب
          </span>
        </div>

        {validRecords.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            لا توجد بيانات طلاب لهذه الحصة بعد.
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {validRecords.map((student: any) => {
              const isAbsent = student.status === 'ABSENT';
              const record = isAbsent
                ? null
                : localHomeworkRecords.find((r) => r.studentId === student.studentId);
              const status = record?.status;

              return (
                <div
                  key={student.studentId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        status === 'CHECKED_ONSITE'
                          ? 'bg-emerald-100 text-emerald-700'
                          : status === 'NOT_SUBMITTED'
                          ? 'bg-rose-100 text-rose-700'
                          : status === 'INCOMPLETE'
                          ? 'bg-amber-100 text-amber-700'
                          : status === 'EXCUSED'
                          ? 'bg-slate-200 text-slate-700'
                          : isAbsent
                          ? 'bg-rose-50 text-rose-500 border border-rose-200'
                          : 'bg-white text-slate-300 border border-slate-200'
                      }`}
                    >
                      {status === 'CHECKED_ONSITE'
                        ? '✓'
                        : status === 'NOT_SUBMITTED'
                        ? '✗'
                        : status === 'INCOMPLETE'
                        ? '!'
                        : status === 'EXCUSED'
                        ? '-'
                        : isAbsent
                        ? 'غ'
                        : '?'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">
                        {student.fullName || student.studentName}
                      </p>
                      {student.studentCode && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {student.studentCode}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 rtl:sm:mr-auto">
                    {status && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveHomework(student)}
                        className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="إلغاء تقييم الواجب (تراجع)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onManualRecord(student, 'CHECKED_ONSITE')}
                      className={`h-8 w-8 p-0 rounded-lg font-bold transition-all ${
                        status === 'CHECKED_ONSITE'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 ring-2 ring-emerald-500/30'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={status === 'CHECKED_ONSITE' ? 'إلغاء التحديد (تراجع)' : 'حل الواجب'}
                    >
                      ✓
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onManualRecord(student, 'NOT_SUBMITTED')}
                      className={`h-8 w-8 p-0 rounded-lg font-bold transition-all ${
                        status === 'NOT_SUBMITTED'
                          ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 ring-2 ring-rose-500/30'
                          : 'text-rose-600 hover:bg-rose-50'
                      }`}
                      title={status === 'NOT_SUBMITTED' ? 'إلغاء التحديد (تراجع)' : 'لم يحل'}
                    >
                      ✗
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
