'use client';

import React, { useState } from 'react';
import { MapPin, Globe, Building2, TrendingUp, Users, Info } from 'lucide-react';
import { useGeoRanking } from '../hooks/useAnalytics';
import { AnalyticsRange, GeoGroupBy } from '../types/analytics.types';

interface GeoRankingCardProps {
  range: AnalyticsRange;
  from?: string;
  to?: string;
  scope?: 'landing' | 'platform' | 'all';
}

export function GeoRankingCard({ range, from, to, scope = 'all' }: GeoRankingCardProps) {
  const [groupBy, setGroupBy] = useState<GeoGroupBy>('city');

  const { data, isLoading } = useGeoRanking({
    scope,
    groupBy,
    range,
    from,
    to,
  });

  const formatNumber = (num: number = 0) => {
    return new Intl.NumberFormat('ar-EG').format(num);
  };

  const items = data?.items || [];
  const totalVisits = data?.totalVisits || 1;

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs space-y-4">
      {/* Header & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <MapPin className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">
              ترتيب الدول والمحافظات الأكثر زيارة
            </h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            تحليل النطاق الجغرافي وحركة الزيارات حسب المحافظة والمدينة أو الدولة
          </p>
        </div>

        {/* Tab switch */}
        <div className="inline-flex p-1 bg-neutral-100 rounded-xl border border-neutral-200/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setGroupBy('city')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              groupBy === 'city'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>ترتيب المحافظات / المدن</span>
          </button>

          <button
            type="button"
            onClick={() => setGroupBy('country')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              groupBy === 'country'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>ترتيب الدول</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-neutral-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center text-xs text-neutral-400">
          لا توجد بيانات جغرافية مسجلة لهذه الفترة
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {items.slice(0, 7).map((item) => {
            const isTop1 = item.rank === 1;
            const isTop2 = item.rank === 2;
            const isTop3 = item.rank === 3;

            return (
              <div
                key={item.name}
                className="p-3.5 bg-neutral-50/80 hover:bg-neutral-50 rounded-xl border border-neutral-200/60 space-y-2 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                        isTop1
                          ? 'bg-amber-400 text-white shadow-xs'
                          : isTop2
                          ? 'bg-neutral-300 text-neutral-800'
                          : isTop3
                          ? 'bg-amber-600/80 text-white'
                          : 'bg-neutral-200 text-neutral-600'
                      }`}
                    >
                      {item.rank}
                    </span>

                    <span className="text-sm font-bold text-neutral-900 truncate">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-end">
                      <span className="text-xs font-black text-neutral-900">
                        {formatNumber(item.visitCount)}
                      </span>
                      <span className="text-[11px] text-neutral-400 mr-1">زيارة</span>
                    </div>

                    <div className="hidden sm:block text-end border-s border-neutral-200 ps-3">
                      <span className="text-xs font-bold text-neutral-600">
                        {formatNumber(item.uniqueVisitors)}
                      </span>
                      <span className="text-[11px] text-neutral-400 mr-1">زائر</span>
                    </div>

                    <span className="text-xs font-black text-emerald-700 min-w-[40px] text-end">
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-neutral-200/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isTop1 ? 'bg-emerald-600' : 'bg-emerald-500/80'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
