'use client';

import React, { useState } from 'react';
import {
  Award,
  Clock,
  Flame,
  UserCheck,
  MapPin,
  Phone,
  GraduationCap,
  Users,
  ShieldCheck,
  MessageCircle,
} from 'lucide-react';
import { useStudentLeaderboard } from '../hooks/useAnalytics';
import { AnalyticsRange, StudentLeaderboardSort } from '../types/analytics.types';

interface StudentLeaderboardCardProps {
  range: AnalyticsRange;
  from?: string;
  to?: string;
}

export function StudentLeaderboardCard({ range, from, to }: StudentLeaderboardCardProps) {
  const [role, setRole] = useState<'STUDENT' | 'PARENT'>('STUDENT');
  const [sortBy, setSortBy] = useState<StudentLeaderboardSort>('duration');

  const { data, isLoading } = useStudentLeaderboard({
    role,
    sortBy,
    range,
    from,
    to,
    limit: 15,
  });

  const items = data?.students || [];

  const formatNumber = (num: number = 0) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const isParent = role === 'PARENT';

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs space-y-4">
      {/* Header & Role/Sort Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${isParent ? 'bg-purple-50 text-purple-600' : 'bg-amber-50 text-amber-600'}`}>
              {isParent ? <Users className="w-5 h-5" /> : <Award className="w-5 h-5" />}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">
              {isParent ? 'ترتيب نشاط ومتابعة أولياء الأمور' : 'ترتيب تفاعل ونشاط الطلاب (Leaderboard)'}
            </h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {isParent
              ? 'أولياء الأمور الأكثر دخولاً للمنصة ومتابعة لأداء ومستوى أبنائهم'
              : 'الطلاب الأكثر متابعة وحضوراً للمنصة وقضاءً للوقت في دراسة الحصص'}
          </p>
        </div>

        {/* Role Toggle: Students vs Parents */}
        <div className="inline-flex p-1 bg-neutral-100 rounded-xl border border-neutral-200/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setRole('STUDENT')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              role === 'STUDENT'
                ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-emerald-200'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            <span>الطلاب الأكثر تفاعلاً</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('PARENT')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              role === 'PARENT'
                ? 'bg-white text-purple-700 shadow-xs ring-1 ring-purple-200'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-600" />
            <span>أولياء الأمور الأكثر متابعة</span>
          </button>
        </div>
      </div>

      {/* Secondary Sort Row */}
      <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
        <span className="text-[11px] text-neutral-400 font-bold">
          عرض أعلى 15 {isParent ? 'ولي أمر' : 'طالب'} بحسب:
        </span>
        <div className="inline-flex p-0.5 bg-neutral-100/80 rounded-lg border border-neutral-200/50">
          <button
            type="button"
            onClick={() => setSortBy('duration')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              sortBy === 'duration'
                ? isParent ? 'bg-white text-purple-700 shadow-xs' : 'bg-white text-amber-700 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Clock className={`w-3 h-3 ${isParent ? 'text-purple-600' : 'text-amber-600'}`} />
            <span>الأكثر وقتاً وتواجداً</span>
          </button>

          <button
            type="button"
            onClick={() => setSortBy('visits')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              sortBy === 'visits'
                ? isParent ? 'bg-white text-purple-700 shadow-xs' : 'bg-white text-rose-700 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Flame className={`w-3 h-3 ${isParent ? 'text-purple-600' : 'text-rose-500'}`} />
            <span>الأكثر مرات دخول</span>
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
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-xs text-neutral-400">
          {isParent
            ? 'لا توجد بيانات تفاعل أو دخول لأولياء الأمور في هذه الفترة'
            : 'لا توجد بيانات تفاعل للطلاب في هذه الفترة'}
        </div>
      ) : (
        <div className="space-y-2.5 pt-1">
          {items.map((st) => {
            const isTop1 = st.rank === 1;
            const isTop2 = st.rank === 2;
            const isTop3 = st.rank === 3;

            const cleanPhone = st.phone ? st.phone.replace(/[^0-9]/g, '') : null;
            const waPhone = cleanPhone
              ? cleanPhone.startsWith('2')
                ? cleanPhone
                : `2${cleanPhone}`
              : null;

            return (
              <div
                key={st.userId}
                className={`p-3.5 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isTop1
                    ? isParent ? 'bg-purple-50/50 border-purple-200/90' : 'bg-amber-50/40 border-amber-200/80'
                    : isTop2
                    ? 'bg-neutral-50/80 border-neutral-200/80'
                    : isTop3
                    ? isParent ? 'bg-purple-50/20 border-purple-200/50' : 'bg-orange-50/30 border-orange-200/60'
                    : 'bg-white hover:bg-neutral-50/60 border-neutral-200/60'
                }`}
              >
                {/* Identity */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                      isTop1
                        ? isParent
                          ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-200'
                          : 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-200'
                        : isTop2
                        ? 'bg-neutral-400 text-white shadow-xs'
                        : isTop3
                        ? isParent
                          ? 'bg-purple-500 text-white'
                          : 'bg-amber-700/80 text-white'
                        : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {st.rank}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-neutral-900 truncate">
                        {st.studentName}
                      </p>

                      {isParent ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md">
                          ولي أمر
                        </span>
                      ) : (
                        st.gradeLevel && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md border border-emerald-100">
                            {st.gradeLevel}
                          </span>
                        )
                      )}
                    </div>

                    {/* Parent-specific child identity */}
                    {isParent && st.linkedStudentName && (
                      <div className="flex items-center gap-1.5 text-xs text-primary-800 bg-primary-50/80 px-2 py-0.5 rounded-md border border-primary-100 w-fit">
                        <GraduationCap className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                        <span className="text-[11px] font-medium">ولي أمر الطالب:</span>
                        <span className="text-[11px] font-bold">{st.linkedStudentName}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-neutral-500 flex-wrap">
                      {st.studentCode && (
                        <span className="font-mono text-[11px] text-neutral-400">
                          #{st.studentCode}
                        </span>
                      )}
                      {st.city && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1 text-[11px] text-neutral-600">
                            <MapPin className="w-3 h-3 text-neutral-400" />
                            <span>{st.city}</span>
                          </span>
                        </>
                      )}
                      {st.phone && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-[11px] text-neutral-500">
                            {st.phone}
                          </span>
                        </>
                      )}
                      {waPhone && (
                        <a
                          href={`https://wa.me/${waPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200 transition-colors"
                          title="مراسلة واتساب"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>واتساب</span>
                        </a>
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
                    <p className={`text-xs sm:text-sm font-black flex items-center gap-1 justify-end ${
                      isParent ? 'text-purple-700' : 'text-amber-700'
                    }`}>
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
