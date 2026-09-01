import React from 'react';
import { Activity, Users, Calendar, ShieldCheck } from 'lucide-react';
import { AuditStats } from '../types/audit.types';

interface AuditStatsOverviewProps {
  stats?: AuditStats;
  isLoading: boolean;
}

export function AuditStatsOverview({ stats, isLoading }: AuditStatsOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm animate-pulse h-28" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'نشاطات اليوم',
      value: stats?.todayCount ?? 0,
      icon: Activity,
      color: 'text-primary-600 bg-primary-50 border-primary-100',
      description: 'عملية مسجلة خلال الـ 24 ساعة الماضية',
    },
    {
      title: 'عمليات المساعدين',
      value: stats?.assistantCount ?? 0,
      icon: Users,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      description: 'إجمالي الحركات التي قام بها المساعدون',
    },
    {
      title: 'نشاطات هذا الأسبوع',
      value: stats?.weekCount ?? 0,
      icon: Calendar,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
      description: 'عملية مسجلة خلال آخر 7 أيام',
    },
    {
      title: 'إجمالي سجل العمليات',
      value: stats?.totalCount ?? 0,
      icon: ShieldCheck,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      description: 'سجل تدقيق كامل ومؤمن للبيانات',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-500">{card.title}</span>
              <div className={`p-2 rounded-xl border ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-neutral-800 tracking-tight">
                {card.value.toLocaleString('ar-EG')}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">{card.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
