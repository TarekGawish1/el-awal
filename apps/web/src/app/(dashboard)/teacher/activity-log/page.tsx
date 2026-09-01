'use client';

import React, { useState } from 'react';
import { History, ShieldCheck, RefreshCw } from 'lucide-react';
import {
  useAuditLogs,
  AuditStatsOverview,
  AuditLogFilters,
  AuditLogsList,
  AuditQueryParams,
} from '@/features/audit-logs';

export default function ActivityLogPage() {
  const [filters, setFilters] = useState<AuditQueryParams>({
    page: 1,
    limit: 20,
    search: '',
    action: '',
    entityType: '',
    userId: '',
    startDate: '',
  });

  const {
    logs,
    meta,
    isLoadingLogs,
    isFetchingLogs,
    stats,
    isLoadingStats,
    performers,
    refetchLogs,
  } = useAuditLogs(filters);

  const handleFilterChange = (newFilters: Partial<AuditQueryParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      search: '',
      action: '',
      entityType: '',
      userId: '',
      startDate: '',
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-100 rounded-xl text-primary-600">
              <History className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-800">
              سجل النشاطات وتتبع العمليات
            </h1>
          </div>
          <p className="text-sm text-neutral-500 font-medium mr-12 mt-1">
            متابعة شاملة ولحظية لجميع العمليات (إضافة، تعديل، حذف، رصد، ومدفوعات) مع تحديد هوية منفذ كل إجراء.
          </p>
        </div>

        <button
          onClick={() => refetchLogs()}
          disabled={isFetchingLogs}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetchingLogs ? 'animate-spin text-primary-600' : ''}`} />
          تحديث السجل
        </button>
      </div>

      {/* Stats Summary Cards */}
      <AuditStatsOverview stats={stats} isLoading={isLoadingStats} />

      {/* Filter Toolbar */}
      <AuditLogFilters
        filters={filters}
        performers={performers}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Activity Logs Table */}
      <AuditLogsList
        logs={logs}
        meta={meta}
        isLoading={isLoadingLogs}
        onPageChange={(page) => handleFilterChange({ page })}
      />
    </div>
  );
}
