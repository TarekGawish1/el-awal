'use client';

import React from 'react';
import { UserCheck, GraduationCap, Users, Globe, ArrowLeft } from 'lucide-react';

interface AnalyticsRoleCardsProps {
  isLoading: boolean;
  selectedRoleFilter: 'all' | 'students' | 'parents' | 'guests';
  onRoleCardClick: (targetRole: 'all' | 'students' | 'parents' | 'guests') => void;
  summary: {
    studentsCount?: number;
    parentsCount?: number;
    guestsCount?: number;
  };
  formatNumber: (num?: number) => string;
}

export function AnalyticsRoleCards({
  isLoading,
  selectedRoleFilter,
  onRoleCardClick,
  summary,
  formatNumber,
}: AnalyticsRoleCardsProps) {
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-neutral-900 leading-tight">
              هوية وتصنيف الزوار في هذه الفترة
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              إحصائيات تفصيلية لعدد الطلاب، وأولياء الأمور، والزوار الضيوف الذين دخلوا المنصة
            </p>
          </div>
        </div>
        <div className="text-xs text-neutral-400 font-medium">
          اضغط على أي بطاقة للانتقال لسجل وهوية هؤلاء الزوار مباشرة
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        {/* Students Card */}
        <button
          type="button"
          onClick={() => onRoleCardClick('students')}
          className={`text-start p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            selectedRoleFilter === 'students'
              ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-200 shadow-sm'
              : 'bg-gradient-to-br from-white to-emerald-50/20 border-emerald-100/80 hover:border-emerald-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
              <span>الطلاب المسجلين</span>
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl group-hover:scale-110 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-3xl font-black text-neutral-900 tracking-tight flex items-baseline gap-2">
              {isLoading ? (
                <div className="h-8 w-20 bg-neutral-200 animate-pulse rounded-md" />
              ) : (
                formatNumber(summary.studentsCount ?? 0)
              )}
              <span className="text-sm font-bold text-neutral-500">طالب دخل المنصة</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
              حسابات طلابية نشطة تصفحت الحصص والمحتوى وسجلت حضوراً وتفاعلاً
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
            <span>عرض قائمة وهوية الطلاب (مين هم)</span>
            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
          </div>

          <div className="absolute top-0 end-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />
        </button>

        {/* Parents Card */}
        <button
          type="button"
          onClick={() => onRoleCardClick('parents')}
          className={`text-start p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            selectedRoleFilter === 'parents'
              ? 'bg-purple-50/70 border-purple-500 ring-2 ring-purple-200 shadow-sm'
              : 'bg-gradient-to-br from-white to-purple-50/20 border-purple-100/80 hover:border-purple-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-purple-800 bg-purple-100/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-purple-700" />
              <span>أولياء الأمور</span>
            </span>
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-3xl font-black text-neutral-900 tracking-tight flex items-baseline gap-2">
              {isLoading ? (
                <div className="h-8 w-20 bg-neutral-200 animate-pulse rounded-md" />
              ) : (
                formatNumber(summary.parentsCount ?? 0)
              )}
              <span className="text-sm font-bold text-neutral-500">ولي أمر دخل المنصة</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
              أولياء أمور سجلوا الدخول لمتابعة أداء وحضور ودرجات أبنائهم
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-100 flex items-center justify-between text-xs font-bold text-purple-700 group-hover:text-purple-800">
            <span>عرض سجل أولياء الأمور وأبنائهم (مين هم)</span>
            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
          </div>

          <div className="absolute top-0 end-0 w-24 h-24 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-full pointer-events-none" />
        </button>

        {/* Guests Card */}
        <button
          type="button"
          onClick={() => onRoleCardClick('guests')}
          className={`text-start p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            selectedRoleFilter === 'guests'
              ? 'bg-sky-50/70 border-sky-500 ring-2 ring-sky-200 shadow-sm'
              : 'bg-gradient-to-br from-white to-sky-50/20 border-sky-100/80 hover:border-sky-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-sky-800 bg-sky-100/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-sky-700" />
              <span>زوار غير مسجلين (ضيوف)</span>
            </span>
            <div className="p-2 bg-sky-100 text-sky-700 rounded-xl group-hover:scale-110 transition-transform">
              <Globe className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-3xl font-black text-neutral-900 tracking-tight flex items-baseline gap-2">
              {isLoading ? (
                <div className="h-8 w-20 bg-neutral-200 animate-pulse rounded-md" />
              ) : (
                formatNumber(summary.guestsCount ?? 0)
              )}
              <span className="text-sm font-bold text-neutral-500">زائر عام</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
              زوار تصفحوا صفحات الموقع التعريفي قبل أو بدون تسجيل الدخول
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-sky-100 flex items-center justify-between text-xs font-bold text-sky-700 group-hover:text-sky-800">
            <span>عرض تفاصيل الزوار الضيوف</span>
            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
          </div>

          <div className="absolute top-0 end-0 w-24 h-24 bg-gradient-to-bl from-sky-500/10 to-transparent rounded-bl-full pointer-events-none" />
        </button>
      </div>
    </div>
  );
}
