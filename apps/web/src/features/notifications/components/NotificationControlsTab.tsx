'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, QrCode } from 'lucide-react';
import { NotificationSystemSettings } from '@/hooks/useNotificationSettings';
import { NotificationChannelSwitches } from './controls/NotificationChannelSwitches';
import { NotificationAudienceSwitches } from './controls/NotificationAudienceSwitches';
import { NotificationCategorySwitches } from './controls/NotificationCategorySwitches';

export interface NotificationControlsTabProps {
  settings?: NotificationSystemSettings;
  isSettingsLoading: boolean;
  isWABanned: boolean;
  isWAConnected: boolean;
  isWAWaitingQR: boolean;
  whatsAppStatus: any;
  userPhone?: string;
  updateSettings: any;
  handleToggle: (key: keyof NotificationSystemSettings, currentValue?: boolean) => void;
  onOpenWhatsAppModal: () => void;
  isDispatchingSchedule: boolean;
  onTestDailySchedule: () => void;
}

export function NotificationControlsTab({
  settings,
  isSettingsLoading,
  isWABanned,
  isWAConnected,
  isWAWaitingQR,
  whatsAppStatus,
  userPhone,
  updateSettings,
  handleToggle,
  onOpenWhatsAppModal,
  isDispatchingSchedule,
  onTestDailySchedule,
}: NotificationControlsTabProps) {
  return (
    <div className="space-y-6">
      {/* Urgent WhatsApp Status Alert Banner */}
      {isWABanned && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-red-500"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <AlertTriangle size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black flex items-center gap-2">
                <span>🚨 تنبيه هام: تم حظر رقم الواتساب المرتبط بالمنصة من قِبل شركة واتساب</span>
              </h3>
              <p className="text-xs text-red-100 mt-1 leading-relaxed">
                {whatsAppStatus?.banReason || 'تم اكتشاف حظر الحساب لمنع إرسال الرسائل.'}
                {' '}| مدة الحظر المؤقت عادة 24 إلى 48 ساعة. لضمان وصول الرسائل لأولياء الأمور يرجى ربط رقم بديل الآن.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenWhatsAppModal}
            className="px-4 py-2.5 bg-white text-red-700 hover:bg-red-50 text-xs font-black rounded-xl shadow-md transition-all shrink-0 self-stretch md:self-auto text-center cursor-pointer"
          >
            فك الارتباط وربط رقم جديد الآن ⚡
          </button>
        </motion.div>
      )}

      {!isWABanned && isWAWaitingQR && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-amber-400"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <QrCode size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span>📱 خط الواتساب غير مقترن حالياً (في انتظار مسح رمز الـ QR)</span>
              </h3>
              <p className="text-xs text-amber-100 mt-1 leading-relaxed">
                رسائل الواتساب معلقة مؤقتاً حتى يتم ربط الهاتف. يرجى مسح رمز الاستجابة السريعة لمتابعة الإرسال التلقائي.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenWhatsAppModal}
            className="px-4 py-2.5 bg-white text-amber-800 hover:bg-amber-50 text-xs font-bold rounded-xl shadow-md transition-all shrink-0 self-stretch md:self-auto text-center cursor-pointer"
          >
            مسح رمز الاستجابة السريعة (QR) الآن 📲
          </button>
        </motion.div>
      )}

      {/* Section 1: Global Channel Kill-Switches */}
      <NotificationChannelSwitches
        settings={settings}
        isSettingsLoading={isSettingsLoading}
        isWABanned={isWABanned}
        isWAConnected={isWAConnected}
        isWAWaitingQR={isWAWaitingQR}
        whatsAppStatus={whatsAppStatus}
        updateSettings={updateSettings}
        handleToggle={handleToggle}
        onOpenWhatsAppModal={onOpenWhatsAppModal}
      />

      {/* Section 2: Target Audience Switches */}
      <NotificationAudienceSwitches
        settings={settings}
        handleToggle={handleToggle}
      />

      {/* Section 3: Granular Category Settings */}
      <NotificationCategorySwitches
        settings={settings}
        userPhone={userPhone}
        updateSettings={updateSettings}
        handleToggle={handleToggle}
        isDispatchingSchedule={isDispatchingSchedule}
        onTestDailySchedule={onTestDailySchedule}
      />
    </div>
  );
}
