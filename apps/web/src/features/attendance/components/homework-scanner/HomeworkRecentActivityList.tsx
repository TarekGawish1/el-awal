'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import type { RecentCheckedStudent, LastScanResult } from '../../hooks/useOnsiteHomeworkScanner';

interface HomeworkRecentActivityListProps {
  lastScanResult: LastScanResult | null;
  recentChecked: RecentCheckedStudent[];
}

export function HomeworkRecentActivityList({
  lastScanResult,
  recentChecked,
}: HomeworkRecentActivityListProps) {
  return (
    <div className="md:col-span-6 space-y-4">
      {/* Last Result Card */}
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
                {lastScanResult.success ? 'تم رصد الواجب والحضور بنجاح' : 'تعذر مسح الكود'}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {lastScanResult.message}
              </p>
              {lastScanResult.studentCode && (
                <span className="inline-block text-[11px] font-mono bg-white/70 px-2 py-0.5 rounded-md text-slate-700 mt-1 border border-slate-200">
                  كود الطالب: {lastScanResult.studentCode}
                </span>
              )}
            </div>
          </div>
        </Alert>
      )}

      {/* Recent Activity List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>الطلاب الذين تم تسليم واجبهم مؤخراً ({recentChecked.length})</span>
          </h4>
        </div>

        {recentChecked.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            لم يتم فحص أي واجب بعد في هذه الجلسة.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {recentChecked.map((item, idx) => (
              <div
                key={`${item.studentId}-${idx}`}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{item.studentName}</p>
                    {item.studentCode && (
                      <p className="text-[10px] text-slate-400 font-mono">{item.studentCode}</p>
                    )}
                  </div>
                </div>

                <div className="text-left">
                  <Badge variant="success" className="text-[10px] py-0.5 px-2 font-semibold">
                    حاضر + واصل
                  </Badge>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
