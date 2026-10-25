'use client';

import React from 'react';
import { Clock, Link as LinkIcon, Sparkles, UserCheck, Users } from 'lucide-react';

export interface JoiningStats {
  total: number;
  groupLinkCount: number;
  manualCount: number;
  latestDate: string | null;
}

interface JoiningStatsKpiCardsProps {
  stats: JoiningStats;
}

export function JoiningStatsKpiCards({ stats }: JoiningStatsKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
      {/* Total Students Card */}
      <div className="bg-gradient-to-br from-primary-50 to-primary-100/50 p-4 rounded-2xl border border-primary-200/60 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-primary-700">إجمالي الطلاب المسجلين</p>
          <p className="text-2xl font-black text-primary-950 mt-1">{stats.total} طالب</p>
          {stats.latestDate && (
            <p className="text-[11px] text-primary-600 mt-0.5 flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3" />
              آخر انضمام: {stats.latestDate}
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-sm">
          <Users className="w-6 h-6" />
        </div>
      </div>

      {/* Group Link Joins Card */}
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 rounded-2xl border border-emerald-200/60 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-emerald-700">انضمام عبر رابط المجموعة</p>
          <p className="text-2xl font-black text-emerald-950 mt-1">{stats.groupLinkCount} طالب</p>
          <p className="text-[11px] text-emerald-600 mt-0.5 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            روابط دعوة فورية
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
          <LinkIcon className="w-6 h-6" />
        </div>
      </div>

      {/* Manual Admin Joins Card */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100/70 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-600">تسجيل يدوي من الإدارة</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.manualCount} طالب</p>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium flex items-center gap-1">
            <UserCheck className="w-3 h-3" />
            المعلم والسكرتارية
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-slate-700 text-white flex items-center justify-center shadow-sm">
          <UserCheck className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
