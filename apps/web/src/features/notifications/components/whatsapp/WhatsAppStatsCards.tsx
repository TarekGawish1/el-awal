'use client';

import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

interface WhatsAppStatsCardsProps {
  stats?: {
    failedCount?: number;
    queuedCount?: number;
    sentToday?: number;
    totalDelivered?: number;
  };
  isLoading: boolean;
}

export function WhatsAppStatsCards({ stats, isLoading }: WhatsAppStatsCardsProps) {
  const failedCount = stats?.failedCount ?? 0;
  const queuedCount = stats?.queuedCount ?? 0;
  const sentTodayCount = stats?.sentToday ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Sent Today */}
      <div className="bg-white rounded-2xl p-5 border border-emerald-100/80 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500">تم إرسالها اليوم بنجاح</span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={18} />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-emerald-950 font-mono">
            {isLoading ? '...' : sentTodayCount}
          </span>
          <span className="text-[11px] text-emerald-600 font-bold">رسالة</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">تراكمي منذ الساعة 00:00 بتوقيت القاهرة</p>
      </div>

      {/* Queued / Pending */}
      <div className="bg-white rounded-2xl p-5 border border-amber-100/80 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500">قيد الانتظار في الطابور</span>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={18} />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-amber-950 font-mono">
            {isLoading ? '...' : queuedCount}
          </span>
          <span className="text-[11px] text-amber-600 font-bold">في الطابور</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">تُرسل بفاصل أمان (4-7 ثوانٍ) لمنع الحظر</p>
      </div>

      {/* Failed */}
      <div
        className={`rounded-2xl p-5 border shadow-xs relative overflow-hidden transition-all ${
          failedCount > 0
            ? 'bg-red-50/40 border-red-200 ring-2 ring-red-400/20'
            : 'bg-white border-slate-100'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500">رسائل متعثرة / فشلت</span>
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              failedCount > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <AlertTriangle size={18} />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-2xl font-black font-mono ${
              failedCount > 0 ? 'text-red-700' : 'text-slate-900'
            }`}
          >
            {isLoading ? '...' : failedCount}
          </span>
          <span className={`text-[11px] font-bold ${failedCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
            رسالة
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          {failedCount > 0 ? 'تحتاج إلى إعادة إرسال بعد ربط الرقم' : 'لا توجد أي رسائل فاشلة حالياً'}
        </p>
      </div>

      {/* Total Delivered */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500">إجمالي الرسائل المستلمة</span>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900 font-mono">
            {isLoading ? '...' : stats?.totalDelivered ?? 0}
          </span>
          <span className="text-[11px] text-blue-600 font-bold">مستلمة بنجاح</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">تم تأكيد استلامها بعلامتي الصح الزرقاء</p>
      </div>
    </div>
  );
}
