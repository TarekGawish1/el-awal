'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  Plus,
  Wand2,
  Search,
  Users,
  FileText,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  QrCode,
  CheckCircle2,
  Filter,
  Check,
  CalendarDays,
  ListFilter,
  Layers,
} from 'lucide-react';
import { useTeacherSessions } from '../hooks/useSchedules';
import { LessonSessionItem } from '../types/schedules.types';
import { formatArabicTimeRange12H, toLocalDateStr } from '../utils/time.utils';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';

import { MiniCalendar } from './MiniCalendar';
import { WeeklyCalendarView } from './WeeklyCalendarView';
import { MonthlyCalendarView } from './MonthlyCalendarView';
import { DailyCalendarView } from './DailyCalendarView';
import { SessionDetailsModal } from './SessionDetailsModal';
import { CreateSessionModal } from './CreateSessionModal';
import { EditSessionModal } from './EditSessionModal';
import { GenerateSessionsModal } from './GenerateSessionsModal';
import { UploadModal } from '@/features/content/components/UploadModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';

type CalendarViewMode = 'weekly' | 'monthly' | 'daily' | 'list';

const GRADE_COLOR_MAP: Record<string, { dot: string; text: string; bg: string }> = {
  'الصف الثالث الثانوي': { dot: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50' },
  'الصف الثاني الثانوي': { dot: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
  'الصف الأول الثانوي': { dot: 'bg-sky-500', text: 'text-sky-700', bg: 'bg-sky-50' },
  'الصف الثالث الإعدادي': { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  'الصف الثاني الإعدادي': { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  'الصف الأول الإعدادي': { dot: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50' },
};

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

  // Filter sessions by selected grades
  const sessions = useMemo(() => {
    if (selectedGrades.length === 0) return rawSessions;
    return rawSessions.filter((s) => s.group?.gradeLevel && selectedGrades.includes(s.group.gradeLevel));
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
    const day = d.getDay(); // 0 = Sun .. 6 = Sat
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
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4 relative z-20">
        {/* RIGHT SIDE: Current Date & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base sm:text-xl font-black text-slate-800 tracking-tight truncate min-w-0 min-w-[140px]">
              {headerDateLabel}
            </h2>

            <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 p-1 rounded-2xl border border-slate-100">
              {/* Note: In RTL, Next (Forward in time) is Left arrow, Prev (Backward in time) is Right arrow */}
              <button
                onClick={handlePrev}
                className="w-8 h-8 rounded-xl hover:bg-white hover:shadow-xs text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                title="السابق"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1 rounded-xl hover:bg-white hover:shadow-xs text-xs font-black text-slate-700 transition-all shrink-0 cursor-pointer"
              >
                اليوم
              </button>
              <button
                onClick={handleNext}
                className="w-8 h-8 rounded-xl hover:bg-white hover:shadow-xs text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                title="التالي"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* LEFT SIDE: Search, Filters, View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث في الحصص..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pr-9 pl-3 text-xs font-bold bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Filter Dropdown */}
            <div className="relative group/filter flex-1 sm:flex-none">
              <button className={`w-full sm:w-auto h-10 px-4 rounded-2xl border flex items-center justify-center gap-2 text-xs font-black transition-all ${
                selectedGrades.length > 0 
                  ? 'bg-primary-50 border-primary-200 text-primary-700' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
                <Filter className="w-4 h-4" />
                الفلاتر
                {selectedGrades.length > 0 && (
                  <span className="bg-primary-600 text-white text-[10px] px-1.5 py-0.5 rounded-md leading-none">
                    {selectedGrades.length}
                  </span>
                )}
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute left-0 sm:right-0 top-full mt-2 w-64 bg-white rounded-3xl shadow-xl border border-slate-100 p-4 opacity-0 invisible group-hover/filter:opacity-100 group-hover/filter:visible transition-all z-50 transform origin-top translate-y-2 group-hover/filter:translate-y-0">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-extrabold text-slate-800">تصفية الصفوف</h4>
                  {selectedGrades.length > 0 && (
                    <button
                      onClick={() => setSelectedGrades([])}
                      className="text-[10px] text-rose-600 hover:underline font-bold bg-rose-50 px-2 py-1 rounded-md"
                    >
                      مسح الفلاتر
                    </button>
                  )}
                </div>
                
                {distinctGrades.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">لا توجد صفوف متاحة</p>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {distinctGrades.map((grade) => {
                      const isChecked = selectedGrades.includes(grade);
                      return (
                        <button
                          key={grade}
                          onClick={() => toggleGradeFilter(grade)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-start cursor-pointer ${
                            isChecked
                              ? 'bg-primary-50 text-primary-700 border border-primary-100'
                              : 'hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <span>{grade}</span>
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="p-1 bg-slate-100 rounded-2xl flex items-center flex-1 sm:flex-none">
              <button
                onClick={() => setViewMode('daily')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-black transition-all text-center cursor-pointer ${
                  viewMode === 'daily'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                يومي
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-black transition-all text-center cursor-pointer ${
                  viewMode === 'weekly'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                أسبوعي
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-black transition-all text-center cursor-pointer ${
                  viewMode === 'monthly'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                شهري
              </button>
            </div>
          </div>
        </div>
      </div>

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

          {/* Next Upcoming Session Highlight Card (Teal style from photo) */}
          {nextUpcomingSession && (
            <div
              onClick={() => setActiveSession(nextUpcomingSession)}
              className="bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 text-white rounded-3xl p-5 shadow-lg shadow-teal-900/15 relative overflow-hidden transition-all hover:scale-[1.02] cursor-pointer group"
            >
              {/* Background decorative ring */}
              <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-teal-500/10 blur-xl pointer-events-none" />

              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/20">
                  تذكير الحصة القادمة
                </span>
                <span className="text-xs font-bold text-teal-300 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {formatArabicTimeRange12H(nextUpcomingSession.startTime || '16:00', nextUpcomingSession.endTime)}
                  </span>
                </span>
              </div>

              <h3 className="font-black text-base leading-snug mb-2 group-hover:text-teal-200 transition-colors">
                {nextUpcomingSession.topic || 'حصة بدون عنوان'}
              </h3>

              <div className="text-xs text-teal-100/90 font-medium mb-4 flex items-center gap-2">
                <span>{nextUpcomingSession.group?.name || 'مجموعة دراسية'}</span>
                <span>•</span>
                <span>{nextUpcomingSession.group?.gradeLevel}</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-teal-600/30">
                <div className="flex items-center gap-1.5 text-xs text-teal-200 font-bold">
                  <FileText className="w-3.5 h-3.5 text-teal-300" />
                  <span>{nextUpcomingSession.educationalContents?.length || 0} مرفقات</span>
                </div>

                <span className="text-xs font-bold text-teal-200 hover:text-white inline-flex items-center gap-1 underline underline-offset-4">
                  عرض التفاصيل ←
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Main Calendar Body (9 cols) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">

          {/* Calendar View Area */}
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
      <SessionDetailsModal
        isOpen={!!activeSession}
        session={activeSession}
        onClose={() => setActiveSession(null)}
        onEdit={(session) => setEditingSession(session)}
        onUploadAttachment={(session) => setUploadSession(session)}
      />

      {/* Create Session Modal */}
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

      {/* Edit Session Modal */}
      <EditSessionModal
        isOpen={!!editingSession}
        session={editingSession}
        onClose={() => setEditingSession(null)}
        sessions={rawSessions}
      />

      {/* Generate Sessions Modal */}
      <GenerateSessionsModal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
      />

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
