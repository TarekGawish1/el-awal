'use client';

import { useState } from 'react';
import { useVisitorsList } from './useAnalytics';
import { AnalyticsRange, AnalyticsScope } from '../types/analytics.types';

interface UseVisitorListCardProps {
  range: AnalyticsRange;
  from?: string;
  to?: string;
  scope?: AnalyticsScope;
  roleFilter?: 'all' | 'students' | 'parents' | 'guests';
  onRoleFilterChange?: (role: 'all' | 'students' | 'parents' | 'guests') => void;
}

export function useVisitorListCard({
  range,
  from,
  to,
  scope = 'all',
  roleFilter,
  onRoleFilterChange,
}: UseVisitorListCardProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'visits'>('recent');
  const [internalFilterType, setInternalFilterType] = useState<'all' | 'students' | 'parents' | 'guests'>('all');
  const [expandedVisitorHash, setExpandedVisitorHash] = useState<string | null>(null);

  const filterType = roleFilter !== undefined ? roleFilter : internalFilterType;

  const handleFilterChange = (newFilter: 'all' | 'students' | 'parents' | 'guests') => {
    if (onRoleFilterChange) {
      onRoleFilterChange(newFilter);
    }
    setInternalFilterType(newFilter);
    setPage(1);
  };

  const { data, isLoading, isFetching } = useVisitorsList({
    range,
    from,
    to,
    scope,
    page,
    limit,
    search: appliedSearch || undefined,
    sortBy,
    role: filterType === 'all' ? undefined : filterType,
  });

  const visitors = data?.visitors || [];
  const totalVisitors = data?.totalVisitors || 0;
  const totalPages = data?.totalPages || 1;
  const studentsCount = data?.studentsCount ?? 0;
  const parentsCount = data?.parentsCount ?? 0;
  const guestsCount = data?.guestsCount ?? 0;
  const totalDurationFormatted = data?.totalDurationFormatted;

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

  return {
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
  };
}
