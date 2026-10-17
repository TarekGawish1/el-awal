'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  HeartHandshake,
  CreditCard,
  Users,
  GraduationCap,
  FileText,
  Calendar,
  UserCheck,
  Smartphone,
  Loader2,
  Send,
} from 'lucide-react';
import { NotificationSystemSettings } from '@/hooks/useNotificationSettings';

export interface NotificationCategorySwitchesProps {
  settings?: NotificationSystemSettings;
  userPhone?: string;
  updateSettings: any;
  handleToggle: (key: keyof NotificationSystemSettings, currentValue?: boolean) => void;
  isDispatchingSchedule: boolean;
  onTestDailySchedule: () => void;
}

export function NotificationCategorySwitches({
  settings,
  userPhone,
  updateSettings,
  handleToggle,
  isDispatchingSchedule,
  onTestDailySchedule,
}: NotificationCategorySwitchesProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-900">
          التحكم التفصيلي في أنواع الإشعارات التلقائية
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          تخصيص الأحداث التي يتم إطلاق إشعارات تلقائية لها وتحديد المستلمين والقنوات
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Absences */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={18} />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h4 className="text-sm font-bold text-slate-800">
                  تنبيهات الغياب والحضور
                </h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                  <HeartHandshake size={11} />
                  المستلم: أولياء الأمور
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-200/80 text-slate-700">
                  واتساب + فوري + المنصة
                </span>
              </div>
              <p className="text-xs text-slate-500">
                إرسال إشعار فوري لولي الأمر عند تسجيل غياب الطالب في الحصة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              handleToggle('absenceAlertsEnabled', settings?.absenceAlertsEnabled)
            }
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
              settings?.absenceAlertsEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-xs" />
          </button>
        </div>

        {/* Payments */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <CreditCard size={18} />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h4 className="text-sm font-bold text-slate-800">
                  إيصالات السداد والاشتراكات
                </h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <Users size={11} />
                  المستلم: الطلاب وأولياء الأمور
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-200/80 text-slate-700">
                  واتساب + فوري + المنصة
                </span>
              </div>
              <p className="text-xs text-slate-500">
                إرسال تفاصيل السند والمبلغ المستلم عند تسجيل دفع اشتراك أو ملزمة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              handleToggle('paymentAlertsEnabled', settings?.paymentAlertsEnabled)
            }
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
              settings?.paymentAlertsEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-xs" />
          </button>
        </div>

        {/* Student Approvals & Credentials */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <GraduationCap size={18} />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h4 className="text-sm font-bold text-slate-800">
                  اعتماد تسجيل الطلاب وبيانات الحساب
                </h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                  <GraduationCap size={11} />
                  المستلم: الطلاب
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-200/80 text-slate-700">
                  واتساب + فوري + المنصة
                </span>
              </div>
              <p className="text-xs text-slate-500">
                إرسال كود الطالب وبيانات تسجيل الدخول فور قبول طلب الانضمام
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              handleToggle(
                'studentApprovalAlertsEnabled',
                settings?.studentApprovalAlertsEnabled,
              )
            }
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
              settings?.studentApprovalAlertsEnabled
                ? 'bg-blue-600 justify-end'
                : 'bg-slate-300 justify-start'
            }`}
          >
            <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-xs" />
          </button>
        </div>

        {/* Exams & Assessments */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
              <FileText size={18} />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h4 className="text-sm font-bold text-slate-800">
                  إشعارات الامتحانات والواجبات
                </h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">
                  <GraduationCap size={11} />
                  المستلم: الطلاب
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-200/80 text-slate-700">
                  إشعار فوري + المنصة
                </span>
              </div>
              <p className="text-xs text-slate-500">
                تنبيه الطلاب بالاختبارات المنشورة ونتائج التصحيح
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              handleToggle('examAlertsEnabled', settings?.examAlertsEnabled)
            }
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
              settings?.examAlertsEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-xs" />
          </button>
        </div>

        {/* Teacher Daily Schedule */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col gap-3.5 md:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar size={18} />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h4 className="text-sm font-bold text-slate-800">
                    الجدول اليومي الصباحي للمعلم
                  </h4>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-800">
                    <UserCheck size={11} />
                    المستلم: المعلم
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-200/80 text-slate-700">
                    واتساب + فوري + المنصة
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  إرسال ملخص الحصص والمجموعات المجدولة يومياً الساعة 07:00 صباحاً عبر الواتساب والإشعار الفوري
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                handleToggle(
                  'teacherDailyScheduleEnabled',
                  settings?.teacherDailyScheduleEnabled,
                )
              }
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                settings?.teacherDailyScheduleEnabled
                  ? 'bg-blue-600 justify-end'
                  : 'bg-slate-300 justify-start'
              }`}
            >
              <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </button>
          </div>

          {/* Teacher WhatsApp Number Field & Test Trigger Button */}
          <div className="pt-2.5 border-t border-slate-200/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Smartphone size={14} className="text-teal-600 shrink-0" />
              <span>رقم هاتف المعلم لاستلام جدول الصباح عبر الواتساب:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <input
                type="tel"
                dir="ltr"
                defaultValue={settings?.teacherRecipientPhone || userPhone || ''}
                key={settings?.teacherRecipientPhone || userPhone || 'phone'}
                placeholder={userPhone || '010xxxxxxxx'}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val !== (settings?.teacherRecipientPhone || '')) {
                    updateSettings.mutate({ teacherRecipientPhone: val });
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 w-full sm:w-44"
              />
              <button
                type="button"
                disabled={isDispatchingSchedule}
                onClick={onTestDailySchedule}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-medium text-xs shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
              >
                {isDispatchingSchedule ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>إرسال جدول اليوم الآن (تجربة)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
