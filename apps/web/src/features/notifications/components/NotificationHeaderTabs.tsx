'use client';

import React from 'react';
import {
  Bell,
  Smartphone,
  Sliders,
  AlertTriangle,
  Radio,
} from 'lucide-react';

export type NotificationTab = 'controls' | 'whatsapp' | 'feed';

export interface NotificationHeaderTabsProps {
  activeTab: NotificationTab;
  setActiveTab: (tab: NotificationTab) => void;
  isWABanned: boolean;
  isWAWaitingQR: boolean;
  failedWaCount: number;
  unreadCount: number;
}

export function NotificationHeaderTabs({
  activeTab,
  setActiveTab,
  isWABanned,
  isWAWaitingQR,
  failedWaCount,
  unreadCount,
}: NotificationHeaderTabsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Bell className="text-blue-600" size={26} />
          <span>مركز التحكم في الإشعارات والواتساب</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          إدارة قنوات الإرسال المباشرة (الواتساب، الإشعارات الفورية، إشعارات المنصة)، إعدادات التنبيهات المخصصة، وسجل الرسائل.
        </p>
      </div>

      {/* Primary Tab Switcher */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl self-start sm:self-auto border border-slate-200/60 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'whatsapp'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Smartphone size={15} />
          <span>إدارة وإرسال الواتساب</span>
          {isWABanned ? (
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
          ) : isWAWaitingQR ? (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          ) : failedWaCount > 0 ? (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'whatsapp'
                  ? 'bg-white/20 text-white'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {failedWaCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('controls')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'controls'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Sliders size={15} />
          <span>قواطع القنوات والسياسات</span>
          {isWABanned && (
            <AlertTriangle size={13} className="text-red-400 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('feed')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'feed'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Radio size={15} />
          <span>سجل الإشعارات العام</span>
          {unreadCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'feed'
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
