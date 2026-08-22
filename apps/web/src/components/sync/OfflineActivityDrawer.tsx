'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  X,
  BookOpen,
  CreditCard,
  QrCode,
  Trash2,
  Undo2,
  Inbox,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { syncEngine, PendingActivityItem } from '@/lib/offline/sync-engine';

interface OfflineActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const KIND_STYLES: Record<
  PendingActivityItem['kind'],
  { icon: React.ElementType; dot: string; badge: string; label: string }
> = {
  BOOKLET_PAYMENT: {
    icon: BookOpen,
    dot: 'bg-purple-500',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    label: 'سداد مذكرة',
  },
  TUITION_PAYMENT: {
    icon: CreditCard,
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    label: 'اشتراك شهري',
  },
  ATTENDANCE_SCAN: {
    icon: QrCode,
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: 'رصد حضور',
  },
  DELETED_RECORD: {
    icon: Trash2,
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    label: 'سجل محذوف',
  },
  OTHER: {
    icon: Inbox,
    dot: 'bg-slate-400',
    badge: 'bg-slate-50 text-slate-600 border-slate-200',
    label: 'عملية أخرى',
  },
};

function formatTimestamp(ts: number): string {
  try {
    return new Date(ts).toLocaleString('ar-EG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return new Date(ts).toISOString();
  }
}

/**
 * Slide-over drawer listing every uncommitted local mutation (offline pending activity),
 * grouped by kind with an individual "Undo" action to instantly discard a single
 * mutation from the outbox and roll back its local IndexedDB side-effects.
 */
export function OfflineActivityDrawer({ isOpen, onClose }: OfflineActivityDrawerProps) {
  const [items, setItems] = useState<PendingActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const activity = await syncEngine.getDetailedPendingActivity();
      setItems(activity);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen, loadItems]);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((event) => {
      if (
        isOpen &&
        (event.type === 'MUTATION_ENQUEUED' ||
          event.type === 'MUTATION_UNDONE' ||
          event.type === 'SYNC_SUCCESS')
      ) {
        loadItems();
      }
    });
    return () => unsubscribe();
  }, [isOpen, loadItems]);

  const handleUndo = async (item: PendingActivityItem) => {
    setUndoingId(item.id);
    try {
      await syncEngine.undoMutation(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success('تم إلغاء العملية واستعادة الحالة السابقة محلياً ↩️');
    } catch (err: any) {
      toast.error(err?.message || 'تعذر إلغاء العملية، برجاء المحاولة مرة أخرى');
    } finally {
      setUndoingId(null);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[60] animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label="عرض العمليات المعلقة"
        className={`fixed inset-y-0 end-0 z-[70] w-full max-w-md bg-white shadow-2xl border-s border-slate-200 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-l from-purple-700 via-purple-600 to-purple-700 text-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-black tracking-tight">
              عرض العمليات المعلقة
            </h3>
            <p className="text-xs text-purple-100 font-medium mt-0.5">
              Pending Actions ({items.length})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-purple-100 hover:text-white transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-semibold">جاري تحميل العمليات...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-2">
              <Inbox className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-slate-700 text-sm">لا توجد عمليات معلقة حالياً</p>
              <p className="text-xs text-slate-400">جميع البيانات محفوظة ومتزامنة</p>
            </div>
          ) : (
            items.map((item) => {
              const style = KIND_STYLES[item.kind];
              const Icon = style.icon;
              const isUndoing = undoingId === item.id;
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-slate-150 bg-slate-50/60 hover:bg-slate-50 transition-colors flex items-start gap-3"
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white ${style.dot}`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badge}`}
                      >
                        {style.label}
                      </span>
                      {typeof item.amount === 'number' && (
                        <span className="text-[11px] font-bold text-slate-600">
                          {item.amount.toLocaleString()} ج.م
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-800 mt-1 truncate" title={item.title}>
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{item.subtitle}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {formatTimestamp(item.timestamp)}
                    </p>
                  </div>

                  <button
                    onClick={() => handleUndo(item)}
                    disabled={isUndoing}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 transition-colors disabled:opacity-50"
                    title="إلغاء العملية"
                  >
                    {isUndoing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Undo2 className="w-3.5 h-3.5" />
                    )}
                    <span>إلغاء العملية</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
