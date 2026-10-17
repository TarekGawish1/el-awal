'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { AnalyticsRange, AnalyticsScope } from '../types/analytics.types';
import { useVisitorListCard } from '../hooks/useVisitorListCard';
import { VisitorListHeader } from './visitor-list/VisitorListHeader';
import { VisitorListItemRow } from './visitor-list/VisitorListItemRow';
import { VisitorListPagination } from './visitor-list/VisitorListPagination';

interface VisitorListCardProps {
  range: AnalyticsRange;
  from?: string;
  to?: string;
  scope?: AnalyticsScope;
  roleFilter?: 'all' | 'students' | 'parents' | 'guests';
  onRoleFilterChange?: (role: 'all' | 'students' | 'parents' | 'guests') => void;
}

export function VisitorListCard({
  range,
  from,
  to,
  scope = 'all',
  roleFilter,
  onRoleFilterChange,
}: VisitorListCardProps) {
  const {
    page,
    setPage,
    limit,
    setLimit,
    search,
    setSearch,
    sortBy,
    setSortBy,
    filterType,
    handleFilterChange,
    expandedVisitorHash,
    toggleExpand,
    visitors,
    totalVisitors,
    totalPages,
    studentsCount,
    parentsCount,
    guestsCount,
    totalDurationFormatted,
    isLoading,
    isFetching,
    handleSearchSubmit,
    handleSearchClear,
  } = useVisitorListCard({
    range,
    from,
    to,
    scope,
    roleFilter,
    onRoleFilterChange,
  });

  return (
    <div id="visitors-list-section" className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs space-y-5 scroll-mt-6">
      {/* Header, Search & Filter Bar */}
      <VisitorListHeader
        totalVisitors={totalVisitors}
        totalDurationFormatted={totalDurationFormatted}
        sortBy={sortBy}
        onSortByChange={(val) => {
          setSortBy(val);
          setPage(1);
        }}
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        onSearchClear={handleSearchClear}
        filterType={filterType}
        onFilterChange={handleFilterChange}
        studentsCount={studentsCount}
        parentsCount={parentsCount}
        guestsCount={guestsCount}
      />

      {/* Visitor List Items */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3 py-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-neutral-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : visitors.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-neutral-200 rounded-2xl space-y-2">
            <Users className="w-10 h-10 text-neutral-300 mx-auto" />
            <p className="text-sm font-bold text-neutral-700">لا يوجد زوار يطابقون هذا الفلتر</p>
            <p className="text-xs text-neutral-400">
              جرّب تغيير الفترة الزمنية أو نطاق الفلتر لعرض البيانات
            </p>
          </div>
        ) : (
          visitors.map((visitor) => (
            <VisitorListItemRow
              key={visitor.visitorHash}
              visitor={visitor}
              isExpanded={expandedVisitorHash === visitor.visitorHash}
              onToggleExpand={toggleExpand}
            />
          ))
        )}
      </div>

      {/* Pagination Controls */}
      <VisitorListPagination
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={setLimit}
        totalVisitors={totalVisitors}
        totalPages={totalPages}
        filteredVisitorsCount={visitors.length}
        isFetching={isFetching}
      />
    </div>
  );
}

export default VisitorListCard;
