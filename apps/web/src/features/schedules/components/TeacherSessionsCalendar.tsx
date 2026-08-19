'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  BookOpen,
  Layers,
  Plus,
  Wand2,
  Search,
  Filter,
  Users,
  FileText,
  UploadCloud,
  CheckCircle2,
  Edit2,
  Trash2,
  RotateCcw,
  QrCode,
  Sparkles,
  CalendarDays,
} from 'lucide-react';
import { useTeacherSessions, useDeleteSession } from '../hooks/useSchedules';
import { LessonSessionItem } from '../types/schedules.types';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';
import { CreateSessionModal } from './CreateSessionModal';
import { EditSessionModal } from './EditSessionModal';
import { GenerateSessionsModal } from './GenerateSessionsModal';
import { UploadModal } from '@/features/content/components/UploadModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';

const GRADE_OPTIONS = [
  { value: 'ALL', label: 'جميع الصفوف الدراسية' },
  { value: 'الصف الأول الثانوي', label: 'الصف الأول الثانوي' },
  { value: 'الصف الثاني الثانوي', label: 'الصف الثاني الثانوي' },
  { value: 'الصف الثالث الثانوي', label: 'الصف الثالث الثانوي' },
  { value: 'الصف الأول الإعدادي', label: 'الصف الأول الإعدادي' },
  { value: 'الصف الثاني الإعدادي', label: 'الصف الثاني الإعدادي' },
  { value: 'الصف الثالث الإعدادي', label: 'الصف الثالث الإعدادي' },
  { value: 'الصف الأول الابتدائي', label: 'الصف الأول الابتدائي' },
  { value: 'الصف الثاني الابتدائي', label: 'الصف الثاني الابتدائي' },
  { value: 'الصف الثالث الابتدائي', label: 'الصف الثالث الابتدائي' },
  { value: 'الصف الرابع الابتدائي', label: 'الصف الرابع الابتدائي' },
  { value: 'الصف الخامس الابتدائي', label: 'الصف الخامس الابتدائي' },
  { value: 'الصف السادس الابتدائي', label: 'الصف السادس الابتدائي' },
];

const TIMEFRAME_TABS = [
  { id: 'ALL', label: 'جميع الحصص' },
  { id: 'UPCOMING', label: 'الحصص القادمة' },
  { id: 'TODAY', label: 'حصص اليوم' },
  { id: 'PAST', label: 'الحصص السابقة' },
] as const;

