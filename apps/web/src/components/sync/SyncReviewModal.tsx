'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  DownloadCloud,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Users,
  GraduationCap,
  QrCode,
  DollarSign,
  X,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  syncEngine,
  OutboxSummary,
  IncomingDiffSummary,
} from '@/lib/offline/sync-engine';

interface SyncReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SyncReviewModal({ isOpen, onClose, onSuccess }: SyncReviewModalProps) {
  const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming'>('outgoing');
  const [outboxSummary, setOutboxSummary] = useState<OutboxSummary>({
    students: [],
    groups: [],
    attendanceCount: 0,
    paymentsCount: 0,
    totalCount: 0,
  });
  const [incomingDiff, setIncomingDiff] = useState<IncomingDiffSummary>({
    groups: { count: 0, items: [] },
    students: { count: 0, items: [] },
    attendance: { count: 0, items: [] },
    payments: { count: 0, items: [] },
    serverTime: new Date().toISOString(),
  });
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStageText, setSyncStageText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  const loadData = useCallback(async () => {
    const summary = await syncEngine.getPendingOutboxSummary();
    setOutboxSummary(summary);
    setAutoSyncEnabled(syncEngine.isAutoSyncEnabled());

    if (syncEngine.isOnline()) {
      setIsLoadingDiff(true);
      try {
        const diff = await syncEngine.getSyncDiff();
        setIncomingDiff(diff);
      } catch (err) {
        console.warn('Failed to load sync diff:', err);
      } finally {
        setIsLoadingDiff(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsComplete(false);
      setSyncProgress(0);
      setSyncStageText('');
      loadData();
    }
  }, [isOpen, loadData]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleToggleAutoSync = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.checked;
    setAutoSyncEnabled(newVal);
    syncEngine.setAutoSyncEnabled(newVal);
  };

  const handleExecuteSync = async () => {
    setIsExecuting(true);
    setSyncProgress(10);
    setSyncStageText('جاري تجهيز الاتصال...');

    try {
      await syncEngine.executeBidirectionalSync((progress, step) => {
        setSyncProgress(progress);
        setSyncStageText(step);
      });
      setIsComplete(true);
      setSyncProgress(100);
      setSyncStageText('تمت المزامنة بنجاح!');
      await loadData();
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 700);
    } catch (err: any) {
      setSyncStageText(`حدث خطأ أثناء المزامنة: ${err?.message || 'يرجى المحاولة لاحقاً'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  const totalIncomingCount =
    incomingDiff.groups.count +
    incomingDiff.students.count +
    incomingDiff.attendance.count +
    incomingDiff.payments.count;

  return (
    <div
      id="sync-review-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-review-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-150 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-primary-900 via-primary-800 to-primary-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-primary-200 shadow-inner">
              <RefreshCw className={`w-5 h-5 ${isExecuting ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 id="sync-review-modal-title" className="text-lg font-black tracking-tight">مراجعة المزامنة السحابية</h3>
              <p className="text-xs text-primary-200 font-medium">
                مطابقة البيانات ثنائية الاتجاه بين جهازك والخادم السحابي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-primary-200 hover:text-white transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar during sync */}
        {isExecuting && (
          <div className="bg-primary-50 px-6 py-3 border-b border-primary-100 space-y-2 animate-in fade-in">
            <div className="flex justify-between items-center text-xs font-bold text-primary-900">
              <span>{syncStageText}</span>
              <span>{syncProgress}%</span>
            </div>
            <div className="w-full bg-primary-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success Banner */}
        {isComplete && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-4 flex items-center gap-3 text-emerald-800 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>اكتملت المزامنة بنجاح! تم تحديث جميع السجلات والتخزين المحلي.</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/75 px-6 pt-3">
          <button
            onClick={() => setActiveTab('outgoing')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'outgoing'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>بيانات للرفع ({outboxSummary.totalCount})</span>
            {outboxSummary.totalCount > 0 && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0">
                جديد
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveTab('incoming')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'incoming'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DownloadCloud className="w-4 h-4" />
            <span>بيانات للتحميل ({totalIncomingCount})</span>
            {isLoadingDiff && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-sm">
          {activeTab === 'outgoing' ? (
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
                  <p className="font-bold text-slate-700">لا توجد عمليات محلية معلقة</p>
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
                        <span>طلاب جدد تم تسجيلهم ({outboxSummary.students.length}):</span>
                      </div>
                      <div className="divide-y divide-slate-200">
                        {outboxSummary.students.map((s) => (
                          <div key={s.id} className="py-2 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-bold text-slate-800">{s.fullName}</span>
                              <span className="text-slate-400 ms-2">{s.phone}</span>
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
                        <span>مجموعات جديدة تم إنشاؤها ({outboxSummary.groups.length}):</span>
                      </div>
                      <div className="divide-y divide-slate-200">
                        {outboxSummary.groups.map((g) => (
                          <div key={g.id} className="py-2 flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-800">{g.name}</span>
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
                        <span className="text-xs text-slate-500 block">حضور QR مسجل:</span>
                        <span className="font-bold text-slate-800 text-sm">
                          {outboxSummary.attendanceCount} تسجيل
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center gap-2.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="text-xs text-slate-500 block">مدفوعات واشتراكات:</span>
                        <span className="font-bold text-slate-800 text-sm">
                          {outboxSummary.paymentsCount} عملية
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
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
                  <p className="font-bold text-slate-700">بياناتك السحابية مطابقة تماماً</p>
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
                          <div key={g.id} className="text-xs flex justify-between text-slate-600">
                            <span className="font-semibold text-slate-800">{g.name}</span>
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
                          <div key={s.id} className="text-xs flex justify-between text-slate-600">
                            <span className="font-semibold text-slate-800">{s.fullName}</span>
                            <span>{s.groupName || s.studentCode}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSyncEnabled}
              onChange={handleToggleAutoSync}
              className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
            />
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>مزامنة تلقائية في الخلفية فور الاتصال</span>
          </label>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1 sm:flex-none rounded-xl text-xs font-bold"
            >
              {isComplete ? 'إغلاق' : 'تأجيل'}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleExecuteSync}
              disabled={isExecuting || isComplete}
              className="flex-1 sm:flex-none rounded-xl text-xs font-bold shadow-md shadow-primary-600/20 flex items-center justify-center gap-2"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري المزامنة...</span>
                </>
              ) : isComplete ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تمت المزامنة</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>تأكيد ومزامنة الآن</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
