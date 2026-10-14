'use client';

import React, { useEffect, useState } from 'react';
import { Server, Zap, RefreshCw, Activity, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
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
      const res = await apiClient<{ success: boolean; data: { success: boolean; data: ClusterStatusData } }>(
        '/system/cluster/status',
      );
      const payload = res?.data?.data || res?.data;
      if (payload) {
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
      toast.success(`تم تشغيل النسخة الثانية (Worker 2) بنجاح لمدة ${selectedDuration} دقيقة ⚡`);
      await fetchStatus();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تشغيل النسخة الثانية');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScaleDown = async () => {
    setActionLoading(true);
    try {
      await apiClient.post('/system/cluster/scale-down', {});
      toast.success('تم إيقاف النسخة الثانية والعودة للوضع الاقتصادي بنجاح');
      await fetchStatus();
    } catch (err: any) {
      toast.error(err?.message || 'فشل إيقاف النسخة الثانية');
    } finally {
      setActionLoading(false);
    }
  };

  const activeWorkers = data?.activeWorkersCount || 1;
  const isExamActive = Boolean(data?.examModeActive || activeWorkers > 1);
  const isSurgeActive = Boolean(data?.autoScaler?.surgeTriggered);
  const currentRps = data?.currentRps ?? 0;
  const rssMb = data?.memoryUsage?.rssMb || 280;
  const totalRamMb = 512;
  const ramPercent = Math.min(Math.round((rssMb / totalRamMb) * 100), 100);

  return (
    <div className="bg-white border border-neutral-200/90 rounded-2xl shadow-sm overflow-hidden transition-all">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl transition-all ${isExamActive ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-primary-50 text-primary-600'}`}>
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-neutral-800">محرك السيرفر ووضع الامتحانات والذروة</h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isSurgeActive
                    ? 'bg-rose-500 text-white shadow-sm animate-pulse'
                    : isExamActive
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isExamActive ? 'bg-white animate-ping' : 'bg-emerald-500'}`} />
                {isSurgeActive
                  ? 'تشغيل تلقائي لضغط الزيارات 🚀'
                  : isExamActive
                  ? 'وضع الذروة مضاعف (2 Workers)'
                  : 'الوضع الاقتصادي (Worker 1)'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              تعدد العمليات (In-Server Clustering) بمعدل استجابة فائق وتحجيم تلقائي مع ضغط الركوستات والامتحانات.
            </p>
          </div>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          title="تحديث البيانات"
          className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Body Stats */}
      <div className="p-5 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Workers */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-bold mb-1">
              <span>النسخ النشطة (Workers)</span>
              <Activity className="w-4 h-4 text-primary-500" />
            </div>
            <div className="text-2xl font-black text-neutral-800">
              {activeWorkers}{' '}
              <span className="text-xs font-medium text-neutral-400">من 2</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              {isExamActive ? 'النسختان تتقاسمان حركة المرور 50% / 50%' : 'نسخة واحدة كافية للأيام العادية'}
            </p>
          </div>

          {/* Live Request Rate (RPS) */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-bold mb-1">
              <span>معدل الطلبات اللحظي</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-neutral-800">
              {currentRps}{' '}
              <span className="text-xs font-medium text-neutral-400">طلب/ثانية</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              يبدأ التكبير التلقائي عند &gt; 25 طلب/ث
            </p>
          </div>

          {/* Memory Usage */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-bold mb-1">
              <span>استهلاك الرام الفعلي</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-neutral-800">
              {rssMb}{' '}
              <span className="text-xs font-medium text-neutral-400">/ {totalRamMb} MB</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-neutral-200 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  ramPercent > 80 ? 'bg-red-500' : ramPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${ramPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              مساحة أمان متوفرة: {totalRamMb - rssMb} MB ({100 - ramPercent}% حر)
            </p>
          </div>

          {/* Exam Mode / Auto-Scaler Trigger */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-bold mb-1">
              <span>التشغيل التلقائي (Auto-Scale)</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-sm font-bold text-neutral-800 mt-1">
              {isSurgeActive ? (
                <span className="text-rose-600">نشط بسبب ضغط الطلبات 🚀</span>
              ) : isExamActive ? (
                data?.examModeExpiresAt ? (
                  <span className="text-amber-600">
                    يعمل حتى {new Date(data.examModeExpiresAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span className="text-amber-600">وضع الذروة نشط</span>
                )
              ) : (
                <span className="text-emerald-600 font-semibold">مترقب (تلقائي 100%)</span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              تلقائياً عند الامتحانات أو زيادة الركوستات
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 sm:p-5 rounded-xl border border-neutral-200/80 bg-gradient-to-br from-neutral-50 to-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-neutral-800">
              {isExamActive ? 'إيقاف النسخة الثانية يدوياً' : 'تشغيل النسخة الثانية (Worker 2) يدوياً'}
            </h4>
            <p className="text-xs text-neutral-500">
              {isExamActive
                ? 'يمكنك إنهاء وضع الامتحانات الآن إذا انتهى الطلاب من حل الاختبارات لتوفير موارد السيرفر.'
                : 'شغّل النسخة الثانية عند إطلاق امتحان مفاجئ أو مراجعة نهائية كبرى لمضاعفة سرعة السيرفر.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {!isExamActive && (
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(Number(e.target.value))}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-neutral-300 bg-white text-neutral-700 outline-none focus:border-primary-500"
              >
                <option value={30}>مدة 30 دقيقة</option>
                <option value={60}>مدة 1 ساعة</option>
                <option value={120}>مدة 2 ساعة</option>
                <option value={180}>مدة 3 ساعات</option>
                <option value={360}>مدة 6 ساعات</option>
              </select>
            )}

            {isExamActive ? (
              <button
                onClick={handleScaleDown}
                disabled={actionLoading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-900 text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'جاري الإيقاف...' : '🛑 إيقاف Worker 2 (الوضع الاقتصادي)'}
              </button>
            ) : (
              <button
                onClick={handleScaleUp}
                disabled={actionLoading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                {actionLoading ? 'جاري التشغيل...' : '⚡ تفعيل وضع الامتحانات (تشغيل Worker 2)'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
