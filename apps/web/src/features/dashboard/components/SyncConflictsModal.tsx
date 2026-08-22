'use client';

import React from 'react';
import { SyncConflictRecord } from '@/lib/offline/db';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { formatArabicTime } from '@/lib/utils/formatters';

interface SyncConflictsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: SyncConflictRecord[];
  onResolve: (id: string, note?: string) => Promise<void>;
}

export function SyncConflictsModal({
  isOpen,
  onClose,
  conflicts,
  onResolve,
}: SyncConflictsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">سجل تعارضات المزامنة</h3>
              <p className="text-xs text-slate-500">
                العمليات التي تعذر دمجها تلقائياً مع الخادم وتتطلب مراجعة المعلم
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {conflicts.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <div className="inline-flex p-3 rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                رائع! لا توجد أي تعارضات مزامنة معلقة حالياً.
              </p>
            </div>
          ) : (
            conflicts.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-amber-100 text-amber-800">
                        {c.domain === 'attendance'
                          ? 'حضور وغياب'
                          : c.domain === 'finance'
                            ? 'سداد اشتراكات'
                            : c.domain === 'students'
                              ? 'تسجيل الطلاب'
                              : c.domain === 'groups'
                                ? 'المجموعات الدراسية'
                                : c.domain === 'assessments'
                                  ? 'الاختبارات والواجبات'
                                  : c.domain}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatArabicTime(new Date(c.timestamp).toISOString())}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{c.reason}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-300 text-xs"
                    onClick={() => onResolve(c.id, 'تمت المراجعة والاعتماد')}
                  >
                    تجاهل / تم الحل
                  </Button>
                </div>
                {c.payload && (
                  <div className="bg-white/80 p-2.5 rounded-lg text-xs font-mono text-slate-600 border border-slate-100 overflow-x-auto">
                    <pre>{JSON.stringify(c.payload, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
          <Button variant="secondary" onClick={onClose} className="text-sm">
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
}
