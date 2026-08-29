'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  MessageSquare,
  Smartphone,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  GraduationCap,
  FileText,
  Calendar,
  RefreshCw,
  CheckCheck,
  Search,
  Filter,
  Radio,
  Power,
  ShieldAlert,
  Loader2,
  ExternalLink,
  Users,
  UserCheck,
  HeartHandshake,
} from 'lucide-react';
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
  type NotificationSystemSettings,
} from '@/hooks/useNotificationSettings';
import {
  useInfiniteNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
  type Notification,
} from '@/hooks/useNotifications';
import { WhatsAppConnectionManager } from '@/components/admin/WhatsAppConnectionManager';
import { useAuth } from '@/features/auth';

export default function NotificationCenterPage() {
  const [activeTab, setActiveTab] = useState<'controls' | 'feed'>('controls');
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [readFilter, setReadFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'TEACHER' | 'STUDENT' | 'PARENT'>('ALL');

  const { data: settings, isLoading: isSettingsLoading } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();

  const {
    data: infiniteFeedData,
    isLoading: isFeedLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchFeed,
  } = useInfiniteNotifications({
    scope: 'all',
    role: roleFilter !== 'ALL' ? roleFilter : undefined,
  });

  const { data: unreadData } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const { user } = useAuth();

  const unreadCount = unreadData?.unreadCount ?? 0;
  const notifications = infiniteFeedData?.pages.flatMap((page) => page.data) ?? [];

  const filteredNotifications = notifications.filter((item) => {
    if (readFilter === 'UNREAD' && item.isRead) return false;
    if (readFilter === 'READ' && !item.isRead) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q) ||
        item.recipient?.fullName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleToggle = (key: keyof NotificationSystemSettings, currentValue?: boolean) => {
    updateSettings.mutate({ [key]: !currentValue });
  };

  const getRecipientBadge = (recipient?: { fullName: string; role: string }) => {
    if (!recipient) return null;
    switch (recipient.role) {
      case 'STUDENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
            <GraduationCap size={12} />
            <span>الطالب: {recipient.fullName}</span>
          </span>
        );
      case 'PARENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
            <HeartHandshake size={12} />
            <span>ولي الأمر: {recipient.fullName}</span>
          </span>
        );
      case 'TEACHER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <UserCheck size={12} />
            <span>المعلم: {recipient.fullName}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
            <span>{recipient.fullName}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sliders size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                مركز التحكم في الإشعارات والرسائل
              </h1>
              <p className="text-xs text-slate-500">
                إدارة تشغيل وإيقاف قنوات الإرسال وفلترة الإشعارات للمعلم والطلاب وأولياء الأمور
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-xl self-stretch md:self-auto">
          <button
            onClick={() => setActiveTab('controls')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'controls'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Power size={14} />
            <span>قواطع القنوات والفئات</span>
          </button>
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all relative ${
              activeTab === 'feed'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell size={14} />
            <span>سجل الإشعارات المباشر</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold bg-red-500 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Tab View */}
      {activeTab === 'controls' ? (
        <div className="space-y-6">
          {/* Section 1: Master System Switches */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Power size={16} className="text-blue-600" />
              <span>القواطع العامة لقنوات الإرسال (Master Channels)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* WhatsApp Master Switch */}
              <motion.div
                layout
                className={`rounded-2xl p-6 border transition-all relative overflow-hidden flex flex-col justify-between ${
                  settings?.isWhatsAppEnabled
                    ? 'bg-gradient-to-br from-emerald-50/70 via-white to-white border-emerald-200/80 shadow-sm'
                    : 'bg-gradient-to-br from-red-50/70 via-white to-white border-red-200/80 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        settings?.isWhatsAppEnabled
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                          : 'bg-red-500 text-white shadow-md shadow-red-500/20'
                      }`}
                    >
                      <Smartphone size={24} />
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        settings?.isWhatsAppEnabled
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {settings?.isWhatsAppEnabled ? 'واتساب مفعّل' : 'واتساب متوقف بالكامل'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    قاطع رسائل الواتساب العام
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    إيقاف أو تشغيل جميع رسائل الواتساب الصادرة من النظام بالكامل (الغياب، الفواتير، بيانات الدخول، وغيرها).
                  </p>

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
                    onClick={() => setIsWhatsAppModalOpen(true)}
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

          {/* Section 2: Target Audience Switches (المعلم، الطلاب، أولياء الأمور) */}
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

          {/* Section 3: Granular Category Settings */}
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
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between gap-4 md:col-span-2">
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
                        إشعار فوري + المنصة
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      إرسال ملخص الحصص والمجموعات المجدولة في بداية اليوم للمعلم
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
            </div>
          </div>
        </div>
      ) : (
        /* Notification Feed Tab */
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
          {/* Top filter toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="بحث في العنوان، المحتوى، أو اسم المستلم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            {/* Audience Role Filter & Read Filter */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Role filter buttons */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setRoleFilter('ALL')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    roleFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setRoleFilter('TEACHER')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    roleFilter === 'TEACHER' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  المعلم
                </button>
                <button
                  onClick={() => setRoleFilter('STUDENT')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    roleFilter === 'STUDENT' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  الطلاب
                </button>
                <button
                  onClick={() => setRoleFilter('PARENT')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    roleFilter === 'PARENT' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  أولياء الأمور
                </button>
              </div>

              {/* Read/Unread filter buttons */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setReadFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    readFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  جميع الحالات
                </button>
                <button
                  onClick={() => setReadFilter('UNREAD')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    readFilter === 'UNREAD' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  غير مقروء ({unreadCount})
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors"
                >
                  <CheckCheck size={14} />
                  <span className="hidden sm:inline">تحديد الكل كمقروء</span>
                </button>
              )}

              <button
                onClick={() => refetchFeed()}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                title="تحديث السجل"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* List of notifications */}
          <div className="divide-y divide-slate-100">
            {isFeedLoading ? (
              <div className="py-16 text-center">
                <Loader2 className="animate-spin text-blue-500 mx-auto mb-2" size={24} />
                <p className="text-xs text-slate-400">جاري تحميل سجل الإشعارات...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-16 text-center">
                <Bell className="text-slate-300 mx-auto mb-2" size={32} />
                <p className="text-sm font-bold text-slate-700">لا توجد إشعارات مطابقة</p>
                <p className="text-xs text-slate-400 mt-1">
                  لم يتم العثور على أي إشعارات مطابقة لمعايير الفلترة الحالية.
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markRead.mutate(n.id)}
                  className={`p-4 flex items-start justify-between gap-4 transition-colors cursor-pointer rounded-xl my-1 ${
                    n.isRead ? 'bg-white hover:bg-slate-50/80' : 'bg-blue-50/40 hover:bg-blue-50/70'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        n.isRead ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      <Bell size={16} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4
                          className={`text-sm font-bold ${
                            n.isRead ? 'text-slate-700' : 'text-slate-900'
                          }`}
                        >
                          {n.title}
                        </h4>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
                        )}
                        {getRecipientBadge(n.recipient)}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-slate-400">
                          {new Date(n.createdAt).toLocaleString('ar-EG')}
                        </span>
                        {n.channels && n.channels.length > 0 && (
                          <span className="text-[10px] text-slate-400">
                            • القنوات: {n.channels.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!n.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead.mutate(n.id);
                      }}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-blue-100 text-blue-700 font-bold hover:bg-blue-200 transition-colors shrink-0"
                    >
                      تحديد كمقروء
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {notifications.length > 0 && (
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>تم عرض {filteredNotifications.length} إشعار</span>
                {hasNextPage && (
                  <span className="text-blue-600 font-medium">• يتوفر المزيد</span>
                )}
              </div>

              {hasNextPage ? (
                <button
                  type="button"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition-all flex items-center justify-center gap-2"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>جاري تحميل المزيد...</span>
                    </>
                  ) : (
                    <span>تحميل المزيد من الإشعارات السابقة</span>
                  )}
                </button>
              ) : (
                <span className="text-slate-400">تم تحميل جميع الإشعارات المتاحة</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* WhatsApp Connection Modal */}
      <WhatsAppConnectionManager
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
      />
    </div>
  );
}
