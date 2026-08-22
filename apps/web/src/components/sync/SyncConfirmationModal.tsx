'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshCw,
  UploadCloud,
  Trash2,
  Clock,
  CheckCircle2,
  BookOpen,
  CreditCard,
  QrCode,
  Inbox,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { syncEngine, PendingActivityItem } from '@/lib/offline/sync-engine';

interface SyncConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSynced?: () => void;
  onDiscarded?: () => void;
}

const KIND_ICON: Record<PendingActivityItem['kind'], React.ElementType> = {
  BOOKLET_PAYMENT: BookOpen,
  TUITION_PAYMENT: CreditCard,
  ATTENDANCE_SCAN: QrCode,
  DELETED_RECORD: Trash2,
  OTHER: Inbox,
};

/**
 * Explicit reconnection confirmation modal. Rendered whenever the offline sync engine
 * detects the connection has been restored while mutations are still pending in the
 * outbox. Silent auto-syncing is disabled: automatic dispatching stays paused until
 * the user picks one of the three actions below.
 */
export function SyncConfirmationModal({ isOpen, onClose, onSynced, onDiscarded }: SyncConfirmationModalProps) {
  const [items, setItems] = useState<PendingActivityItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const activity = await syncEngine.getDetailedPendingActivity();
      setItems(activity);
      setSelectedIds(new Set(activity.map((i) => i.id)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen, loadItems]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allSelected = useMemo(() => items.length > 0 && selectedIds.size === items.length, [items, selectedIds]);

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  };

  const handleSyncNow = async () => {
    if (selectedIds.size === 0) {
      toast.error('برجاء اختيار عملية واحدة على الأقل للمزامنة');
      return;
    }
    setIsSyncing(true);
    try {
      const result = await syncEngine.confirmAndSync(Array.from(selectedIds));
      if (result.failed > 0) {
        toast.error(`تمت مزامنة ${result.synced} عملية، وتعذر رفع ${result.failed} عملية`);
      } else {
        toast.success(`تمت مزامنة ورفع ${result.synced} عملية بنجاح إلى السيرفر 🚀`);
      }
      onSynced?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء المزامنة، برجاء المحاولة لاحقاً');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDiscard = async () => {
    setIsDiscarding(true);
    try {
      const result = await syncEngine.discardAllLocalChanges();
      toast.success(`تم تجاهل وحذف ${result.discardedCount} عملية محلية وتحديث البيانات من السيرفر`);
      onDiscarded?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تجاهل العمليات المحلية');
    } finally {
      setIsDiscarding(false);
      setIsDiscardConfirmOpen(false);
    }
  };

  const handleReviewLater = () => {
    syncEngine.deferSyncConfirmation();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="sync-confirmation-modal"
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-150 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-l from-primary-800 via-primary-700 to-primary-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-2xl shrink-0">
              🔄
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight leading-tight">
                تم استعادة الاتصال بالإنترنت
              </h3>
              <p className="text-xs text-primary-100 font-medium">Internet Connection Restored</p>
            </div>
          </div>
          <p className="text-sm font-semibold mt-4 leading-relaxed text-primary-50">
            لديك ({items.length}) عمليات تمت أثناء انقطاع الإنترنت. هل ترغب في اعتمادها ورفعها إلى السيرفر الآن؟
          </p>
        </div>

        {/* Checklist */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <span className="text-xs font-bold text-slate-600">
            العمليات المحددة: {selectedIds.size} / {items.length}
          </span>
          <button
            onClick={toggleSelectAll}
            className="text-xs font-bold text-primary-700 hover:text-primary-900"
          >
            {allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-400 gap-2 text-sm font-semibold">
              <RefreshCw className="w-4 h-4 animate-spin" />
              جاري تحميل العمليات المعلقة...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-700">لا توجد عمليات معلقة</p>
            </div>
          ) : (
            items.map((item) => {
              const Icon = KIND_ICON[item.kind];
              return (
                <label
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-150 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelection(item.id)}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{item.title}</p>
                    <p className="text-xs text-slate-500 truncate">{item.subtitle}</p>
                  </div>
                  {typeof item.amount === 'number' && (
                    <span className="text-xs font-bold text-slate-600 shrink-0">
                      {item.amount.toLocaleString()} ج.م
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-2">
          <Button
            onClick={handleSyncNow}
            disabled={isSyncing || isDiscarding || items.length === 0}
            isLoading={isSyncing}
            className="w-full justify-center gap-2 rounded-xl font-bold"
          >
            <UploadCloud className="w-4 h-4" />
            مزامنة وحفظ العمليات الآن / Sync Now
          </Button>

          <Button
            variant="danger"
            onClick={() => setIsDiscardConfirmOpen(true)}
            disabled={isSyncing || isDiscarding || items.length === 0}
            className="w-full justify-center gap-2 rounded-xl font-bold"
          >
            <Trash2 className="w-4 h-4" />
            تجاهل وحذف العمليات المحلية / Discard Local Changes
          </Button>

          <Button
            variant="outline"
            onClick={handleReviewLater}
            disabled={isSyncing || isDiscarding}
            className="w-full justify-center gap-2 rounded-xl font-bold"
          >
            <Clock className="w-4 h-4" />
            تأجيل للمراجعة لاحقاً / Review Later
          </Button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isDiscardConfirmOpen}
        onClose={() => setIsDiscardConfirmOpen(false)}
        onConfirm={handleDiscard}
        variant="danger"
        title="تأكيد تجاهل العمليات المحلية"
        message="سيتم حذف جميع العمليات المحلية المعلقة نهائياً واستبدال البيانات المحلية بأحدث نسخة من السيرفر. هل أنت متأكد؟"
        confirmText="نعم، تجاهل وحذف"
        isLoading={isDiscarding}
      />
    </div>
  );
}
