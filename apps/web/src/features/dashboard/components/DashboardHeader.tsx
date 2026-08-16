'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatArabicDate, formatArabicTime } from '@/lib/utils/formatters';

export interface DashboardHeaderProps {
  teacherName?: string;
  lastUpdatedTimestamp?: string;
  isFetching: boolean;
  isOffline: boolean;
  onRefresh: () => void;
}

export function DashboardHeader({
  teacherName = 'أستاذ المادة',
  lastUpdatedTimestamp,
  isFetching,
  isOffline,
  onRefresh,
}: DashboardHeaderProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
            بوابة المدرس
          </span>
          <span className="text-xs text-neutral-400">•</span>
          <span className="text-xs text-neutral-500 font-medium min-h-[1rem] inline-block">
            {isMounted ? formatArabicDate(new Date()) : ''}
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">
          مرحباً، {teacherName} 👋
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          نظرة عامة على المجموعات والحصص ونسب الحضور والواجبات بانتظار المتابعة اليوم
        </p>
      </div>

      <div className="flex items-center gap-3">
        {lastUpdatedTimestamp && !isOffline && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-500 bg-white border border-neutral-200 px-3 py-1.5 rounded-md shadow-xs">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span>آخر تحديث: {isMounted ? formatArabicTime(lastUpdatedTimestamp) : ''}</span>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isFetching || isOffline}
          className="gap-1.5"
          aria-label="تحديث بيانات لوحة التحكم"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-primary-600' : 'text-neutral-600'}`} />
          <span className="text-xs">{isFetching ? 'جاري التحديث...' : 'تحديث البيانات'}</span>
        </Button>
      </div>
    </header>
  );
}

