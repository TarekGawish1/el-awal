'use client';

import React, { useState } from 'react';
import { Award, Clock, Flame, UserCheck, MapPin, Phone, GraduationCap } from 'lucide-react';
import { useStudentLeaderboard } from '../hooks/useAnalytics';
import { AnalyticsRange, StudentLeaderboardSort } from '../types/analytics.types';

interface StudentLeaderboardCardProps {
  range: AnalyticsRange;
  from?: string;
  to?: string;
}

export function StudentLeaderboardCard({ range, from, to }: StudentLeaderboardCardProps) {
  const [sortBy, setSortBy] = useState<StudentLeaderboardSort>('duration');

  const { data, isLoading } = useStudentLeaderboard({
    sortBy,
    range,
    from,
    to,
    limit: 15,
  });

  const students = data?.students || [];

  const formatNumber = (num: number = 0) => {
    return new Intl.NumberFormat('ar-EG').format(num);
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs space-y-4">
      {/* Header & Sort Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">
              ترتيب تفاعل ونشاط الطلاب (Leaderboard)
            </h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            الطلاب الأكثر متابعة وحضوراً للمنصة وقضاءً للوقت في دراسة الحصص
          </p>
        </div>

        {/* Sort Switcher */}
        <div className="inline-flex p-1 bg-neutral-100 rounded-xl border border-neutral-200/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSortBy('duration')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              sortBy === 'duration'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>الأكثر وقتاً ونشاطاً</span>
          </button>

          <button
            type="button"
            onClick={() => setSortBy('visits')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              sortBy === 'visits'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>الأكثر زيارة وتكراراً</span>
          </button>
        </div>
      </div>

      {/* Content Table / List */}
      {isLoading ? (
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-neutral-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="py-12 text-center text-xs text-neutral-400">
          لا توجد بيانات تفاعل للطلاب في هذه الفترة
        </div>
      ) : (
        <div className="space-y-2.5 pt-1">
          {students.map((st) => {
            const isTop1 = st.rank === 1;
            const isTop2 = st.rank === 2;
            const isTop3 = st.rank === 3;

            return (
              <div
                key={st.userId}
                className={`p-3.5 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isTop1
                    ? 'bg-amber-50/40 border-amber-200/80'
                    : isTop2
                    ? 'bg-neutral-50/80 border-neutral-200/80'
                    : isTop3
                    ? 'bg-orange-50/30 border-orange-200/60'
                    : 'bg-white hover:bg-neutral-50/60 border-neutral-200/60'
                }`}
              >
                {/* Student Identity */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                      isTop1
                        ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-200'
                        : isTop2
                        ? 'bg-neutral-400 text-white shadow-xs'
                        : isTop3
                        ? 'bg-amber-700/80 text-white'
                        : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {st.rank}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-neutral-900 truncate">
                        {st.studentName}
                      </p>
                      {st.gradeLevel && (
                        <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-md">
                          {st.gradeLevel}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
                      <span className="font-mono text-[11px] text-neutral-400">
                        {st.studentCode}
                      </span>
                      {st.city && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1 text-[11px] text-neutral-600">
                            <MapPin className="w-3 h-3 text-neutral-400" />
                            <span>{st.city}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Engagement Stats */}
                <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-100">
                  {/* Sessions Count */}
                  <div className="text-start sm:text-end">
                    <p className="text-xs font-black text-neutral-900">
                      {formatNumber(st.totalSessions)}
                      <span className="text-[11px] font-medium text-neutral-400 mr-1">جلسة</span>
                    </p>
                    <p className="text-[10px] text-neutral-400">عدد مرات الدخول</p>
                  </div>

                  {/* Duration */}
                  <div className="text-end bg-white/90 sm:bg-transparent px-3 py-1.5 sm:p-0 rounded-lg border sm:border-0 border-neutral-100">
                    <p className="text-xs sm:text-sm font-black text-amber-700 flex items-center gap-1 justify-end">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{st.totalDurationFormatted}</span>
                    </p>
                    <p className="text-[10px] text-neutral-400">إجمالي وقت النشاط</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
