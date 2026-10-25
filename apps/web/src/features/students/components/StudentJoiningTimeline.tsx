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

interface StudentJoiningTimelineProps {
  students: StudentListItem[];
  isLoading: boolean;
  isError: boolean;
  onSelectStudent: (studentId: string) => void;
}

export function StudentJoiningTimeline({
  students,
  isLoading,
  isError,
  onSelectStudent,
}: StudentJoiningTimelineProps) {
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
    return {
      total: sortedStudents.length,
      groupLinkCount,
      approvedRequestCount,
      manualCount,
      latestDate: sortedStudents[0]?.createdAt
        ? getJoiningRelativeTime(sortedStudents[0].createdAt)
        : null,
    };
  }, [sortedStudents]);

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
        totalCount={sortedStudents.length}
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
                className="mt-2 text-xs rounded-xl"
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
      </div>
    </div>
  );
}
