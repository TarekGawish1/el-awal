'use client';

import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { useWebPush } from '@/hooks/useWebPush';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import toast from 'react-hot-toast';

export function PushToggle() {
  const { isSupported, isSubscribed, isLoading, permission, isBrave, subscribe, unsubscribe } =
    useWebPush();
  const [isToggling, setIsToggling] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  if (!isSupported) return null;

  const isBusy = isLoading || isToggling;

  const handleToggle = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (permission === 'denied') {
      toast.error('تم حظر الإشعارات من إعدادات المتصفح. يرجى تفعيلها من إعدادات المتصفح.');
      return;
    }
    if (isBusy) return;

    setIsToggling(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } finally {
      setIsToggling(false);
    }
  };

  const handleSendTestPush = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSendingTest(true);
    try {
      const res = await apiClient<{ success: boolean; message: string; deliveredCount?: number }>(
        API_ENDPOINTS.NOTIFICATIONS.PUSH_TEST,
        { method: 'POST' }
      );
      if (res?.success) {
        toast.success(res.message || 'تم إرسال إشعار تجريبي بنجاح!');
      } else {
        toast.error(res?.message || 'تعذر إرسال الإشعار التجريبي');
      }
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء إرسال الإشعار التجريبي');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-2">
      <div
        onClick={handleToggle}
        role="switch"
        aria-checked={isSubscribed}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle(e);
          }
        }}
        className={`
          flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl transition-all duration-150 select-none
          ${isBusy || permission === 'denied' ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:bg-slate-100/80 active:scale-[0.99]'}
        `}
      >
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-700">الإشعارات الفورية</p>
          <div className="text-[11px] mt-0.5">
            {permission === 'denied' ? (
              <span className="text-rose-500 font-medium">محظورة في إعدادات المتصفح</span>
            ) : isSubscribed ? (
              <span className="text-emerald-600 font-semibold inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                شغالة ونشطة على هذا الجهاز
              </span>
            ) : isBusy ? (
              <span className="text-blue-500 font-medium">جارٍ تحديث حالة الإشعارات...</span>
            ) : (
              <span className="text-slate-400">اضغط لتفعيل الإشعارات</span>
            )}
          </div>
          {isBrave && !isSubscribed && permission === 'granted' && (
            <p className="text-[10px] text-amber-700 bg-amber-50/80 rounded px-1.5 py-0.5 mt-1.5 leading-normal font-medium border border-amber-200/60">
              تنبيه Brave: فعّل &quot;Use Google services for push messaging&quot; من إعدادات الخصوصية بالمتصفح.
            </p>
          )}
        </div>
        <div
          className={`
            relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 pointer-events-none shrink-0
            ${isSubscribed ? 'bg-blue-500' : 'bg-slate-300'}
          `}
          id="push-toggle"
          aria-label="تفعيل إشعارات المتصفح"
        >
          {isBusy ? (
            <Loader2 size={12} className="text-white animate-spin mx-auto" />
          ) : (
            <span
              className={`
                inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200
                ${isSubscribed ? 'translate-x-[18px]' : 'translate-x-[3px]'}
              `}
            />
          )}
        </div>
      </div>

      {isSubscribed && (
        <button
          type="button"
          disabled={isSendingTest}
          onClick={handleSendTestPush}
          className="w-full text-[11px] font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] border border-primary-100 disabled:opacity-50 cursor-pointer"
        >
          {isSendingTest ? (
            <>
              <Loader2 size={12} className="animate-spin text-primary-600" />
              <span>جارٍ إرسال الإشعار لجهازك...</span>
            </>
          ) : (
            <>
              <Send size={12} className="text-primary-600" />
              <span>إرسال إشعار تجريبي للتأكد من وصوله 🔔</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
