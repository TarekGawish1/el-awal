'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  FileText,
  Video,
  PieChart,
  Search,
  Users,
  Filter,
  RefreshCw,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import { useFinanceDashboardAnalytics } from '../hooks/useFinance';
import { GroupFinancialCard } from './GroupFinancialCard';
import { OnlineCourseFinancialCard } from './OnlineCourseFinancialCard';
import { GRADE_LEVELS_BY_STAGE, inferStageFromGrade } from '@/lib/constants/grades';
import { FinanceDashboardMetric } from '../types/finance.types';

export const TERM_MONTHS: Record<'FIRST_TERM' | 'SECOND_TERM', number[]> = {
  FIRST_TERM: [8, 9, 10, 11, 12, 1],
  SECOND_TERM: [2, 3, 4, 5, 6, 7],
};

const MONTH_NAMES = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

interface MetricCardProps {
  title: string;
  subtitle: string;
  metric: FinanceDashboardMetric;
  icon: React.ReactNode;
  accentColor: 'indigo' | 'amber' | 'purple' | 'emerald';
}

function MetricCard({ title, subtitle, metric, icon, accentColor }: MetricCardProps) {
  const { expected, collected, remaining, rate } = metric;
  const rateClamped = Math.min(100, Math.max(0, rate || 0));

  const colorStyles = {
    indigo: {
      border: 'border-indigo-100',
      bg: 'bg-indigo-50/60',
      text: 'text-indigo-700',
      iconBg: 'bg-indigo-600',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      bar: 'bg-indigo-600',
    },
    amber: {
      border: 'border-amber-100',
      bg: 'bg-amber-50/60',
      text: 'text-amber-700',
      iconBg: 'bg-amber-500',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      bar: 'bg-amber-500',
    },
    purple: {
      border: 'border-purple-100',
      bg: 'bg-purple-50/60',
      text: 'text-purple-700',
      iconBg: 'bg-purple-600',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      bar: 'bg-purple-600',
    },
    emerald: {
      border: 'border-emerald-100',
      bg: 'bg-emerald-50/60',
      text: 'text-emerald-700',
      iconBg: 'bg-emerald-600',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      bar: 'bg-emerald-600',
    },
  }[accentColor];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${colorStyles.border} bg-white p-5 shadow-sm transition-all hover:shadow-md`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorStyles.iconBg} text-white shadow-sm`}>
            {icon}
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm sm:text-base">{title}</h4>
            <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
          </div>
        </div>

        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-extrabold ${colorStyles.badgeBg}`}
        >
          {rate}%
        </span>
      </div>

      {/* Primary 3-column stats */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
          <span className="text-[10px] font-medium text-slate-400 block">إجمالي المطلوب</span>
          <span className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 block">
            {expected.toLocaleString()} <span className="text-[10px] font-normal">ج.م</span>
          </span>
        </div>

        <div className="rounded-xl bg-emerald-50/80 p-2 border border-emerald-100/60">
          <span className="text-[10px] font-semibold text-emerald-600 block">المحصل الفعلي</span>
          <span className="text-xs sm:text-sm font-bold text-emerald-700 mt-0.5 block">
            {collected.toLocaleString()} <span className="text-[10px] font-normal">ج.م</span>
          </span>
        </div>

        <div className="rounded-xl bg-rose-50/80 p-2 border border-rose-100/60">
          <span className="text-[10px] font-semibold text-rose-600 block">المتبقي</span>
          <span className="text-xs sm:text-sm font-bold text-rose-700 mt-0.5 block">
            {remaining.toLocaleString()} <span className="text-[10px] font-normal">ج.م</span>
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3.5 space-y-1">
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${colorStyles.bar} rounded-full transition-all duration-500`}
            style={{ width: `${rateClamped}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface FinanceOverviewTabProps {
  academicYear: string;
  academicTerm: 'FIRST_TERM' | 'SECOND_TERM';
  periodMonth?: number;
  onTermChange: (term: 'FIRST_TERM' | 'SECOND_TERM') => void;
  onMonthChange: (month: number) => void;
  onOpenGroupMatrix: (groupId: string) => void;
  groupsList?: Array<{ id: string; name: string; gradeLevel: string }>;
}

export function FinanceOverviewTab({
  academicYear,
  academicTerm,
  periodMonth,
  onTermChange,
  onMonthChange,
  onOpenGroupMatrix,
  groupsList = [],
}: FinanceOverviewTabProps) {
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [courseSearchQuery, setCourseSearchQuery] = useState('');

  // Fetch Dashboard Analytics from backend
  const {
    data: analyticsData,
    isLoading,
    isError,
    refetch,
  } = useFinanceDashboardAnalytics({
    academicPeriodId: `${academicYear}:${academicTerm}`,
    academicYear,
    academicTerm,
    stage: selectedStage || undefined,
    gradeLevel: selectedGrade || undefined,
    month: periodMonth || undefined,
  });

  // Handle stage change with cascading reset of grade
  const handleStageChange = (newStage: string) => {
    setSelectedStage(newStage);
    setSelectedGrade('');
  };

  // Compute available grades based on selected stage
  const availableGrades = useMemo(() => {
    if (selectedStage && GRADE_LEVELS_BY_STAGE[selectedStage]) {
      return GRADE_LEVELS_BY_STAGE[selectedStage];
    }
    return Object.values(GRADE_LEVELS_BY_STAGE).flat();
  }, [selectedStage]);

  // Filter groups locally based on search query, stage, and gradeLevel
  const filteredGroups = useMemo(() => {
    const list = analyticsData?.groups || [];
    return list.filter((group) => {
      if (selectedStage) {
        const groupStage = group.stage || inferStageFromGrade(group.gradeLevel);
        if (groupStage !== selectedStage) return false;
      }
      if (selectedGrade && group.gradeLevel !== selectedGrade) {
        return false;
      }
      if (groupSearchQuery.trim()) {
        const query = groupSearchQuery.trim().toLowerCase();
        const matchesName = group.name.toLowerCase().includes(query);
        const matchesGrade = group.gradeLevel.toLowerCase().includes(query);
        if (!matchesName && !matchesGrade) return false;
      }
      return true;
    });
  }, [analyticsData?.groups, selectedStage, selectedGrade, groupSearchQuery]);

  // Filter online courses locally based on search query
  const filteredCourses = useMemo(() => {
    const list = analyticsData?.onlineCourses || [];
    if (!courseSearchQuery.trim()) return list;
    const query = courseSearchQuery.trim().toLowerCase();
    return list.filter((course) => {
      const matchesTitle = course.title.toLowerCase().includes(query);
      const matchesGrade = course.gradeLevel ? course.gradeLevel.toLowerCase().includes(query) : false;
      return matchesTitle || matchesGrade;
    });
  }, [analyticsData?.onlineCourses, courseSearchQuery]);

  const overview = analyticsData?.overview;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Filter Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Term Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">الفترة الدراسية</label>
            <select
              aria-label="الفترة الدراسية"
              value={academicTerm}
              onChange={(e) => onTermChange(e.target.value as 'FIRST_TERM' | 'SECOND_TERM')}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium focus:border-indigo-500 focus:outline-none"
            >
              <option value="FIRST_TERM">{academicYear} - ترم أول</option>
              <option value="SECOND_TERM">{academicYear} - ترم ثان</option>
            </select>
          </div>

          {/* Month Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">الشهر</label>
            <select
              aria-label="الشهر"
              value={periodMonth ?? ''}
              onChange={(e) => onMonthChange(Number(e.target.value))}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium focus:border-indigo-500 focus:outline-none"
            >
              <option value="">الترم كاملاً</option>
              {(TERM_MONTHS[academicTerm] || []).map((m) => (
                <option key={m} value={m}>
                  شهر {m} ({MONTH_NAMES[m - 1]})
                </option>
              ))}
            </select>
          </div>

          {/* Stage Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">المرحلة الدراسية</label>
            <select
              aria-label="المرحلة الدراسية"
              value={selectedStage}
              onChange={(e) => handleStageChange(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium focus:border-indigo-500 focus:outline-none"
            >
              <option value="">جميع المراحل</option>
              <option value="SECONDARY">المرحلة الثانوية</option>
              <option value="PREPARATORY">المرحلة الإعدادية</option>
              <option value="PRIMARY">المرحلة الابتدائية</option>
            </select>
          </div>

          {/* Grade Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">الصف الدراسي</label>
            <select
              aria-label="الصف الدراسي"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium focus:border-indigo-500 focus:outline-none"
            >
              <option value="">جميع الصفوف</option>
              {availableGrades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
            <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
            <span>جارٍ تحميل البيانات المالية والتحليلات...</span>
          </div>
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
          <AlertCircle className="h-6 w-6 text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-rose-700">تعذر تحميل بيانات لوحة التحكم المالية</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* 1. Global Revenue Overview Cards (4 Metric Cards) */}
      {overview && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-indigo-600" />
              المؤشرات المالية الكلية
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {periodMonth ? `شهر ${periodMonth} (${MONTH_NAMES[periodMonth - 1]})` : 'إجمالي الفترة كاملة'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Monthly Subscriptions */}
            <MetricCard
              title="الاشتراكات الشهرية"
              subtitle="اشتراكات الحصص بالمجموعات"
              metric={overview.subscriptions}
              icon={<BookOpen className="h-5 w-5" />}
              accentColor="indigo"
            />

            {/* 2. Booklets */}
            <MetricCard
              title="المذكرات والملازم"
              subtitle="مبيعات الملازم الدراسية"
              metric={overview.booklets}
              icon={<FileText className="h-5 w-5" />}
              accentColor="amber"
            />

            {/* 3. Online Courses */}
            <MetricCard
              title="الكورسات والدورات"
              subtitle="مبيعات منصة الكورسات أونلاين"
              metric={overview.onlineCourses}
              icon={<Video className="h-5 w-5" />}
              accentColor="purple"
            />

            {/* 4. Grand Total */}
            <MetricCard
              title="المؤشر المالي العام"
              subtitle="الإجمالي الشامل للإيرادات"
              metric={overview.grandTotal}
              icon={<PieChart className="h-5 w-5" />}
              accentColor="emerald"
            />
          </div>
        </div>
      )}

      {/* 2. Detailed Study Group Breakdown Section */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              التحصيل المالي للمجموعات الدراسية
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              تفاصيل اشتراكات ومذكرات كل مجموعة دراسية مع نسب التحصيل
            </p>
          </div>

          {/* Group Search Filter */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={groupSearchQuery}
              onChange={(e) => setGroupSearchQuery(e.target.value)}
              placeholder="بحث باسم المجموعة أو الصف..."
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pr-9 pl-3 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Groups Grid */}
        {filteredGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((group) => (
              <GroupFinancialCard
                key={group.id}
                group={group}
                onOpenMatrix={onOpenGroupMatrix}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
            <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">لا توجد مجموعات دراسية مطابقة للبحث أو الفلتر</p>
            <p className="text-xs text-slate-400 mt-1">جرّب تغيير خيارات البحث أو اختيار مرحلة دراسية أخرى</p>
          </div>
        )}
      </div>

      {/* 3. Detailed Online Courses Breakdown Section */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              مبيعات وإيرادات الكورسات الأونلاين
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              متابعة مبيعات الدورات المسجلة وأعداد المشتركين في المنصة
            </p>
          </div>

          {/* Course Search Filter */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={courseSearchQuery}
              onChange={(e) => setCourseSearchQuery(e.target.value)}
              placeholder="بحث باسم الكورس أو المرحلة..."
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pr-9 pl-3 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Online Courses Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map((course) => (
              <OnlineCourseFinancialCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
            <Video className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">لا توجد كورسات أونلاين مسجلة أو مطابقة للبحث</p>
            <p className="text-xs text-slate-400 mt-1">تأكد من نشر الكورسات وتعيين أسعار الاشتراكات</p>
          </div>
        )}
      </div>
    </div>
  );
}
