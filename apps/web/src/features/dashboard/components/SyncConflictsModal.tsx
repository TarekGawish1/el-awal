'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  ShieldX,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { formatArabicTime } from '@/lib/utils/formatters';
import { syncEngine } from '@/lib/offline/sync-engine';
import { SyncConflictRecord } from '@/lib/offline/db';
import { parseConflictReason, domainLabel } from './conflicts/conflict-helpers';
import { BookletConflictCard } from './conflicts/BookletConflictCard';

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

export interface SyncConflictsModalProps {
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
  const [isRetrying, setIsRetrying] = useState(false);
  const [expandedBookletId, setExpandedBookletId] = useState<string | null>(null);

  // Count of re-tryable (auth) conflicts
  const authConflicts = conflicts.filter((c) => {
    const parsed = parseConflictReason(c.reason, c.payload);
    return parsed.type === 'auth';
  });

  const handleRetryAll = useCallback(async () => {
    setIsRetrying(true);
    try {
      const retried = await syncEngine.retryConflicts();
      if (retried > 0) {
        toast.success(`جاري إعادة مزامنة ${retried} عملية...`);
        onClose();
      } else {
        toast('لا توجد عمليات قابلة لإعادة المحاولة', { icon: 'ℹ️' });
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذرت إعادة المحاولة');
    } finally {
      setIsRetrying(false);
    }
  }, [onClose]);

  const handleDiscard = useCallback(
    async (id: string) => {
      await onResolve(id, 'إلغاء العملية يدوياً');
    },
    [onResolve],
  );

  useEffect(() => {
    if (!isOpen) setExpandedBookletId(null);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">سجل تعارضات المزامنة</h3>
              <p className="text-xs text-slate-500">
                {conflicts.length === 0
                  ? 'تمت معالجة جميع التعارضات'
                  : `${conflicts.length} عملية تتطلب مراجعة`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Retry All banner (only when there are re-tryable conflicts) */}
        {authConflicts.length > 0 && (
          <div className="px-5 py-3 bg-sky-50 border-b border-sky-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-sky-800">
              <ShieldX className="w-4 h-4 shrink-0 text-sky-600" />
              <span className="font-semibold">
                {authConflicts.length} عملية فشلت بسبب انتهاء الجلسة — يمكن إعادتها تلقائياً
              </span>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={handleRetryAll}
              disabled={isRetrying}
              className="shrink-0 text-xs gap-1.5 bg-sky-600 hover:bg-sky-700"
            >
              {isRetrying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              إعادة محاولة الكل ({authConflicts.length})
            </Button>
          </div>
        )}

        {/* Conflict list */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
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
            conflicts.map((c) => {
              const parsed = parseConflictReason(c.reason, c.payload);
              const isBooklet = parsed.type === 'booklet';
              const isExpanded = expandedBookletId === c.id;

              return (
                <div
                  key={c.id}
                  className={`p-4 rounded-xl border space-y-3 ${
                    parsed.type === 'auth'
                      ? 'border-sky-200 bg-sky-50/40'
                      : parsed.type === 'booklet'
                        ? 'border-amber-200 bg-amber-50/40'
                        : 'border-slate-200 bg-slate-50/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      {/* Domain badge + timestamp */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-slate-100 text-slate-700">
                          {domainLabel(c.domain)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatArabicTime(new Date(c.timestamp).toISOString())}
                        </span>
                        {parsed.type === 'auth' && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-100 text-sky-700">
                            انتهاء الجلسة
                          </span>
                        )}
                        {parsed.type === 'booklet' && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700">
                            تعارض مذكرة
                          </span>
                        )}
                      </div>

                      {/* Human-readable error */}
                      <p className="text-sm font-bold text-slate-800">{parsed.title}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{parsed.description}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isBooklet && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setExpandedBookletId(isExpanded ? null : c.id)
                          }
                          className="text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
                        >
                          {isExpanded ? 'إخفاء' : 'حل'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-300 text-xs"
                        onClick={() => handleDiscard(c.id)}
                      >
                        تجاهل
                      </Button>
                    </div>
                  </div>

                  {/* Booklet inline resolution */}
                  {isBooklet && isExpanded && (
                    <BookletConflictCard
                      conflict={c}
                      onDiscard={() => handleDiscard(c.id)}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          {conflicts.length > 0 && authConflicts.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryAll}
              disabled={isRetrying}
              className="text-xs gap-1.5"
            >
              {isRetrying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              إعادة محاولة الكل
            </Button>
          )}
          <div className="ms-auto">
            <Button variant="secondary" onClick={onClose} className="text-sm">
              إغلاق
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