export function TeacherSessionsCalendar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'ALL' | 'UPCOMING' | 'TODAY' | 'PAST'>('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<LessonSessionItem | null>(null);

  // Upload modal prefill state
  const [uploadSession, setUploadSession] = useState<LessonSessionItem | null>(null);

  const { data: groups = [] } = useGroups();
  const { activeYear, activeTerm } = useStoredAcademicPeriod(groups as any);

  const queryParams = useMemo(() => {
    return {
      academicYear: activeYear || undefined,
      academicTerm: activeTerm || undefined,
      gradeLevel: selectedGrade !== 'ALL' ? selectedGrade : undefined,
      groupId: selectedGroupId !== 'ALL' ? selectedGroupId : undefined,
      timeframe: selectedTimeframe,
      search: searchQuery.trim() || undefined,
    };
  }, [activeYear, activeTerm, selectedGrade, selectedGroupId, selectedTimeframe, searchQuery]);

  const { data: sessions = [], isLoading, isError, error, refetch } = useTeacherSessions(queryParams);
  const { mutate: deleteSessionMutate, isPending: isDeleting } = useDeleteSession();

  // Filter groups dropdown based on selected grade
  const groupOptions = useMemo(() => {
    const list = [{ value: 'ALL', label: 'جميع المجموعات الدراسية' }];
    const filtered = selectedGrade === 'ALL' ? groups : groups.filter((g) => g.gradeLevel === selectedGrade);
    filtered.forEach((g) => {
      list.push({ value: g.id, label: `${g.name} (${g.gradeLevel})` });
    });
    return list;
  }, [groups, selectedGrade]);

  // Calculations for quick metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const stats = useMemo(() => {
    let todayCount = 0;
    let upcomingCount = 0;
    let pastCount = 0;

    sessions.forEach((s) => {
      const dateStr = s.sessionDate.includes('T') ? s.sessionDate.split('T')[0] : s.sessionDate;
      if (dateStr === todayStr) todayCount++;
      else if (dateStr > todayStr) upcomingCount++;
      else pastCount++;
    });

    return { total: sessions.length, todayCount, upcomingCount, pastCount };
  }, [sessions, todayStr]);

  const handleDelete = (id: string, topic?: string | null) => {
    if (window.confirm(`هل أنت متأكد من حذف الحصة "${topic || 'حصة'}"؟`)) {
      deleteSessionMutate(id, {
        onSuccess: () => toast.success('تم حذف الحصة بنجاح'),
        onError: (err: any) => toast.error(err.message || 'حدث خطأ أثناء الحذف'),
      });
    }
  };

  const formatArabicDate = (dateStr: string) => {
    try {
      const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const [y, m, d] = cleanDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getSessionStatusBadge = (sessionDate: string) => {
    const cleanDate = sessionDate.includes('T') ? sessionDate.split('T')[0] : sessionDate;
    if (cleanDate === todayStr) {
      return (
        <span className="bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 animate-pulse">
          <CheckCircle2 className="w-3 h-3" />
          حصة اليوم
        </span>
      );
    } else if (cleanDate > todayStr) {
      return (
        <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
          قادمة
        </span>
      );
    } else {
      return (
        <span className="bg-slate-100 text-slate-600 text-[11px] font-medium px-2.5 py-0.5 rounded-full">
          مكتملة / سابقة
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">جدول وحصص المعلم</h1>
            <span className="bg-primary-50 text-primary-700 text-xs px-2.5 py-1 rounded-full font-bold border border-primary-100">
              {sessions.length} حصة مسجلة
            </span>
          </div>
          <p className="text-slate-500 text-sm">
            إدارة الخط الزمني للحصص، تسمية الدروس والموضوعات، وربطها تلقائياً بمذكرات ومرفقات الطلاب
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={() => setIsGenerateOpen(true)}
            className="border-purple-200 text-purple-700 hover:bg-purple-50 shadow-sm"
          >
            <Wand2 className="w-4 h-4 ml-1.5" />
            توليد جدول الحصص تلقائياً
          </Button>

          <Button onClick={() => setIsCreateOpen(true)} className="shadow-md shadow-primary/20">
            <Plus className="w-4 h-4 ml-1.5" />
            إضافة وتسمية حصة جديدة
          </Button>
        </div>
      </div>

      {/* Quick Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold">إجمالي الحصص</p>
            <p className="text-xl font-black text-slate-800">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold">حصص اليوم</p>
            <p className="text-xl font-black text-emerald-600">{stats.todayCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold">الحصص القادمة</p>
            <p className="text-xl font-black text-indigo-600">{stats.upcomingCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold">الحصص السابقة</p>
            <p className="text-xl font-black text-slate-700">{stats.pastCount}</p>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        {/* Timeframe Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto">
          {TIMEFRAME_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTimeframe(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedTimeframe === tab.id
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-center">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <Input
              type="search"
              className="pr-9 h-10 bg-slate-50/70 border-slate-200 text-xs sm:text-sm rounded-xl focus:bg-white"
              placeholder="ابحث باسم الحصة أو موضوع الدرس..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <Select
              aria-label="تصفية حسب الصف الدراسي"
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setSelectedGroupId('ALL');
              }}
              options={GRADE_OPTIONS}
              className="h-10 text-xs sm:text-sm bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white"
            />
          </div>

          <div>
            <Select
              aria-label="تصفية حسب المجموعة"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              options={groupOptions}
              className="h-10 text-xs sm:text-sm bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Sessions Timeline List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <Skeleton className="h-9 w-32 rounded-lg" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-red-100 p-6">
          <p className="text-red-600 font-bold mb-2">فشل تحميل جدول الحصص</p>
          <p className="text-xs text-slate-500 mb-4">{(error as any)?.message || 'يرجى المحاولة مرة أخرى'}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-8">
          <div className="mx-auto w-16 h-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">لا توجد حصص مسجلة في هذا النطاق</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6 text-sm">
            يمكنك إضافة حصة مفردة وتسميتها، أو استخدام التوليد التلقائي لإنشاء حصص المجموعة للشهر القادم بضغطة زر.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => setIsCreateOpen(true)} className="shadow-md shadow-primary/20">
              <Plus className="w-4 h-4 ml-1.5" />
              إضافة أول حصة
            </Button>
            <Button variant="outline" onClick={() => setIsGenerateOpen(true)}>
              <Wand2 className="w-4 h-4 ml-1.5" />
              توليد الحصص تلقائياً
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const dateFormatted = formatArabicDate(session.sessionDate);

            return (
              <div
                key={session.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-4">
                  {/* Calendar Date Block */}
                  <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 flex flex-col items-center justify-center shrink-0 text-primary-700">
                    <Calendar className="w-4 h-4 text-primary-600 mb-0.5" />
                    <span className="text-[11px] font-black leading-none">
                      {session.sessionDate.includes('T')
                        ? session.sessionDate.split('T')[0].slice(5)
                        : session.sessionDate.slice(5)}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-extrabold text-slate-800 text-base group-hover:text-primary-700 transition-colors">
                        {session.topic || 'حصة بدون عنوان'}
                      </h3>
                      {getSessionStatusBadge(session.sessionDate)}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1 text-slate-700 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-primary-600" />
                        {dateFormatted} {session.startTime ? `• ${session.startTime}` : ''}
                      </span>

                      {session.group && (
                        <span className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-bold">
                          <Users className="w-3 h-3 text-blue-500" />
                          {session.group.name} ({session.group.gradeLevel})
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                        <FileText className="w-3 h-3 text-amber-600" />
                        {session._count?.educationalContents || 0} مرفقات
                      </span>

                      <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <QrCode className="w-3 h-3 text-emerald-600" />
                        {session._count?.attendanceRecords || 0} حاضرين
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                  {/* Upload Content prefilled button */}
                  <button
                    onClick={() => setUploadSession(session)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="رفع ملزمة أو تسجيل لهذه الحصة"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>رفع ملزمة / فيديو</span>
                  </button>

                  {/* Attendance link */}
                  <Link
                    href={`/teacher/attendance`}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors"
                    title="تسجيل ورصد الحضور"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>رصد الحضور</span>
                  </Link>

                  {/* Edit Topic / Name */}
                  <button
                    onClick={() => setEditingSession(session)}
                    className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors border border-slate-200/80 cursor-pointer"
                    title="تعديل اسم أو موعد الحصة"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(session.id, session.topic)}
                    disabled={isDeleting}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    title="حذف الحصة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        initialGroupId={selectedGroupId !== 'ALL' ? selectedGroupId : undefined}
      />

      {/* Edit Session Modal */}
      <EditSessionModal
        isOpen={!!editingSession}
        session={editingSession}
        onClose={() => setEditingSession(null)}
      />

      {/* Generate Sessions Modal */}
      <GenerateSessionsModal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        initialGroupId={selectedGroupId !== 'ALL' ? selectedGroupId : undefined}
      />

      {/* Upload Modal (Triggered with pre-filled session topic & id) */}
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
