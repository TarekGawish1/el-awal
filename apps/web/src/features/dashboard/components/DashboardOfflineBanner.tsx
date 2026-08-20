'use client';

import React, { useState } from 'react';
import { WifiOff, RefreshCw, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { formatArabicTime } from '@/lib/utils/formatters';
import { useOfflineSync } from '@/lib/offline/use-offline-sync';
import { SyncConflictsModal } from './SyncConflictsModal';

export interface DashboardOfflineBannerProps {
  lastUpdatedTimestamp?: string;
  forceShow?: boolean;
  isOffline?: boolean;
}

export function DashboardOfflineBanner({
  lastUpdatedTimestamp,
  forceShow = false,
  isOffline: isOfflineProp,
}: DashboardOfflineBannerProps) {
  const {
    isOnline: isOnlineState,
    isSyncing,
    pendingCount,
    conflicts,
    lastSyncedAt,
    syncNow,
    resolveConflict,
  } = useOfflineSync();

  const [isConflictsOpen, setIsConflictsOpen] = useState(false);

  const isOffline = isOfflineProp !== undefined ? isOfflineProp : (!isOnlineState || !!lastUpdatedTimestamp);

  // If online, not explicitly offline, no pending mutations, and no conflicts, hide banner
  if (!isOffline && !forceShow && pendingCount === 0 && conflicts.length === 0) {
    return null;
  }

  return (
    <>
      <Alert
        variant={isOffline ? 'warning' : conflicts.length > 0 ? 'destructive' : 'info'}
        className={`shadow-xs transition-all ${
          isOffline
            ? 'bg-amber-50 border-amber-300 text-amber-900'
            : conflicts.length > 0
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-sky-50 border-sky-300 text-sky-900'
        }`}
      >
        <div className="flex items-center gap-3">
          {isOffline ? (
            <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
          ) : isSyncing ? (
            <RefreshCw className="w-5 h-5 text-sky-600 animate-spin shrink-0" />
          ) : conflicts.length > 0 ? (
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <AlertTitle className="text-sm font-bold flex items-center gap-2">
              {isOffline ? (
                <span>أنت تعمل حالياً في وضع عدم الاتصال (Offline Mode)</span>
              ) : isSyncing ? (
                <span>جاري مزامنة العمليات المحفوظة مع الخادم...</span>
              ) : conflicts.length > 0 ? (
                <span>توجد تعارضات في المزامنة تتطلب مراجعتك</span>
              ) : (
                <span>تم استعادة الاتصال بالإنترنت</span>
              )}

              {pendingCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
                  {pendingCount} عملية في الانتظار
                </span>
              )}
            </AlertTitle>

            <AlertDescription className="text-xs mt-0.5 opacity-90">
              {isOffline ? (
                <span>
                  يمكنك الاستمرار في مسح بطاقات الـ QR وتسجيل الحضور والاشتراكات. سيتم حفظ البيانات محلياً وإرسالها فور عودة الاتصال
                  {lastUpdatedTimestamp ? ` (آخر تحديث: ${formatArabicTime(lastUpdatedTimestamp)})` : ''}.
                </span>
              ) : isSyncing ? (
                <span>يتم الآن تفريغ صندوق العمليات المحفوظة ومزامنتها لحظياً...</span>
              ) : conflicts.length > 0 ? (
                <span>
                  تعذر دمج {conflicts.length} عملية تلقائياً بسبب تعديلات متضاربة على الخادم.
                </span>
              ) : (
                <span>
                  جميع التعديلات تم حفظها ومزامنتها بنجاح
                  {lastSyncedAt ? ` (${formatArabicTime(new Date(lastSyncedAt).toISOString())})` : ''}.
                </span>
              )}
            </AlertDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {conflicts.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsConflictsOpen(true)}
                className="text-xs border-rose-300 text-rose-800 hover:bg-rose-100 h-8"
              >
                عرض التعارضات ({conflicts.length})
              </Button>
            )}

            {!isOffline && isOnlineState && pendingCount > 0 && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => syncNow()}
                disabled={isSyncing}
                className="text-xs h-8 gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>مزامنة الآن</span>
              </Button>
            )}
          </div>
        </div>
      </Alert>

      <SyncConflictsModal
        isOpen={isConflictsOpen}
        onClose={() => setIsConflictsOpen(false)}
        conflicts={conflicts}
        onResolve={resolveConflict}
      />
    </>
  );
}
