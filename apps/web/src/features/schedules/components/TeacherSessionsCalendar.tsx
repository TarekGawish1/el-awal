'use client';

import { useState, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  Wand2,
} from 'lucide-react';
import { useTeacherSessions } from '../hooks/useSchedules';
import { LessonSessionItem } from '../types/schedules.types';
import { toLocalDateStr } from '../utils/time.utils';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';

import dynamic from 'next/dynamic';
import { MiniCalendar } from './MiniCalendar';
import { WeeklyCalendarView } from './WeeklyCalendarView';
import { MonthlyCalendarView } from './MonthlyCalendarView';
import { DailyCalendarView } from './DailyCalendarView';
import { CalendarTopToolbar, CalendarViewMode } from './calendar/CalendarTopToolbar';
import { NextUpcomingSessionCard } from './calendar/NextUpcomingSessionCard';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

const SessionDetailsModal = dynamic(
  () => import('./SessionDetailsModal').then((mod) => mod.SessionDetailsModal),
  { ssr: false }
);

const CreateSessionModal = dynamic(
  () => import('./CreateSessionModal').then((mod) => mod.CreateSessionModal),
  { ssr: false }
);

const EditSessionModal = dynamic(
  () => import('./EditSessionModal').then((mod) => mod.EditSessionModal),
  { ssr: false }
);

const GenerateSessionsModal = dynamic(
  () => import('./GenerateSessionsModal').then((mod) => mod.GenerateSessionsModal),
  { ssr: false }
);

const UploadModal = dynamic(
  () => import('@/features/content/components/UploadModal').then((mod) => mod.UploadModal),
  { ssr: false }
);

