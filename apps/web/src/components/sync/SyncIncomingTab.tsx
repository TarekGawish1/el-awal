import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { IncomingDiffSummary } from '@/lib/offline/sync-engine';

interface SyncIncomingTabProps {
  incomingDiff: IncomingDiffSummary;
  totalIncomingCount: number;
}

export function SyncIncomingTab({
  incomingDiff,
  totalIncomingCount,
}: SyncIncomingTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-700 text-xs">
          التحديثات المنشأة على الخادم بواسطة جلسات أخرى:
        </span>
        <span className="text-xs text-slate-400 font-medium">
          {totalIncomingCount} تحديث
        </span>
      </div>

      {totalIncomingCount === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-150 text-slate-500 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-primary-500 mx-auto" />
          <p className="font-bold text-slate-700">
            بياناتك السحابية مطابقة تماماً
          </p>
          <p className="text-xs text-slate-400">
            لم يتم تسجيل أي تعديلات خارجية جديدة على الخادم منذ آخر مزامنة.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {incomingDiff.groups.count > 0 && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                مجموعات محدثة على الخادم ({incomingDiff.groups.count}):
              </span>
              <div className="space-y-1">
                {incomingDiff.groups.items.map((g: any) => (
                  <div
                    key={g.id}
                    className="text-xs flex justify-between text-slate-600"
                  >
                    <span className="font-semibold text-slate-800">
                      {g.name}
                    </span>
                    <span>{g.gradeLevel}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {incomingDiff.students.count > 0 && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                طلاب محدثون على الخادم ({incomingDiff.students.count}):
              </span>
              <div className="space-y-1">
                {incomingDiff.students.items.map((s: any) => (
                  <div
                    key={s.id}
                    className="text-xs flex justify-between text-slate-600"
                  >
                    <span className="font-semibold text-slate-800">
                      {s.fullName}
                    </span>
                    <span>{s.groupName || s.studentCode}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
