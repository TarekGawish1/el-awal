'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  MapPin,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  UserCheck,
  User,
  GraduationCap,
  Phone,
  Layers,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import { useVisitorsList } from '../hooks/useAnalytics';
import {
  AnalyticsRange,
  AnalyticsScope,
  VisitorListItem,
  IndividualVisitItem,
} from '../types/analytics.types';

interface VisitorListCardProps {
  range: AnalyticsRange;
  from?: string;
  to?: string;
  scope?: AnalyticsScope;
}

export function VisitorListCard({ range, from, to, scope = 'all' }: VisitorListCardProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'visits'>('recent');
  const [filterType, setFilterType] = useState<'all' | 'registered' | 'guests'>('all');
  const [expandedVisitorHash, setExpandedVisitorHash] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useVisitorsList({
    range,
    from,
    to,
    scope,
    page,
    limit,
    search: appliedSearch || undefined,
    sortBy,
  });


  const visitors = data?.visitors || [];
  const totalVisitors = data?.totalVisitors || 0;
  const totalPages = data?.totalPages || 1;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(search.trim());
    setPage(1);
  };

  const handleSearchClear = () => {
    setSearch('');
    setAppliedSearch('');
    setPage(1);
  };

  const toggleExpand = (hash: string) => {
    setExpandedVisitorHash((prev) => (prev === hash ? null : hash));
  };

  // Filter registered vs guests in view
  const filteredVisitors = visitors.filter((v) => {
    if (filterType === 'registered') return !!v.user;
    if (filterType === 'guests') return !v.user;
    return true;
  });

  const formatNumber = (num: number = 0) => {
    return new Intl.NumberFormat('ar-EG').format(num);
  };

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return 'غير محدد';
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('ar-EG', {
        timeZone: 'Africa/Cairo',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const formatTimeOnly = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const date = new Date(isoStr);
      return date.toLocaleTimeString('ar-EG', {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const getDeviceIcon = (device: 'Desktop' | 'Mobile' | 'Tablet') => {
    switch (device) {
      case 'Mobile':
        return <Smartphone className="w-3.5 h-3.5" />;
      case 'Tablet':
        return <Tablet className="w-3.5 h-3.5" />;
      default:
        return <Laptop className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs space-y-5">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-neutral-900 leading-tight">
                سجل وهوية الزوار التفصيلي
              </h2>
              <span className="px-2.5 py-0.5 bg-primary-100 text-primary-800 rounded-full text-xs font-black">
                {formatNumber(totalVisitors)} زائر فريد
              </span>
              {data?.totalDurationFormatted && (
                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-full text-xs font-black flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>إجمالي وقت التواجد: {data.totalDurationFormatted}</span>
                </span>
              )}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            استعرض الزوار الذين دخلوا المنصة وفق الفلتر المحدد، مع عدد مرات الدخول وتفاصيل كل جلسة وزيارة
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <span className="text-xs text-neutral-400 font-bold hidden sm:inline">الترتيب:</span>
          <div className="inline-flex p-1 bg-neutral-100 rounded-xl border border-neutral-200/60">
            <button
              type="button"
              onClick={() => {
                setSortBy('recent');
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'recent'
                  ? 'bg-white text-primary-700 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-primary-600" />
              <span>الأحدث زيارة</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSortBy('visits');
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'visits'
                  ? 'bg-white text-primary-700 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-primary-600" />
              <span>الأكثر دخولاً</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الطالب، الهاتف، الكود، أو المحافظة..."
            className="w-full pl-10 pr-9 py-2 bg-neutral-50 hover:bg-neutral-100/60 focus:bg-white text-xs sm:text-sm text-neutral-800 rounded-xl border border-neutral-200 focus:border-primary-500 focus:outline-none transition-all"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {search && (
            <button
              type="button"
              onClick={handleSearchClear}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-600 cursor-pointer"
            >
              مسح
            </button>
          )}
        </form>

        {/* User type segmented toggle */}
        <div className="inline-flex p-1 bg-neutral-100 rounded-xl border border-neutral-200/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            الكل
          </button>
          <button
            type="button"
            onClick={() => setFilterType('registered')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'registered'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>مسجلون</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('guests')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'guests'
                ? 'bg-white text-neutral-800 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-neutral-500" />
            <span>زوار غير مسجلين</span>
          </button>
        </div>
      </div>

      {/* Visitor List Items */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3 py-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-neutral-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredVisitors.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-neutral-200 rounded-2xl space-y-2">
            <Users className="w-10 h-10 text-neutral-300 mx-auto" />
            <p className="text-sm font-bold text-neutral-700">لا يوجد زوار يطابقون هذا الفلتر</p>
            <p className="text-xs text-neutral-400">
              جرّب تغيير الفترة الزمنية أو نطاق الفلتر لعرض البيانات
            </p>
          </div>
        ) : (
          filteredVisitors.map((visitor) => {
            const isExpanded = expandedVisitorHash === visitor.visitorHash;
            const isRegistered = !!visitor.user;

            return (
              <div
                key={visitor.visitorHash}
                className={`rounded-2xl border transition-all duration-200 ${
                  isExpanded
                    ? 'border-primary-300 bg-primary-50/20 shadow-sm ring-2 ring-primary-100'
                    : 'border-neutral-200/80 bg-white hover:border-neutral-300 hover:shadow-xs'
                }`}
              >
                {/* Main Row */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Visitor Info & Identity */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Avatar Icon */}
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                        isRegistered
                          ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200/60'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {isRegistered ? (
                        <UserCheck className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <Globe className="w-5 h-5 text-neutral-500" />
                      )}
                    </div>

                    {/* Name, Code, City */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isRegistered ? (
                          <h3 className="text-sm sm:text-base font-black text-neutral-900 truncate">
                            {visitor.user?.name}
                          </h3>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-neutral-800">زائر غير مسجل (Guest)</h3>
                            <span className="font-mono text-[11px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md border border-neutral-200">
                              #{visitor.shortHash}
                            </span>
                          </div>
                        )}

                        {isRegistered && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-md border border-emerald-200/60">
                            {visitor.user?.role === 'STUDENT'
                              ? 'طالب'
                              : visitor.user?.role === 'TEACHER'
                              ? 'معلم'
                              : 'مستخدم مسجل'}
                          </span>
                        )}

                        {visitor.user?.studentCode && (
                          <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 text-[10px] font-mono font-bold rounded-md">
                            {visitor.user.studentCode}
                          </span>
                        )}
                      </div>

                      {/* Meta subline: location, phone, grade */}
                      <div className="flex items-center gap-3 text-xs text-neutral-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>
                            {visitor.city}، {visitor.country}
                          </span>
                        </span>

                        {visitor.user?.phone && (
                          <span className="flex items-center gap-1 font-mono text-[11px] text-neutral-600">
                            <Phone className="w-3 h-3 text-neutral-400" />
                            <bdi>{visitor.user.phone}</bdi>
                          </span>
                        )}

                        {visitor.user?.gradeLevel && (
                          <span className="flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{visitor.user.gradeLevel}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badges: Environment & Total Visits */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 sm:gap-4 shrink-0 flex-wrap border-t lg:border-t-0 pt-3 lg:pt-0 border-neutral-100">
                    {/* Device & OS Badges */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-lg text-xs font-semibold"
                        title={`${visitor.device} - ${visitor.os}`}
                      >
                        {getDeviceIcon(visitor.device)}
                        <span>{visitor.os}</span>
                      </span>
                      <span className="px-2 py-1 bg-neutral-100 text-neutral-600 rounded-lg text-xs font-medium">
                        {visitor.browser}
                      </span>
                    </div>

                    {/* Visit Count, Duration & Timing */}
                    <div className="text-end">
                      <div className="flex items-center gap-1.5 justify-end flex-wrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-xl text-xs font-black border border-primary-100">
                          <Eye className="w-3.5 h-3.5" />
                          <span>{formatNumber(visitor.totalVisits)} زيارة</span>
                        </div>
                        {visitor.totalDurationFormatted && (
                          <div
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-xl text-xs font-black border border-amber-200/60"
                            title="إجمالي وقت التواجد للزائر على المنصة"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>إجمالي التواجد: {visitor.totalDurationFormatted}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1" title={visitor.lastSeenAt}>
                        آخر ظهور: {formatDateTime(visitor.lastSeenAt)}
                      </p>
                    </div>

                    {/* Expand Button */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(visitor.visitorHash)}
                      className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        isExpanded
                          ? 'bg-primary-600 text-white shadow-xs'
                          : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700'
                      }`}
                    >
                      <span>{isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Drawer: Individual Visits Log */}
                {isExpanded && (
                  <div className="border-t border-neutral-200/80 bg-neutral-50/70 p-4 sm:p-5 rounded-b-2xl space-y-4 animate-in fade-in duration-150">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary-600" />
                        <h4 className="text-xs sm:text-sm font-black text-neutral-900">
                          سجل الزيارات والصفحات التي تمت مشاهدتها ({visitor.visits.length} مسار)
                        </h4>
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        أول زيارة مسجلة: {formatDateTime(visitor.firstSeenAt)}
                      </div>
                    </div>

                    {/* Timeline of visits */}
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {visitor.visits.map((visit, index) => (
                        <div
                          key={visit.id || index}
                          className="p-3 bg-white rounded-xl border border-neutral-200/70 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-600 font-bold flex items-center justify-center shrink-0 text-[11px]">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-neutral-900 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200/60 truncate max-w-xs sm:max-w-md">
                                  {visit.path}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    visit.isLandingPage
                                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  }`}
                                >
                                  {visit.isLandingPage ? 'موقع تعريفي' : 'بوابة النظام'}
                                </span>
                              </div>
                              {visit.referrer && (
                                <p className="text-[10px] text-neutral-400 mt-1 truncate">
                                  المصدر: {visit.referrer}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-end shrink-0 flex flex-col items-end gap-1 self-end sm:self-auto">
                            {visit.durationFormatted && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md text-[11px] font-bold border border-amber-200/60"
                                title="مدة هذه الزيارة المحددة"
                              >
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>{visit.durationFormatted}</span>
                              </span>
                            )}
                            <span className="text-neutral-500 font-mono text-[11px]">
                              {formatDateTime(visit.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-100">
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span>
            عرض <span className="font-bold text-neutral-900">{filteredVisitors.length}</span> من أصل{' '}
            <span className="font-bold text-neutral-900">{formatNumber(totalVisitors)}</span> زائر
          </span>
          <span className="text-neutral-300">|</span>
          <div className="flex items-center gap-1.5">
            <span>لكل صفحة:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg px-2 py-1 text-xs font-bold text-neutral-700 focus:outline-none focus:border-primary-500 cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isFetching}
            className="flex items-center gap-1 px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 disabled:opacity-40 rounded-xl text-xs font-bold text-neutral-700 border border-neutral-200/80 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
            <span>السابقة</span>
          </button>

          {/* Page Number Pills */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    page === pageNum
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isFetching}
            className="flex items-center gap-1 px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 disabled:opacity-40 rounded-xl text-xs font-bold text-neutral-700 border border-neutral-200/80 transition-colors cursor-pointer"
          >
            <span>التالية</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
