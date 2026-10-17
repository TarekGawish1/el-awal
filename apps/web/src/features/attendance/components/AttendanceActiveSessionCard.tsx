'use client';

import React from 'react';
import { Clock, MapPin, QrCode, ClipboardCheck, ClipboardList } from 'lucide-react';
import { AttendanceReportCard } from './AttendanceReportCard';
import { getStageName, formatTime12h } from '../utils/attendanceFormatters';
import type { AttendanceTab } from '../hooks/useTeacherAttendancePage';

interface AttendanceActiveSessionCardProps {
  activeSessionObj: any;
  activeGroup: any;
  paramSessionId: string | null;
  report: any;
  isLoadingReport: boolean;
  isErrorReport: boolean;
  activeTab: AttendanceTab;
  onTabChange: (tab: AttendanceTab) => void;
}

export function AttendanceActiveSessionCard({
  activeSessionObj,
  activeGroup,
  paramSessionId,
  report,
  isLoadingReport,
  isErrorReport,
  activeTab,
  onTabChange,
}: AttendanceActiveSessionCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 w-2 h-full bg-primary-500"></div>
      <div className="p-5 pl-5 pr-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100">
              أنت تسجل حضور:
            </span>
            {activeGroup && (
              <span className="text-xs font-semibold text-slate-500">
                {getStageName(activeGroup.gradeLevel)}
              </span>
            )}
            {paramSessionId && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                مختارة من الجدول
              </span>
            )}
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            {report?.groupName || (activeGroup?.name || 'مجموعة دراسية')}
          </h2>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600 font-medium">
            {activeSessionObj?.startTime && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {formatTime12h(activeSessionObj.startTime)}
              </div>
            )}
            {activeGroup?.schedules?.[0]?.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {activeGroup.schedules[0].location}
              </div>
            )}
          </div>
        </div>

        {/* Inline Stats */}
        <div>
          {isLoadingReport ? (
            <div className="animate-pulse h-8 w-40 bg-slate-100 rounded-lg"></div>
          ) : isErrorReport ? (
            <div className="text-xs text-red-500 font-medium">فشل تحميل الإحصائيات</div>
          ) : report && (
            <div className="mb-0">
              <AttendanceReportCard metrics={report.metrics} />
            </div>
          )}
        </div>
      </div>

      {/* Segmented Control / Tabs */}
      <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
        <div className="flex p-1 bg-slate-200/50 rounded-xl max-w-md w-full">
          <button
            onClick={() => onTabChange('QR')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'QR'
                ? 'bg-white text-primary-700 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <QrCode className="w-4 h-4" />
            QR للحضور
          </button>
          <button
            onClick={() => onTabChange('QR_HOMEWORK')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'QR_HOMEWORK'
                ? 'bg-white text-primary-700 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            QR للواجب
          </button>
          <button
            onClick={() => onTabChange('LOGBOOK')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'LOGBOOK'
                ? 'bg-white text-primary-700 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            الدفتر الشامل
          </button>
        </div>
      </div>
    </div>
  );
}
