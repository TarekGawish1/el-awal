'use client';

import React, { useEffect, useState } from 'react';
import { Gauge, Zap, RefreshCw, Activity, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface ClusterStatusData {
  mode: 'clustered' | 'standalone';
  primaryPid: number;
  currentWorkerId: string;
  activeWorkersCount: number;
  workers: Array<{ id: string; pid: number }>;
  examModeActive: boolean;
  examModeExpiresAt: string | null;
  currentRps?: number;
  autoScaler?: {
    enabled: boolean;
    surgeThresholdRps: number;
    surgeTriggered: boolean;
  };
  timestamp: string;
  memoryUsage?: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
  };
}

export function ServerClusterCard() {
  const [data, setData] = useState<ClusterStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(120);

  const fetchStatus = async () => {
    try {
      const res = await apiClient<any>('/system/cluster/status');
      const payload = res?.data?.data || res?.data || res;
      if (payload && (payload.mode || payload.activeWorkersCount !== undefined)) {
        setData(payload as ClusterStatusData);
      }
    } catch (err: any) {
      console.error('Failed to fetch cluster status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleScaleUp = async () => {
    setActionLoading(true);
    try {
      await apiClient.post('/system/cluster/scale-up', { durationMinutes: selectedDuration });
      toast.success(`تم تفعيل أقصى سرعة للمنصة بنجاح لمدة ${selectedDuration} دقيقة ⚡`);
      await fetchStatus();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تفعيل وضع السرعة القصوى');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScaleDown = async () => {
    setActionLoading(true);
    try {
      await apiClient.post('/system/cluster/scale-down', {});
      toast.success('تمت العودة للوضع القياسي الطبيعي بنجاح ✅');
      await fetchStatus();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر إيقاف وضع السرعة القصوى');
    } finally {
      setActionLoading(false);
    }
  };

  const activeWorkers = data?.activeWorkersCount || 1;
  const isExamActive = Boolean(data?.examModeActive || activeWorkers > 1);
  const isSurgeActive = Boolean(data?.autoScaler?.surgeTriggered);
  const currentRps = data?.currentRps ?? 0;
  const memory = data?.memoryUsage as any;
  const rssMb = memory?.rssMb || 260;
  const totalRamMb = memory?.totalRamMb || 1024;
  const safetyMargin =
    typeof memory?.safetyMarginPercent === 'number'
      ? memory.safetyMarginPercent
      : Math.max(0, 100 - Math.min(Math.round((rssMb / totalRamMb) * 100), 100));

  return (
    <div className="bg-white border border-neutral-200/90 rounded-2xl shadow-sm overflow-hidden transition-all">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-xl transition-all ${
              isExamActive
                ? 'bg-amber-100 text-amber-700 animate-pulse'
                : 'bg-primary-50 text-primary-600'
            }`}
          >
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-neutral-800">
                التحكم في سرعة المنصة وأداء الامتحانات
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isSurgeActive
                    ? 'bg-rose-500 text-white shadow-sm animate-pulse'
                    : isExamActive
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isExamActive ? 'bg-white animate-ping' : 'bg-emerald-500'
                  }`}
                />
                {isSurgeActive
                  ? 'تسريع تلقائي نشط لضغط الطلاب 🚀'
                  : isExamActive
                  ? '⚡ وضع أقصى سرعة وقوة نشط (مضاعف 200%)'
                  : 'الوضع القياسي (طاقة طبيعية 100%)'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              مضاعفة طاقة استيعاب المنصة أثناء الامتحانات والمراجعات الكبرى لمنع أي بطء وضمان تجربة فورية للطلاب.
            </p>
          </div>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          title="تحديث البيانات"
          className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Body Stats */}
      <div className="p-5 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Platform Capacity */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-bold mb-1">
              <span>طاقة عمل المنصة</span>
              <Activity className="w-4 h-4 text-primary-500" />
            </div>
            <div className="text-xl font-black text-neutral-800">
              {isExamActive ? (
                <span className="text-amber-600">مضاعفة (200%)</span>
              ) : (
                <span className="text-neutral-800">قياسية (100%)</span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              {isExamActive
                ? 'النظام يعمل بكامل طاقته لاستيعاب مئات الطلاب بالتوازي'
                : 'السرعة القياسية كافية ومثالية للأيام والمذكرات العادية'}
            </p>
          </div>

          {/* Live Student Traffic */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-bold mb-1">
              <span>نشاط الطلاب اللحظي</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-neutral-800">
              {currentRps}{' '}
              <span className="text-xs font-medium text-neutral-400">عملية/ثانية</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              يبدأ التسريع التلقائي عند زيادة الإقبال (&gt; 25 عملية/ث)
            </p>
          </div>

          {/* Platform Resource Stability */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-bold mb-1">
              <span>استقرار موارد المنصة</span>
              <ShieldCheck className={`w-4 h-4 ${safetyMargin < 20 ? 'text-amber-500' : 'text-emerald-500'}`} />
            </div>
            <div className="text-xl font-black text-neutral-800">
              {safetyMargin}%{' '}
              <span className="text-xs font-medium text-neutral-400">مساحة أمان متوفرة</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-neutral-200 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  safetyMargin < 15
                    ? 'bg-red-500'
                    : safetyMargin < 35
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${safetyMargin}%` }}
              />
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              حالة الخوادم مستقرة ومستعدة لاستقبال إقبال الطلاب
            </p>
          </div>

          {/* Auto-Speed Trigger */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-bold mb-1">
              <span>التسريع التلقائي الذكي</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-sm font-bold text-neutral-800 mt-1">
              {isSurgeActive ? (
                <span className="text-rose-600">نشط تلقائياً لزيادة إقبال الطلاب 🚀</span>
              ) : isExamActive ? (
                data?.examModeExpiresAt ? (
                  <span className="text-amber-600">
                    يعمل حتى{' '}
                    {new Date(data.examModeExpiresAt).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                ) : (
                  <span className="text-amber-600">وضع السرعة القصوى نشط</span>
                )
              ) : (
                <span className="text-emerald-600 font-semibold">مترقب وجاهز (تلقائي 100%)</span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              المنصة ترفع سرعتها تلقائياً عند أي إقبال مفاجئ
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 sm:p-5 rounded-xl border border-neutral-200/80 bg-gradient-to-br from-neutral-50 to-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-neutral-800">
              {isExamActive
                ? 'إنهاء وضع السرعة القصوى والعودة للوضع الطبيعي'
                : 'تفعيل السرعة القصوى للامتحانات والمراجعات يدوياً'}
            </h4>
            <p className="text-xs text-neutral-500">
              {isExamActive
                ? 'يمكنك العودة للوضع القياسي الآن بعد انتهاء موعد الامتحان أو خروج الطلاب لتوفير موارد الخادم.'
                : 'شغّل أقصى طاقة استيعاب للمنصة عند إطلاق امتحان مفاجئ أو مراجعة نهائية كبرى لضمان فتح الاختبارات فوراً لجميع الطلاب بدون أي انتظار.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {!isExamActive && (
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(Number(e.target.value))}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-neutral-300 bg-white text-neutral-700 outline-none focus:border-primary-500"
              >
                <option value={30}>لمدة 30 دقيقة</option>
                <option value={60}>لمدة 1 ساعة</option>
                <option value={120}>لمدة 2 ساعة (موصى بها)</option>
                <option value={180}>لمدة 3 ساعات</option>
                <option value={360}>لمدة 6 ساعات</option>
              </select>
            )}

            {isExamActive ? (
              <button
                onClick={handleScaleDown}
                disabled={actionLoading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-900 text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'جاري التبديل...' : '🛑 إنهاء وضع الذروة (الوضع القياسي)'}
              </button>
            ) : (
              <button
                onClick={handleScaleUp}
                disabled={actionLoading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                {actionLoading ? 'جاري التفعيل...' : '⚡ تفعيل أقصى سرعة للمنصة'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
