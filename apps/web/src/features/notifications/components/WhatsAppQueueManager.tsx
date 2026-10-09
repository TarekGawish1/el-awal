'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Send,
  Loader2,
  Users,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Info,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  useWhatsAppStats,
  useWhatsAppQueue,
  useWhatsAppFailed,
  useRetryWhatsAppMessage,
  useRetryAllFailedWhatsApp,
  WhatsAppMessageLog,
} from '@/hooks/useWhatsAppQueue';

export function WhatsAppQueueManager() {
  const [activeSubTab, setActiveSubTab] = useState<'failed' | 'queue'>('failed');
  const [failedPage, setFailedPage] = useState(1);
  const [queuePage, setQueuePage] = useState(1);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);

  const { data: stats, isLoading: isStatsLoading, refetch: refetchStats } = useWhatsAppStats();
  const {
    data: queueData,
    isLoading: isQueueLoading,
    isFetching: isQueueFetching,
    refetch: refetchQueue,
  } = useWhatsAppQueue(queuePage, 15);
  const {
    data: failedData,
    isLoading: isFailedLoading,
    isFetching: isFailedFetching,
    refetch: refetchFailed,
  } = useWhatsAppFailed(failedPage, 15);

  const retrySingle = useRetryWhatsAppMessage();
  const retryAll = useRetryAllFailedWhatsApp();

  const handleRefreshAll = () => {
    refetchStats();
    refetchQueue();
    refetchFailed();
  };

  const getTemplateLabel = (templateType: string) => {
    switch (templateType) {
      case 'STUDENT_APPROVAL_CREDENTIALS':
      case 'STUDENT_REGISTRATION_CREDENTIALS':
        return { label: 'بيانات الحساب وتأكيد التسجيل', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'ABSENCE_ALERT_PARENT':
        return { label: 'تنبيه غياب طالب', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'PAYMENT_RECEIVED_PARENT':
        return { label: 'إيصال سداد رسوم', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'TEACHER_DAILY_SCHEDULE':
        return { label: 'جدول الحصص الصباحي للمعلم', color: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'ONLINE_EXAM_REMINDER':
        return { label: 'تذكير بامتحان', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'HOMEWORK_MISSING_PARENT':
        return { label: 'تنبيه واجب مدرسي', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: templateType || 'إشعار واتساب عام', color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const formatFailureReason = (reason?: string | null) => {
    if (!reason) return 'سبب غير محدد';
    if (reason.includes('not connected')) return 'خادم الواتساب غير متصل حالياً (انقطاع الاتصال)';
    if (reason.includes('not registered')) return 'هذا الرقم غير مسجل على تطبيق واتساب';
    if (reason.includes('timeout')) return 'مهلة الاتصال انتهت أثناء الإرسال';
    if (reason.includes('quota')) return 'تم بلوغ الحد الأقصى للإرسال مؤقتاً';
    return reason;
  };

  const failedCount = stats?.failedCount ?? 0;
  const queuedCount = stats?.queuedCount ?? 0;
  const sentTodayCount = stats?.sentToday ?? 0;

  return (
    <div className="space-y-6">
      {/* ── 1. Statistics Cards Overview ── */}
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
              {isStatsLoading ? '...' : sentTodayCount}
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
              {isStatsLoading ? '...' : queuedCount}
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
              {isStatsLoading ? '...' : failedCount}
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
              {isStatsLoading ? '...' : stats?.totalDelivered ?? 0}
            </span>
            <span className="text-[11px] text-blue-600 font-bold">مستلمة بنجاح</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">تم تأكيد استلامها بعلامتي الصح الزرقاء</p>
        </div>
      </div>

      {/* ── 2. Sub-tab Navigation & Actions Bar ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Toggle between Failed and Queue */}
        <div className="flex items-center gap-2 bg-slate-100/90 p-1.5 rounded-xl self-start sm:self-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('failed')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all relative ${
              activeSubTab === 'failed'
                ? 'bg-white text-red-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle size={14} className={failedCount > 0 ? 'text-red-500' : 'text-slate-400'} />
            <span>الرسائل الفاشلة والمطلوب إعادتها</span>
            {failedCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-black bg-red-600 text-white rounded-full">
                {failedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('queue')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all relative ${
              activeSubTab === 'queue'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock size={14} className="text-amber-500" />
            <span>طابور الإرسال قيد الانتظار</span>
            {queuedCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-black bg-amber-500 text-white rounded-full">
                {queuedCount}
              </span>
            )}
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {activeSubTab === 'failed' && failedCount > 0 && (
            <button
              type="button"
              disabled={retryAll.isPending}
              onClick={() => retryAll.mutate()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black shadow-md shadow-red-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {retryAll.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>جاري إعادة الجدولة...</span>
                </>
              ) : (
                <>
                  <RotateCcw size={14} />
                  <span>إعادة إرسال جميع الرسائل الفاشلة ({failedCount}) 🔁</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleRefreshAll}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            title="تحديث البيانات"
          >
            <RefreshCw
              size={15}
              className={isStatsLoading || isFailedFetching || isQueueFetching ? 'animate-spin' : ''}
            />
          </button>
        </div>
      </div>

      {/* ── 3. Main Content: Failed Messages List ── */}
      {activeSubTab === 'failed' && (
        <div className="space-y-4">
          {failedCount > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900">
              <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">نظام الحماية والأمان أثناء إعادة الإرسال:</span>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  عند الضغط على &quot;إعادة إرسال الكل&quot;، لن يتم إرسال الرسائل دفعة واحدة في ثانية واحدة حتى لا يتعرض الرقم للحظر من واتساب؛ بل تُعاد جدولتها تلقائياً عبر طابور الإرسال الآمن لتنطلق بالتتابع (فاصل 4 إلى 7 ثوانٍ بين كل رسالة).
                </p>
              </div>
            </div>
          )}

          {isFailedLoading ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-100">
              <Loader2 className="animate-spin text-blue-500 mx-auto mb-3" size={28} />
              <p className="text-xs text-slate-500">جاري تحميل الرسائل الفاشلة...</p>
            </div>
          ) : !failedData?.data || failedData.data.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-100 space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Sparkles size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800">لا توجد أي رسائل فاشلة حالياً 🎉</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                جميع رسائل الواتساب التي صدرت من المنصة تم إرسالها بنجاح دون أي تعثر.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {failedData.data.map((msg) => {
                const tmpl = getTemplateLabel(msg.templateType);
                const isExpanded = expandedMessageId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className="bg-white rounded-2xl p-5 border border-red-100 hover:border-red-200 shadow-2xs space-y-3 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">
                            {msg.recipientName || 'مستلم بدون اسم'}
                          </span>
                          <span
                            className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
                            dir="ltr"
                          >
                            +{msg.recipientPhone}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${tmpl.color}`}
                          >
                            {tmpl.label}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                            الدور: {msg.recipientRole === 'PARENT' ? 'ولي أمر' : msg.recipientRole === 'STUDENT' ? 'طالب' : 'معلم'}
                          </span>
                        </div>

                        {/* Failure reason badge */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-bold border border-red-100">
                            <AlertTriangle size={13} />
                            <span>سبب الفشل: {formatFailureReason(msg.failureReason)}</span>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            • عدد المحاولات: {msg.retryCount} / {msg.maxRetries}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            • الوقت: {new Date(msg.createdAt).toLocaleString('ar-EG')}
                          </span>
                        </div>
                      </div>

                      {/* Action Retry button */}
                      <div className="shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          disabled={retrySingle.isPending}
                          onClick={() => retrySingle.mutate(msg.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-xs"
                        >
                          <RotateCcw size={13} />
                          <span>إعادة الإرسال 🔄</span>
                        </button>
                      </div>
                    </div>

                    {/* Message Preview Collapsible */}
                    <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[11px] text-slate-500">نص الرسالة:</span>
                        <button
                          type="button"
                          onClick={() => setExpandedMessageId(isExpanded ? null : msg.id)}
                          className="text-[11px] text-blue-600 font-bold hover:underline"
                        >
                          {isExpanded ? 'إخفاء النص ▲' : 'عرض نص الرسالة بالكامل ▼'}
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-800 whitespace-pre-wrap font-sans text-xs leading-relaxed max-h-48 overflow-y-auto">
                          {msg.messageBody}
                        </div>
                      ) : (
                        <p className="mt-1 line-clamp-1 text-slate-500 text-[11px]">
                          {msg.messageBody}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Pagination Controls */}
              {failedData.totalPages > 1 && (
                <div className="pt-4 flex items-center justify-between border-t border-slate-100 text-xs text-slate-500">
                  <span>
                    صفحة {failedPage} من {failedData.totalPages} (إجمالي {failedData.total} رسالة)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={failedPage <= 1}
                      onClick={() => setFailedPage((p) => Math.max(1, p - 1))}
                      className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={failedPage >= failedData.totalPages}
                      onClick={() => setFailedPage((p) => Math.min(failedData.totalPages, p + 1))}
                      className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 4. Main Content: Pending Queue List ── */}
      {activeSubTab === 'queue' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3 text-xs text-blue-900">
            <Clock size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">آلية عمل طابور الإرسال الآمن:</span>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                الرسائل المعروضة هنا تنتظر دورها في الإرسال. يقوم السيرفر بمعالجة كل رسالة بدورها مع تطبيق تأخير بشري عشوائي وتفاعل كتابة (typing presence) لحماية الحساب من الكشف كـ Bot.
              </p>
            </div>
          </div>

          {isQueueLoading ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-100">
              <Loader2 className="animate-spin text-blue-500 mx-auto mb-3" size={28} />
              <p className="text-xs text-slate-500">جاري تحميل طابور الرسائل...</p>
            </div>
          ) : !queueData?.data || queueData.data.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-100 space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Clock size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800">طابور الانتظار فارغ حالياً ✨</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                لا توجد أي رسائل معلقة في الطابور. بمجرد قيامك بتسجيل غياب أو قبول طالب أو تسجيل اشتراك، ستظهر الرسائل هنا لحظياً قبل خروجها.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {queueData.data.map((msg) => {
                const tmpl = getTemplateLabel(msg.templateType);

                return (
                  <div
                    key={msg.id}
                    className="bg-white rounded-2xl p-5 border border-slate-100 shadow-2xs space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">
                            {msg.recipientName || 'مستلم بدون اسم'}
                          </span>
                          <span
                            className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
                            dir="ltr"
                          >
                            +{msg.recipientPhone}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${tmpl.color}`}
                          >
                            {tmpl.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span>
                            موعد الإرسال المتوقع:{' '}
                            <strong className="text-slate-600">
                              {new Date(msg.scheduledFor).toLocaleTimeString('ar-EG')}
                            </strong>
                          </span>
                          <span>• أُضيفت: {new Date(msg.createdAt).toLocaleTimeString('ar-EG')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                          <span>في الانتظار (Queued)</span>
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-1 pt-1 border-t border-slate-50">
                      {msg.messageBody}
                    </p>
                  </div>
                );
              })}

              {/* Queue Pagination */}
              {queueData.totalPages > 1 && (
                <div className="pt-4 flex items-center justify-between border-t border-slate-100 text-xs text-slate-500">
                  <span>
                    صفحة {queuePage} من {queueData.totalPages} (إجمالي {queueData.total} رسالة)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={queuePage <= 1}
                      onClick={() => setQueuePage((p) => Math.max(1, p - 1))}
                      className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={queuePage >= queueData.totalPages}
                      onClick={() => setQueuePage((p) => Math.min(queueData.totalPages, p + 1))}
                      className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
