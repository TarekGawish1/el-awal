'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  FileText,
  Video,
  PieChart,
  Search,
  Users,
  RefreshCw,
  AlertCircle,
  GraduationCap,
  CloudOff,
  CreditCard,
  QrCode,
} from 'lucide-react';
import { useFinanceDashboardAnalytics } from '../hooks/useFinance';
import { GroupFinancialCard } from './GroupFinancialCard';
import { OnlineCourseFinancialCard } from './OnlineCourseFinancialCard';
import { GRADE_LEVELS_BY_STAGE, inferStageFromGrade } from '@/lib/constants/grades';
import { matchesSearch } from '@/lib/utils/search';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import { FinanceMetricCard, TERM_MONTHS, MONTH_NAMES } from './overview/FinanceMetricCard';
import { FinanceOverviewFilterBar } from './overview/FinanceOverviewFilterBar';

export { TERM_MONTHS, MONTH_NAMES };

interface FinanceOverviewTabProps {
  academicYear: string;
  academicTerm: 'FIRST_TERM' | 'SECOND_TERM';
  periodMonth?: number;
  onTermChange: (term: 'FIRST_TERM' | 'SECOND_TERM') => void;
  onMonthChange: (month: number) => void;
  onOpenGroupMatrix: (groupId: string) => void;
  onOpenManualPayment?: () => void;
  onOpenQrScanner?: () => void;
  groupsList?: Array<{ id: string; name: string; gradeLevel: string }>;
}

export function FinanceOverviewTab({
  academicYear,
  academicTerm,
  periodMonth,
  onTermChange,
  onMonthChange,
  onOpenGroupMatrix,
  onOpenManualPayment,
  onOpenQrScanner,
  groupsList = [],
}: FinanceOverviewTabProps) {
  const isOnline = useOnlineStatus();
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
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

  // Filter groups locally based on search query, stage, gradeLevel and selected group
  const filteredGroups = useMemo(() => {
    const list = analyticsData?.groups || [];
    return list.filter((group) => {
      if (selectedGroupId && group.id !== selectedGroupId) return false;
      if (selectedStage) {
        const groupStage = group.stage || inferStageFromGrade(group.gradeLevel);
        if (groupStage !== selectedStage) return false;
      }
      if (selectedGrade && group.gradeLevel !== selectedGrade) {
        return false;
      }
      if (groupSearchQuery.trim()) {
        const matchesName = matchesSearch(group.name, groupSearchQuery);
        const matchesGrade = matchesSearch(group.gradeLevel, groupSearchQuery);
        if (!matchesName && !matchesGrade) return false;
      }
      return true;
    });
  }, [analyticsData?.groups, selectedStage, selectedGrade, selectedGroupId, groupSearchQuery]);

  // Filter online courses locally based on search query
  const filteredCourses = useMemo(() => {
    const list = analyticsData?.onlineCourses || [];
    return list.filter((course) => {
      if (!courseSearchQuery.trim()) return true;
      const matchesTitle = matchesSearch(course.title, courseSearchQuery);
      const matchesGrade = course.gradeLevel ? matchesSearch(course.gradeLevel, courseSearchQuery) : false;
      return matchesTitle || matchesGrade;
    });
  }, [analyticsData?.onlineCourses, courseSearchQuery]);

  const overview = analyticsData?.overview;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Filter Bar */}
      <FinanceOverviewFilterBar
        academicYear={academicYear}
        academicTerm={academicTerm}
        periodMonth={periodMonth}
        onTermChange={onTermChange}
        onMonthChange={onMonthChange}
        selectedStage={selectedStage}
        onStageChange={handleStageChange}
        selectedGrade={selectedGrade}
        onGradeChange={setSelectedGrade}
        availableGrades={availableGrades}
        selectedGroupId={selectedGroupId}
        onGroupIdChange={setSelectedGroupId}
        groupsList={analyticsData?.groups || groupsList}
      />

      {/* Offline Guidance Alert */}
      {!isOnline && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-center shadow-xs space-y-3.5 animate-in fade-in">
          <div className="inline-flex items-center justify-center p-2.5 bg-amber-100 text-amber-800 rounded-full">
            <CloudOff className="h-6 w-6 text-amber-700" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-amber-900">أنت تعمل في وضع عدم الاتصال (Offline)</h3>
            <p className="text-xs text-amber-800/90 max-w-xl mx-auto leading-relaxed">
              التحليلات المالية والرسوم البيانية التراكمية تتطلب اتصالاً بالإنترنت. 
              أما <strong>رصد وتحصيل المصروفات والاشتراكات</strong> فهو يعمل <strong>بنسبة 100% بدون إنترنت</strong> عبر الماسح السريع (QR) أو التسجيل اليدوي، وسيتم حفظ كافة العمليات في قاعدة البيانات المحلية ومزامنتها تلقائياً عند عودة الاتصال.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            {onOpenManualPayment && (
              <button
                type="button"
                onClick={onOpenManualPayment}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-4 py-2.5 shadow-xs transition-colors cursor-pointer"
              >
                <CreditCard className="h-4 w-4" />
                <span>+ تسجيل مصروف يدوي</span>
              </button>
            )}
            {onOpenQrScanner && (
              <button
                type="button"
                onClick={onOpenQrScanner}
                className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 text-xs font-bold px-4 py-2.5 shadow-xs transition-colors cursor-pointer"
              >
                <QrCode className="h-4 w-4 text-amber-700" />
                <span>الماسح السريع (QR)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading & Error States (Online Only) */}
      {isOnline && isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
            <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
            <span>جارٍ تحميل البيانات المالية والتحليلات...</span>
          </div>
        </div>
      )}

      {isOnline && isError && (
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
            <FinanceMetricCard
              title="الاشتراكات الشهرية"
              subtitle="اشتراكات الحصص بالمجموعات"
              metric={overview.subscriptions}
              icon={<BookOpen className="h-5 w-5" />}
              accentColor="indigo"
            />

            <FinanceMetricCard
              title="المذكرات والملازم"
              subtitle="مبيعات الملازم الدراسية"
              metric={overview.booklets}
              icon={<FileText className="h-5 w-5" />}
              accentColor="amber"
            />

            <FinanceMetricCard
              title="الكورسات والدورات"
              subtitle="مبيعات منصة الكورسات أونلاين"
              metric={overview.onlineCourses}
              icon={<Video className="h-5 w-5" />}
              accentColor="purple"
            />

            <FinanceMetricCard
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
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={courseSearchQuery}
                onChange={(e) => setCourseSearchQuery(e.target.value)}
                placeholder="بحث باسم الكورس أو المرحلة..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pr-9 pl-3 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none shadow-2xs"
              />
            </div>

            {courseSearchQuery && (
              <button
                type="button"
                onClick={() => setCourseSearchQuery('')}
                className="text-xs font-bold text-purple-600 hover:text-purple-800 px-2 py-1 transition-colors shrink-0 cursor-pointer"
              >
                إعادة ضبط
              </button>
            )}
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
