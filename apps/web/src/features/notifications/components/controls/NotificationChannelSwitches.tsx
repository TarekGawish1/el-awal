'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Smartphone,
  Radio,
  Bell,
  AlertTriangle,
  CheckCircle2,
  QrCode,
  ShieldAlert,
  Loader2,
  Power,
  ExternalLink,
} from 'lucide-react';
import { NotificationSystemSettings } from '@/hooks/useNotificationSettings';

export interface NotificationChannelSwitchesProps {
  settings?: NotificationSystemSettings;
  isSettingsLoading: boolean;
  isWABanned: boolean;
  isWAConnected: boolean;
  isWAWaitingQR: boolean;
  whatsAppStatus: any;
  updateSettings: any;
  handleToggle: (key: keyof NotificationSystemSettings, currentValue?: boolean) => void;
  onOpenWhatsAppModal: () => void;
}

export function NotificationChannelSwitches({
  settings,
  isSettingsLoading,
  isWABanned,
  isWAConnected,
  isWAWaitingQR,
  whatsAppStatus,
  updateSettings,
  handleToggle,
  onOpenWhatsAppModal,
}: NotificationChannelSwitchesProps) {
  return (
    <div className="space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Radio size={18} className="text-blue-600" />
          <span>القواطع العامة للقنوات (Global Channel Kill-Switches)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          يمكنك تعطيل أو تفعيل أي قناة إرسال بالكامل بنقرة واحدة في حالات الطوارئ أو الصيانة
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* WhatsApp Master Switch */}
        <motion.div
          layout
          className={`rounded-2xl p-6 border transition-all relative overflow-hidden flex flex-col justify-between ${
            isWABanned
              ? 'bg-gradient-to-br from-red-50/90 via-white to-white border-red-300 shadow-sm'
              : settings?.isWhatsAppEnabled
              ? 'bg-gradient-to-br from-emerald-50/70 via-white to-white border-emerald-200/80 shadow-sm'
              : 'bg-gradient-to-br from-red-50/70 via-white to-white border-red-200/80 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isWABanned
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30 animate-pulse'
                    : settings?.isWhatsAppEnabled
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-red-500 text-white shadow-md shadow-red-500/20'
                }`}
              >
                <Smartphone size={24} />
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  isWABanned
                    ? 'bg-red-600 text-white shadow-xs'
                    : settings?.isWhatsAppEnabled
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {isWABanned
                  ? 'محظور من واتساب'
                  : settings?.isWhatsAppEnabled
                  ? 'واتساب مفعّل'
                  : 'واتساب متوقف بالكامل'}
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              قاطع رسائل الواتساب العام
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              إيقاف أو تشغيل جميع رسائل الواتساب الصادرة من النظام بالكامل (الغياب، الفواتير، بيانات الدخول، وغيرها).
            </p>

            {/* Live WhatsApp Connection & Ban Status Indicator Box */}
            <div
              onClick={onOpenWhatsAppModal}
              className={`mb-4 p-3 rounded-xl border cursor-pointer transition-all ${
                isWABanned
                  ? 'bg-red-100/70 border-red-300 text-red-900 ring-2 ring-red-400/50'
                  : isWAConnected
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 hover:bg-emerald-100/60'
                  : isWAWaitingQR
                  ? 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/60'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-600">حالة خط الواتساب المباشرة:</span>
                {isWABanned ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-red-600 text-white">
                    <AlertTriangle size={11} />
                    <span>محظور (Banned)</span>
                  </span>
                ) : isWAConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white">
                    <CheckCircle2 size={11} />
                    <span>شغال ومتصل</span>
                  </span>
                ) : isWAWaitingQR ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white">
                    <QrCode size={11} />
                    <span>بانتظار مسح QR</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-500 text-white">
                    <span>غير متصل</span>
                  </span>
                )}
              </div>
              {isWABanned && (
                <p className="text-[11px] text-red-700 font-semibold leading-relaxed">
                  ⚠️ الرقم محظور من واتساب (مدة الحظر 24-48 ساعة). اضغط هنا لفك الارتباط وربط رقم جديد فوراً.
                </p>
              )}
              {isWAConnected && (
                <div className="text-[11px] text-emerald-800 font-medium flex items-center justify-between">
                  <span>الرقم المتصل:</span>
                  <span className="font-mono font-bold" dir="ltr">
                    {whatsAppStatus?.connectedNumber ? `+${whatsAppStatus.connectedNumber}` : 'جلسة نشطة'}
                  </span>
                </div>
              )}
              {isWAWaitingQR && (
                <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                  📱 الرقم غير مقترن حالياً - اضغط هنا لمسح رمز QR لربط الهاتف واستئناف الرسائل.
                </p>
              )}
              {!isWABanned && !isWAConnected && !isWAWaitingQR && (
                <p className="text-[11px] text-slate-600 font-medium">
                  جاري تهيئة الاتصال بخادم واتساب... اضغط لإدارة الجلسة.
                </p>
              )}
            </div>

            {!settings?.isWhatsAppEnabled && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs flex items-start gap-2">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <span>
                  رسائل الواتساب معطلة حالياً لن يتم إرسال أي رسالة لأي طالب أو ولي أمر.
                </span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100/80 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={updateSettings.isPending || isSettingsLoading}
              onClick={() =>
                handleToggle('isWhatsAppEnabled', settings?.isWhatsAppEnabled)
              }
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                settings?.isWhatsAppEnabled
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
              }`}
            >
              {updateSettings.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Power size={14} />
              )}
              <span>
                {settings?.isWhatsAppEnabled ? 'إيقاف رسائل الواتساب' : 'تفعيل رسائل الواتساب'}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenWhatsAppModal}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="إدارة ربط الباركود واتساب"
            >
              <ExternalLink size={16} />
            </button>
          </div>
        </motion.div>

        {/* Web Push Master Switch */}
        <motion.div
          layout
          className={`rounded-2xl p-6 border transition-all relative overflow-hidden flex flex-col justify-between ${
            settings?.isPushEnabled
              ? 'bg-gradient-to-br from-blue-50/70 via-white to-white border-blue-200/80 shadow-sm'
              : 'bg-gradient-to-br from-slate-50 via-white to-white border-slate-200 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  settings?.isPushEnabled
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-500 text-white'
                }`}
              >
                <Radio size={24} />
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  settings?.isPushEnabled
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {settings?.isPushEnabled ? 'الإشعارات الفورية مفعّلة' : 'الإشعارات الفورية متوقفة'}
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              قاطع الإشعارات الفورية (Web Push)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              إيقاف أو تشغيل إرسال إشعارات المتصفح والهاتف الفورية لجميع المستخدمين في النظام.
            </p>

            {!settings?.isPushEnabled && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-xs flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>
                  الإشعارات الفورية متوقفة حالياً لن تظهر إشعارات منبثقة على أجهزة المستخدمين.
                </span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100/80">
            <button
              type="button"
              disabled={updateSettings.isPending || isSettingsLoading}
              onClick={() =>
                handleToggle('isPushEnabled', settings?.isPushEnabled)
              }
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                settings?.isPushEnabled
                  ? 'bg-slate-800 hover:bg-slate-900 text-white shadow-sm'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              }`}
            >
              {updateSettings.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Power size={14} />
              )}
              <span>
                {settings?.isPushEnabled
                  ? 'إيقاف الإشعارات الفورية'
                  : 'تفعيل الإشعارات الفورية'}
              </span>
            </button>
          </div>
        </motion.div>

        {/* In-App Master Switch */}
        <motion.div
          layout
          className={`rounded-2xl p-6 border transition-all relative overflow-hidden flex flex-col justify-between ${
            settings?.isInAppEnabled
              ? 'bg-gradient-to-br from-indigo-50/70 via-white to-white border-indigo-200/80 shadow-sm'
              : 'bg-gradient-to-br from-slate-50 via-white to-white border-slate-200 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  settings?.isInAppEnabled
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-500 text-white'
                }`}
              >
                <Bell size={24} />
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  settings?.isInAppEnabled
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {settings?.isInAppEnabled ? 'إشعارات المنصة مفعّلة' : 'إشعارات المنصة متوقفة'}
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              قاطع إشعارات المنصة الداخلية (In-App)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              تسجيل وعرض الإشعارات داخل جرس الإشعارات في الواجهة لجميع مستخدمي المنصة.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100/80">
            <button
              type="button"
              disabled={updateSettings.isPending || isSettingsLoading}
              onClick={() =>
                handleToggle('isInAppEnabled', settings?.isInAppEnabled)
              }
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                settings?.isInAppEnabled
                  ? 'bg-slate-800 hover:bg-slate-900 text-white shadow-sm'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
              }`}
            >
              {updateSettings.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Power size={14} />
              )}
              <span>
                {settings?.isInAppEnabled ? 'إيقاف إشعارات المنصة' : 'تفعيل إشعارات المنصة'}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
