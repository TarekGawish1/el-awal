'use client';

import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface VisitorListPaginationProps {
  page: number;
  setPage: (p: number | ((prev: number) => number)) => void;
  limit: number;
  setLimit: (val: number) => void;
  totalVisitors: number;
  totalPages: number;
  filteredVisitorsCount: number;
  isFetching: boolean;
}

export function VisitorListPagination({
  page,
  setPage,
  limit,
  setLimit,
  totalVisitors,
  totalPages,
  filteredVisitorsCount,
  isFetching,
}: VisitorListPaginationProps) {
  const formatNumber = (num: number = 0) => new Intl.NumberFormat('en-US').format(num);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-100">
      <div className="flex items-center gap-3 text-xs text-neutral-500">
        <span>
          عرض <span className="font-bold text-neutral-900">{filteredVisitorsCount}</span> من أصل{' '}
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
  );
}
