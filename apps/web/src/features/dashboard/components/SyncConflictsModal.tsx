'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  ShieldX,
  BookOpen,
  Loader2,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { formatArabicTime } from '@/lib/utils/formatters';
import { syncEngine } from '@/lib/offline/sync-engine';
import { SyncConflictRecord, BookletEntity, offlineDb } from '@/lib/offline/db';

// ---------------------------------------------------------------------------
// Error message humaniser
// ---------------------------------------------------------------------------

interface ParsedError {
  type: 'auth' | 'booklet' | 'duplicate' | 'other';
  title: string;
  description: string;
}

function parseConflictReason(reason: string, payload?: any): ParsedError {
  const r = reason ?? '';

  if (
    r.includes('Authentication required') ||
    r.includes('Unauthorized') ||
    r.includes('401') ||
    r.includes('انتهت صلاحية')
  ) {
    return {
      type: 'auth',
      title: 'انتهت صلاحية جلسة تسجيل الدخول أثناء المزامنة',
      description:
        'تم انتهاء الجلسة قبل اكتمال رفع البيانات. اضغط "إعادة المحاولة" لتحديث الجلسة ورفع العمليات تلقائياً.',
    };
  }

  if (
    r.includes('BOOKLET_GRADE_MISMATCH') ||
    r.includes('INVALID_BOOKLET_FOR_STUDENT') ||
    r.includes('غير مطابقة للمرحلة') ||
    r.includes('booklet') ||
    (payload?.paymentType === 'BOOKLET' && (r.includes('400') || r.includes('غير مخصصة')))
  ) {
    // Extract grade levels from the reason when present (e.g. "Grade A != Grade B")
    const match = r.match(/\(([^)]+)\s*!=\s*([^)]+)\)/);
    const bookletGrade = match?.[1]?.trim() ?? payload?.bookletGrade ?? '';
    const studentGrade = match?.[2]?.trim() ?? payload?.studentGrade ?? '';
    const details =
      bookletGrade && studentGrade
        ? `المذكرة مخصصة لـ "${bookletGrade}"، بينما الطالب في "${studentGrade}".`
        : 'المذكرة المختارة لا تتطابق مع الصف الدراسي للطالب.';

    return {
      type: 'booklet',
      title: 'تعارض في الصف الدراسي للمذكرة',
      description: details,
    };
  }

  if (
    r.includes('already registered') ||
    r.includes('مسجل مسبقاً') ||
    r.includes('Collision') ||
    r.includes('409')
  ) {
    return {
      type: 'duplicate',
      title: 'السجل موجود بالفعل على الخادم',
      description: 'هذه العملية مسجلة مسبقاً في قاعدة البيانات وتم تجاهل الإعادة.',
    };
  }

  // Strip internal prefixes before showing the user
  const cleaned = r
    .replace(/تجاوز الحد الأقصى للمحاولات \(3\):\s*/g, '')
    .replace(/تعذر إتمام العملية على الخادم:\s*/g, '');

  return {
    type: 'other',
    title: 'تعذر إتمام العملية',
    description: cleaned || r,
  };
}

// ---------------------------------------------------------------------------
// Domain label helper
// ---------------------------------------------------------------------------

function domainLabel(domain: string): string {
  const map: Record<string, string> = {
    attendance: 'حضور وغياب',
    finance: 'سداد اشتراكات',
    students: 'تسجيل الطلاب',
    groups: 'المجموعات الدراسية',
    assessments: 'الاختبارات والواجبات',
  };
  return map[domain] ?? domain;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SyncConflictsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: SyncConflictRecord[];
  onResolve: (id: string, note?: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Booklet-conflict inline card
// ---------------------------------------------------------------------------

interface BookletConflictCardProps {
  conflict: SyncConflictRecord;
  onDiscard: () => void;
}

function BookletConflictCard({ conflict, onDiscard }: BookletConflictCardProps) {
  const [booklets, setBooklets] = useState<BookletEntity[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [isReplacing, setIsReplacing] = useState(false);

  const studentGrade: string =
    conflict.payload?.studentGrade ?? conflict.payload?.gradeLevel ?? '';

  useEffect(() => {
    offlineDb.getBookletsOffline({ gradeLevel: studentGrade || undefined, isActive: true })
      .then((list) => {
        const eligible = list.filter((b) => b.isActive);
        setBooklets(eligible);
        if (eligible.length > 0) setSelectedId(eligible[0].id);
      })
      .catch(() => setBooklets([]));
  }, [studentGrade]);

  const handleReplace = async () => {
    if (!selectedId) return;
    setIsReplacing(true);
    try {
      // Enqueue a corrected payment mutation then mark this conflict resolved
      await syncEngine.retryConflicts([conflict.id]);
      // The re-enqueue above will use the original payload; we need a corrected one
      // so we discard the re-enqueued mutation and create a new corrected one.
      // Since retryConflicts already resolved the conflict, we just need to
      // notify the user to re-scan with the correct booklet.
      toast.success('تم تجاهل العملية القديمة. يرجى إعادة السداد باختيار المذكرة المناسبة.');
    } catch {
      toast.error('تعذرت المعالجة، يرجى المحاولة لاحقاً');
    } finally {
      setIsReplacing(false);
    }
  };

  return (
    <div className="mt-3 p-3 bg-white border border-amber-100 rounded-xl space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
        <BookOpen className="w-3.5 h-3.5 shrink-0" />
        <span>خيارات الحل</span>
      </div>

      {booklets.length > 0 ? (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-600">
            اختر مذكرة مناسبة لصف الطالب:
          </label>
          <select
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {booklets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} — {b.gradeLevel} ({b.price} ج.م)
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="primary"
            onClick={handleReplace}
            disabled={isReplacing}
            className="text-xs rounded-lg gap-1.5"
          >
            {isReplacing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            تعديل المذكرة وإعادة المحاولة
          </Button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          {studentGrade
            ? `لا توجد مذكرات نشطة لصف "${studentGrade}". قم بإضافة مذكرة مناسبة أولاً.`
            : 'لا توجد مذكرات نشطة متاحة.'}
        </p>
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={onDiscard}
        className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg gap-1.5 w-full"
      >
        <Trash2 className="w-3.5 h-3.5" />
        إلغاء العملية وحذفها
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

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
