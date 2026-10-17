'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, GraduationCap, HeartHandshake } from 'lucide-react';
import { NotificationSystemSettings } from '@/hooks/useNotificationSettings';

export interface NotificationAudienceSwitchesProps {
  settings?: NotificationSystemSettings;
  handleToggle: (key: keyof NotificationSystemSettings, currentValue?: boolean) => void;
}

export function NotificationAudienceSwitches({
  settings,
  handleToggle,
}: NotificationAudienceSwitchesProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Users size={18} className="text-blue-600" />
          <span>قواطع الفئات المستهدفة (Teacher, Student, Parent Controls)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          يمكنك إيقاف أو تشغيل جميع الإشعارات الموجهة لفئة محددة من المستخدمين في النظام
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Teacher Switch */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <UserCheck size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">إشعارات المعلمين</h4>
              <p className="text-[11px] text-slate-500">الجداول والتنبيهات الموجهة للمعلم</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              handleToggle('teacherNotificationsEnabled', settings?.teacherNotificationsEnabled)
            }
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              settings?.teacherNotificationsEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-xs" />
          </button>
        </div>

        {/* Student Switch */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <GraduationCap size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">إشعارات الطلاب</h4>
              <p className="text-[11px] text-slate-500">الامتحانات والواجبات والتسجيل</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              handleToggle('studentNotificationsEnabled', settings?.studentNotificationsEnabled)
            }
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              settings?.studentNotificationsEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-xs" />
          </button>
        </div>

        {/* Parent Switch */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <HeartHandshake size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">إشعارات أولياء الأمور</h4>
              <p className="text-[11px] text-slate-500">تنبيهات الغياب والإيصالات والنتائج</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              handleToggle('parentNotificationsEnabled', settings?.parentNotificationsEnabled)
            }
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              settings?.parentNotificationsEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-xs" />
          </button>
        </div>
      </div>
    </div>
  );
}
