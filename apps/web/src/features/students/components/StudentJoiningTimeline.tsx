'use client';

import React, { useMemo, useState } from 'react';
import { StudentListItem } from '../types/students.types';
import { getJoiningRelativeTime, resolveJoiningMethod } from '../utils/studentJoiningHelpers';
import { Clock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { JoiningStatsKpiCards, JoiningStats } from './timeline/JoiningStatsKpiCards';
import { JoiningTimelineFilters, TimelineMethodFilter } from './timeline/JoiningTimelineFilters';
import { JoiningTimelineItemCard } from './timeline/JoiningTimelineItemCard';
import { useStudents } from '../hooks/use-students';
import { fetchStudents } from '../api/students.api';

interface StudentJoiningTimelineProps {
  students?: StudentListItem[];
  isLoading?: boolean;
  isError?: boolean;
  totalStudents?: number;
  onSelectStudent: (studentId: string) => void;
}

interface StudentJoiningTimelinePresentationProps {
  students: StudentListItem[];
  isLoading: boolean;
  isError: boolean;
  totalStudents?: number;
  onSelectStudent: (studentId: string) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

function StudentJoiningTimelinePresentation({
  students,
  isLoading,
  isError,
  totalStudents,
  onSelectStudent,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: StudentJoiningTimelinePresentationProps) {
  const [timelineSearch, setTimelineSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<TimelineMethodFilter>('ALL');

  // Sort students strictly by createdAt (newest first)
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [students]);

  // Aggregate KPI stats
  const stats: JoiningStats = useMemo(() => {
    let groupLinkCount = 0;
    let approvedRequestCount = 0;
    let manualCount = 0;
    sortedStudents.forEach((st) => {
      const method = resolveJoiningMethod(st);
      if (method.type === 'APPROVED_REQUEST') {
        approvedRequestCount++;
      } else if (method.isGroupLink) {
        groupLinkCount++;
      } else {
        manualCount++;
      }
    });

    const finalTotal =
      totalStudents !== undefined
        ? Math.max(totalStudents, sortedStudents.length)
        : sortedStudents.length;

    return {
      total: finalTotal,
      groupLinkCount,
      approvedRequestCount,
      manualCount,
      latestDate: sortedStudents[0]?.createdAt
        ? getJoiningRelativeTime(sortedStudents[0].createdAt)
        : null,
    };
  }, [sortedStudents, totalStudents]);

  // Filtered timeline items
  const filteredTimeline = useMemo(() => {
    const q = timelineSearch.trim().toLowerCase();
    return sortedStudents.filter((st) => {
      const method = resolveJoiningMethod(st);

      if (methodFilter === 'GROUP_LINK' && !method.isGroupLink) return false;
      if (methodFilter === 'APPROVED_REQUEST' && method.type !== 'APPROVED_REQUEST') return false;
      if (methodFilter === 'MANUAL' && (method.isGroupLink || method.type === 'APPROVED_REQUEST')) return false;

      if (!q) return true;
      const name = st.user.fullName?.toLowerCase() || '';
      const code = st.studentCode?.toLowerCase() || '';
      const phone = st.user.phone || '';
      const groupName = st.groupEnrollments?.[0]?.group?.name?.toLowerCase() || '';
      const parentPhone = st.parentLinks?.[0]?.parent?.user?.phone || '';

      return (
        name.includes(q) ||
        code.includes(q) ||
        phone.includes(q) ||
        parentPhone.includes(q) ||
        groupName.includes(q)
      );
    });
  }, [sortedStudents, timelineSearch, methodFilter]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 sm:p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <div className="space-y-3 pt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center bg-red-50/50 rounded-3xl border border-red-100 text-red-600">
        تعذر تحميل سجل الانضمام. يرجى المحاولة مرة أخرى.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Stats Bar */}
      <JoiningStatsKpiCards stats={stats} />

      {/* Filter and Search Bar for Timeline */}
      <JoiningTimelineFilters
        search={timelineSearch}
        onSearchChange={setTimelineSearch}
        methodFilter={methodFilter}
        onMethodFilterChange={setMethodFilter}
        totalCount={stats.total}
        groupLinkCount={stats.groupLinkCount}
        approvedRequestCount={stats.approvedRequestCount}
        manualCount={stats.manualCount}
      />

      {/* Chronological Joining Timeline List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-4 sm:p-6">
        {filteredTimeline.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-3">
            <Clock className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-base font-semibold text-slate-700">لم يتم العثور على سجلات انضمام مطابقة</p>
            {timelineSearch && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTimelineSearch('');
                  setMethodFilter('ALL');
                }}
                className="mt-2 text-xs rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 ml-1" />
                إعادة ضبط البحث
              </Button>
            )}
          </div>
        ) : (
          <div className="relative border-r-2 border-slate-100 mr-3 sm:mr-6 space-y-6">
            {filteredTimeline.map((student) => (
              <JoiningTimelineItemCard
                key={student.id}
                student={student}
                onSelectStudent={onSelectStudent}
              />
            ))}
          </div>
        )}

        {/* Load More Button for large student lists exceeding 500 */}
        {hasMore && onLoadMore && (
          <div className="pt-6 text-center border-t border-slate-100 mt-6">
            <Button
              variant="outline"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border-primary-200 text-primary-700 hover:bg-primary-50 shadow-xs cursor-pointer"
            >
              {isLoadingMore ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  جاري تحميل المزيد...
                </span>
              ) : (
                <span>عرض المزيد من سجل الانضمام</span>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function StudentJoiningTimelineWithQuery({
  totalStudents,
  onSelectStudent,
}: StudentJoiningTimelineProps) {
  // Query up to 500 students when no pre-fetched student list is passed
  const {
    data: queryData,
    isLoading: isQueryLoading,
    isError: isQueryError,
  } = useStudents({ limit: 500 });

  const [extraStudents, setExtraStudents] = useState<StudentListItem[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentNextCursor, setCurrentNextCursor] = useState<string | null | undefined>(undefined);

  const initialNextCursor = queryData?.meta?.nextCursor ?? null;
  const nextCursorToUse = currentNextCursor !== undefined ? currentNextCursor : initialNextCursor;
  const hasMoreToUse = nextCursorToUse !== null;

  const handleLoadMore = async () => {
    if (!nextCursorToUse || isLoadingMore) return;
    try {
      setIsLoadingMore(true);
      const res = await fetchStudents({ limit: 500, cursor: nextCursorToUse });
      if (res?.data) {
        setExtraStudents((prev) => [...prev, ...res.data]);
        setCurrentNextCursor(res.meta?.nextCursor ?? null);
      }
    } catch (err) {
      console.error('Failed to load more timeline students:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const effectiveStudents = useMemo(() => {
    const base = queryData?.data ?? [];
    return extraStudents.length > 0 ? [...base, ...extraStudents] : base;
  }, [queryData?.data, extraStudents]);

  return (
    <StudentJoiningTimelinePresentation
      students={effectiveStudents}
      isLoading={isQueryLoading}
      isError={isQueryError}
      totalStudents={queryData?.meta?.total ?? totalStudents}
      onSelectStudent={onSelectStudent}
      hasMore={hasMoreToUse}
      isLoadingMore={isLoadingMore}
      onLoadMore={handleLoadMore}
    />
  );
}

export function StudentJoiningTimeline(props: StudentJoiningTimelineProps) {
  if (props.students !== undefined) {
    return (
      <StudentJoiningTimelinePresentation
        students={props.students}
        isLoading={Boolean(props.isLoading)}
        isError={Boolean(props.isError)}
        totalStudents={props.totalStudents}
        onSelectStudent={props.onSelectStudent}
      />
    );
  }

  return <StudentJoiningTimelineWithQuery {...props} />;
}