export function TeacherSessionsCalendar() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');

  // Modals state
  const [activeSession, setActiveSession] = useState<LessonSessionItem | null>(null);
  const [editingSession, setEditingSession] = useState<LessonSessionItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [createDatePrefill, setCreateDatePrefill] = useState<string | undefined>(undefined);
  const [createTimePrefill, setCreateTimePrefill] = useState<string | undefined>(undefined);
  const [uploadSession, setUploadSession] = useState<LessonSessionItem | null>(null);

  const { data: groups = [] } = useGroups();
  const { activeYear, activeTerm } = useStoredAcademicPeriod(groups as any);

  const queryParams = useMemo(() => {
    return {
      academicYear: activeYear || undefined,
      academicTerm: activeTerm || undefined,
      groupId: selectedGroupId !== 'ALL' ? selectedGroupId : undefined,
      search: searchQuery.trim() || undefined,
    };
  }, [activeYear, activeTerm, selectedGroupId, searchQuery]);

  const { data: rawSessions = [], isLoading, isError, error, refetch } = useTeacherSessions(queryParams);

  // Filter sessions by selected grades and guarantee chronological sorting
  const sessions = useMemo(() => {
    const list =
      selectedGrades.length === 0
        ? rawSessions
        : rawSessions.filter((s) => s.group?.gradeLevel && selectedGrades.includes(s.group.gradeLevel));

    return [...list].sort((a, b) => {
      const da = toLocalDateStr(a.sessionDate);
      const db = toLocalDateStr(b.sessionDate);
      if (da !== db) return da.localeCompare(db);
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
  }, [rawSessions, selectedGrades]);

  // Extract all distinct grade levels
  const distinctGrades = useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g) => g.gradeLevel && set.add(g.gradeLevel));
    rawSessions.forEach((s) => s.group?.gradeLevel && set.add(s.group.gradeLevel));
    return Array.from(set);
  }, [groups, rawSessions]);

  // Find the next upcoming or today's session for the "Reminder" card
  const nextUpcomingSession = useMemo(() => {
    const todayStr = toLocalDateStr(new Date());
    const upcoming = sessions.filter((s) => {
      const d = toLocalDateStr(s.sessionDate);
      return d >= todayStr;
    });
    return upcoming.length > 0 ? upcoming[0] : sessions[0] || null;
  }, [sessions]);

  // Header display string depending on current date and view
  const headerDateLabel = useMemo(() => {
    if (viewMode === 'monthly') {
      return currentDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
    }
    if (viewMode === 'daily') {
      return currentDate.toLocaleDateString('ar-EG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    // Weekly - Saturday to Friday
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const day = d.getDay();
    const diffToSaturday = (day + 1) % 7;
    const start = new Date(d);
    start.setDate(d.getDate() - diffToSaturday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startStr = `${start.getDate()} ${start.toLocaleDateString('ar-EG', { month: 'short' })}`;
    const endStr = `${end.getDate()} ${end.toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' })}`;
    return `${startStr} - ${endStr}`;
  }, [currentDate, viewMode]);

  // Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'monthly') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'weekly') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'monthly') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'weekly') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const toggleGradeFilter = (grade: string) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade],
    );
  };

  const handleAddSessionForSlot = (dateStr: string, timeStr?: string) => {
    setCreateDatePrefill(dateStr);
    setCreateTimePrefill(timeStr || '16:00');
    setIsCreateOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold shadow-2xs">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              جدول وحصص المعلم
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              الخط الزمني للحصص، مواعيد المجموعات، وربط المذكرات والفيديوهات مباشرة
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <Button
            variant="outline"
            onClick={() => setIsGenerateOpen(true)}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl text-sm font-bold h-11 px-5"
          >
            <Wand2 className="w-4 h-4 ml-2 text-purple-500" />
            توليد جدول الحصص
          </Button>

          <Button
            onClick={() => {
              setCreateDatePrefill(undefined);
              setCreateTimePrefill(undefined);
              setIsCreateOpen(true);
            }}
            className="rounded-2xl shadow-lg shadow-primary/20 text-sm font-black bg-primary-600 hover:bg-primary-700 text-white border-primary-600 h-11 px-6 transition-transform hover:scale-105"
          >
            <Plus className="w-5 h-5 ml-2" />
            إضافة حصة جديدة
          </Button>
        </div>
      </div>

      {/* Main Top Header Controls (Toolbar) */}
      <CalendarTopToolbar
        headerDateLabel={headerDateLabel}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedGrades={selectedGrades}
        onToggleGrade={toggleGradeFilter}
        onClearGrades={() => setSelectedGrades([])}
        distinctGrades={distinctGrades}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Google Calendar Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar Panel (3 cols) - Hidden on mobile, visible on lg+ */}
        <div className="hidden lg:block lg:col-span-4 xl:col-span-3 space-y-5">
          {/* Mini Month Calendar */}
          <MiniCalendar
            currentDate={currentDate}
            onSelectDate={(date) => setCurrentDate(date)}
            sessions={sessions}
          />

          {/* Next Upcoming Session Highlight Card */}
          {nextUpcomingSession && (
            <NextUpcomingSessionCard
              session={nextUpcomingSession}
              onSelect={setActiveSession}
            />
          )}
        </div>

        {/* Right Main Calendar Body (9 cols) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {isLoading ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 space-y-4">
              <Skeleton className="h-12 w-full rounded-2xl" />
              <div className="grid grid-cols-7 gap-3">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <Skeleton key={i} className="h-96 rounded-2xl" />
                ))}
              </div>
            </div>
          ) : isError ? (
            <div className="bg-white rounded-3xl p-8 border border-red-100 text-center">
              <p className="text-red-600 font-bold mb-2">فشل تحميل جدول الحصص</p>
              <p className="text-xs text-slate-500 mb-4">{(error as any)?.message || 'يرجى المحاولة'}</p>
              <Button size="sm" onClick={() => refetch()}>
                إعادة المحاولة
              </Button>
            </div>
          ) : (
            <>
              {viewMode === 'weekly' && (
                <WeeklyCalendarView
                  currentDate={currentDate}
                  sessions={sessions}
                  onSelectSession={(session) => setActiveSession(session)}
                  onAddSessionForDate={handleAddSessionForSlot}
                />
              )}

              {viewMode === 'monthly' && (
                <MonthlyCalendarView
                  currentDate={currentDate}
                  sessions={sessions}
                  onSelectSession={(session) => setActiveSession(session)}
                  onAddSessionForDate={(dateStr) => handleAddSessionForSlot(dateStr)}
                />
              )}

              {viewMode === 'daily' && (
                <DailyCalendarView
                  currentDate={currentDate}
                  sessions={sessions}
                  onSelectSession={(session) => setActiveSession(session)}
                  onAddSessionForDate={handleAddSessionForSlot}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Session Details Modal (Opened when clicking ANY session) */}
      {activeSession && (
        <SessionDetailsModal
          isOpen={!!activeSession}
          session={activeSession}
          onClose={() => setActiveSession(null)}
          onEdit={(session) => setEditingSession(session)}
          onUploadAttachment={(session) => setUploadSession(session)}
        />
      )}

      {/* Create Session Modal */}
      {isCreateOpen && (
        <CreateSessionModal
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false);
            setCreateDatePrefill(undefined);
            setCreateTimePrefill(undefined);
          }}
          initialDate={createDatePrefill}
          initialTime={createTimePrefill}
          sessions={rawSessions}
        />
      )}

      {/* Edit Session Modal */}
      {editingSession && (
        <EditSessionModal
          isOpen={!!editingSession}
          session={editingSession}
          onClose={() => setEditingSession(null)}
          sessions={rawSessions}
        />
      )}

      {/* Generate Sessions Modal */}
      {isGenerateOpen && (
        <GenerateSessionsModal
          isOpen={isGenerateOpen}
          onClose={() => setIsGenerateOpen(false)}
        />
      )}

      {/* Upload Attachment Modal */}
      {uploadSession && (
        <UploadModal
          isOpen={!!uploadSession}
          onClose={() => setUploadSession(null)}
          initialGroupId={uploadSession.groupId}
          initialGradeLevel={uploadSession.group?.gradeLevel}
          initialSessionId={uploadSession.id}
          initialSessionTopic={uploadSession.topic || ''}
        />
      )}
    </div>
  );
}
