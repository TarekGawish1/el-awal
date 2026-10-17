import React from 'react';
import {
  GraduationCap,
  Users,
  QrCode,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { OutboxSummary } from '@/lib/offline/sync-engine';

interface SyncOutgoingTabProps {
  outboxSummary: OutboxSummary;
}

export function SyncOutgoingTab({ outboxSummary }: SyncOutgoingTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-700 text-xs">
          العمليات المسجلة محلياً في انتظار الرفع للسحابة:
        </span>
        <span className="text-xs text-slate-400 font-medium">
          {outboxSummary.totalCount} عنصر
        </span>
      </div>

      {outboxSummary.totalCount === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-150 text-slate-500 space-y-2">
          <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
          <p className="font-bold text-slate-700">
            لا توجد عمليات محلية معلقة
          </p>
          <p className="text-xs text-slate-400">
            تم رفع ومزامنة جميع تسجيلاتك المحلية السابقة بنجاح.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Students list */}
          {outboxSummary.students.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-2">
              <div className="flex items-center gap-2 text-primary-700 font-bold text-xs">
                <GraduationCap className="w-4 h-4" />
                <span>
                  طلاب جدد تم تسجيلهم ({outboxSummary.students.length}):
                </span>
              </div>
              <div className="divide-y divide-slate-200">
                {outboxSummary.students.map((s) => (
                  <div
                    key={s.id}
                    className="py-2 flex justify-between items-center text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">
                        {s.fullName}
                      </span>
                      <span className="text-slate-400 ms-2">
                        {s.phone}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {s.groupName || 'بدون مجموعة'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Groups list */}
          {outboxSummary.groups.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                <Users className="w-4 h-4" />
                <span>
                  مجموعات جديدة تم إنشاؤها (
                  {outboxSummary.groups.length}):
                </span>
              </div>
              <div className="divide-y divide-slate-200">
                {outboxSummary.groups.map((g) => (
                  <div
                    key={g.id}
                    className="py-2 flex justify-between items-center text-xs"
                  >
                    <span className="font-bold text-slate-800">
                      {g.name}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {g.monthlyFee} ج.م / شهر
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attendance and payments summary badges */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center gap-2.5">
              <QrCode className="w-4 h-4 text-purple-600" />
              <div>
                <span className="text-xs text-slate-500 block">
                  حضور QR مسجل:
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {outboxSummary.attendanceCount} تسجيل
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center gap-2.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-xs text-slate-500 block">
                  مدفوعات واشتراكات:
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {outboxSummary.paymentsCount} عملية
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
