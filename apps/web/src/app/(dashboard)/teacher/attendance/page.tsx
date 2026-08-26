'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { MultiSelectDropdown } from '@/features/groups/components/MultiSelectDropdown';
import { useTodaySessions, useSessionReport } from '@/features/attendance/hooks/use-attendance';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';
import { AttendanceReportCard } from '@/features/attendance/components/AttendanceReportCard';
import { QrScanner } from '@/features/attendance/components/QrScanner';
import { ManualAttendanceRoster } from '@/features/attendance/components/ManualAttendanceRoster';
import { OnsiteHomeworkScanner } from '@/features/attendance/components/OnsiteHomeworkScanner';
import { ManualHomeworkChecklist } from '@/features/attendance/components/ManualHomeworkChecklist';
import { useTeacherSessions } from '@/features/schedules/hooks/useSchedules';
import { RotateCcw, MapPin, Calendar, Users, QrCode, ClipboardList, BookOpen, Sparkles, ClipboardCheck } from 'lucide-react';

const STAGE_GRADES_MAP: Record<string, string[]> = {
  'المرحلة الابتدائية': [
    'الصف الأول الابتدائي',
    'الصف الثاني الابتدائي',
    'الصف الثالث الابتدائي',
    'الصف الرابع الابتدائي',
    'الصف الخامس الابتدائي',
    'الصف السادس الابتدائي',
  ],
  'المرحلة الإعدادية': [
    'الصف الأول الإعدادي',
    'الصف الثاني الإعدادي',
    'الصف الثالث الإعدادي',
  ],
  'المرحلة الثانوية': [
    'الصف الأول الثانوي',
    'الصف الثاني الثانوي',
    'الصف الثالث الثانوي',
  ],
};

const getStageName = (gradeLevel?: string) => {
  if (!gradeLevel) return 'أخرى';
  if (gradeLevel.includes('الابتدائي')) return 'المرحلة الابتدائية';
  if (gradeLevel.includes('الإعدادي')) return 'المرحلة الإعدادية';
  if (gradeLevel.includes('الثانوي')) return 'المرحلة الثانوية';
  return 'أخرى';
};

function formatTime12h(time24?: string) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  if (isNaN(h)) return time24;
  const ampm = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function TeacherAttendanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramSessionId = searchParams.get('sessionId');
  const paramGroupId = searchParams.get('groupId');

  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(paramSessionId || '');
  const [activeTab, setActiveTab] = useState<'QR' | 'MANUAL' | 'HOMEWORK_ONSITE'>('QR');
  const [homeworkMode, setHomeworkMode] = useState<'QR' | 'CHECKLIST'>('QR');

  const { data: groups } = useGroups();
  const { selectedYears, selectedTerms } = useStoredAcademicPeriod(groups);

  const activeYear = selectedYears[0] || undefined;
  const activeTerm = selectedTerms[0] || undefined;

  const { data: sessions, isLoading: isLoadingSessions, isError: isErrorSessions } = useTodaySessions(
    undefined,
    undefined,
    activeYear,
    activeTerm,
  );

  const { data: allTeacherSessions = [], isLoading: isLoadingAllSessions } = useTeacherSessions({
    academicYear: activeYear,
    academicTerm: activeTerm,
    timeframe: 'ALL',
  });

  // Create a fast lookup map from groupId to group (with schedules and locations)
  const groupMap = useMemo(() => {
    if (!groups || !Array.isArray(groups)) return new Map();
    return new Map(groups.map((g) => [g.id, g]));
  }, [groups]);

  // Extract all unique places / locations
  const availableLocations = useMemo(() => {
    const locSet = new Set<string>();
    if (groups && Array.isArray(groups)) {
      groups.forEach((g) => {
        g.schedules?.forEach((s) => {
          if (s.location && s.location.trim()) locSet.add(s.location.trim());
        });
      });
    }
    return Array.from(locSet);
  }, [groups]);

  // Calculate available grade options dynamically based on selected stages
  const availableGradeOptions = useMemo(() => {
    let gradesList: string[] = [];

    if (selectedStages.length > 0) {
      selectedStages.forEach((stage) => {
        if (STAGE_GRADES_MAP[stage]) {
          gradesList.push(...STAGE_GRADES_MAP[stage]);
        }
      });
    } else {
      Object.values(STAGE_GRADES_MAP).forEach((grades) => {
        gradesList.push(...grades);
      });
    }

    if (allTeacherSessions && Array.isArray(allTeacherSessions)) {
      allTeacherSessions.forEach((s: any) => {
        const g = groupMap.get(s.groupId) || s.group;
        const gGrade = g?.gradeLevel;
        if (gGrade && !gradesList.includes(gGrade)) {
          const sStage = getStageName(gGrade);
          if (selectedStages.length === 0 || selectedStages.includes(sStage)) {
            gradesList.push(gGrade);
          }
        }
      });
    }

    return Array.from(new Set(gradesList)).map((grade) => ({
      label: grade,
      value: grade,
    }));
  }, [selectedStages, allTeacherSessions, groupMap]);

  // Handle stage change & prune non-matching grades
  const handleStagesChange = useCallback((newStages: string[]) => {
    setSelectedStages(newStages);
    if (newStages.length > 0) {
      setSelectedGrades((prevGrades) =>
        prevGrades.filter((grade) => {
          const stage = getStageName(grade);
          return newStages.includes(stage);
        })
      );
    }
  }, []);

  // Filter today's sessions strictly based on stages, grades, locations, and active academic period
  const filteredSessions = useMemo(() => {
    if (!sessions || !Array.isArray(sessions)) return [];
    return sessions.filter((s: any) => {
      const g = groupMap.get(s.groupId) || s.group;
      const gGrade = g?.gradeLevel || '';
      const stage = getStageName(gGrade);

      // Academic Year & Semester strict check
      if (activeYear && g?.academicYear && g.academicYear !== activeYear) {
        return false;
      }
      if (activeTerm && g?.academicTerm && g.academicTerm !== activeTerm) {
        return false;
      }

      // Stage filter
      const matchesStage = selectedStages.length === 0 || selectedStages.includes(stage);

      // Grade filter
      const matchesGrade = selectedGrades.length === 0 || selectedGrades.includes(gGrade);

      // Location filter
      const fullGroup = groupMap.get(s.groupId) || g;
      const groupLocations = fullGroup?.schedules?.map((sch: any) => sch.location).filter(Boolean) || [];
      const matchesLocation =
        selectedLocations.length === 0 ||
        groupLocations.some((loc: string) => selectedLocations.includes(loc));

      return matchesStage && matchesGrade && matchesLocation;
    });
  }, [sessions, groupMap, selectedStages, selectedGrades, selectedLocations, activeYear, activeTerm]);

  // Filter all semester sessions strictly based on stages, grades, locations, and active academic period
  const filteredAllSessions = useMemo(() => {
    if (!allTeacherSessions || !Array.isArray(allTeacherSessions)) return [];
    return allTeacherSessions.filter((s: any) => {
      const g = groupMap.get(s.groupId) || s.group;
      const gGrade = g?.gradeLevel || '';
      const stage = getStageName(gGrade);

      if (activeYear && g?.academicYear && g.academicYear !== activeYear) {
        return false;
      }
      if (activeTerm && g?.academicTerm && g.academicTerm !== activeTerm) {
        return false;
      }

      const matchesStage = selectedStages.length === 0 || selectedStages.includes(stage);
      const matchesGrade = selectedGrades.length === 0 || selectedGrades.includes(gGrade);

      const fullGroup = groupMap.get(s.groupId) || g;
      const groupLocations = fullGroup?.schedules?.map((sch: any) => sch.location).filter(Boolean) || [];
      const matchesLocation =
        selectedLocations.length === 0 ||
        groupLocations.some((loc: string) => selectedLocations.includes(loc));

      return matchesStage && matchesGrade && matchesLocation;
    });
  }, [allTeacherSessions, groupMap, selectedStages, selectedGrades, selectedLocations, activeYear, activeTerm]);

  // Auto-select session based on paramSessionId, paramGroupId, or nearest time
  useEffect(() => {
    // 1. Explicit sessionId passed in URL
    if (paramSessionId) {
      if (selectedSessionId !== paramSessionId) {
        setSelectedSessionId(paramSessionId);
      }
      return;
    }

    // 2. Explicit groupId passed in URL
    if (paramGroupId) {
      const cleanGroupId = String(paramGroupId).toLowerCase();
      // Look for today's session for this group
      const todayGroupSession = filteredSessions.find(
        (s: any) => String(s.groupId).toLowerCase() === cleanGroupId
      );
      if (todayGroupSession) {
        setSelectedSessionId(todayGroupSession.id);
        return;
      }

      // If no session found in today's list, find closest in all semester sessions for this group
      const allGroupSession = filteredAllSessions.find(
        (s: any) => String(s.groupId).toLowerCase() === cleanGroupId
      );
      if (allGroupSession) {
        setSelectedSessionId(allGroupSession.id);
        return;
      }
    }

    // 3. General auto-selection from today's sessions
    if (filteredSessions.length > 0 && !selectedSessionId) {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();

      let activeSession: any = null;
      let minDiff = Infinity;

      for (const s of filteredSessions) {
        if (!s.startTime) continue;
        const [h, m] = s.startTime.split(':').map(Number);
        if (isNaN(h)) continue;

        const sessionMins = h * 60 + m;
        const diff = Math.abs(sessionMins - nowMins);

        if (diff <= 120 && diff < minDiff) {
          minDiff = diff;
          activeSession = s;
        }
      }

      if (activeSession) {
        setSelectedSessionId(activeSession.id);
      } else if (filteredSessions[0]) {
        setSelectedSessionId(filteredSessions[0].id);
      }
    }
  }, [filteredSessions, filteredAllSessions, selectedSessionId, paramSessionId, paramGroupId]);

  const { data: report, isLoading: isLoadingReport, isError: isErrorReport } = useSessionReport(selectedSessionId);

  const hasActiveFilters =
    selectedStages.length > 0 || selectedGrades.length > 0 || selectedLocations.length > 0;

  const resetFilters = () => {
    setSelectedStages([]);
    setSelectedGrades([]);
    setSelectedLocations([]);
  };

  const todaySelectOptions = useMemo(() => {
    const optionsList = filteredSessions.map((s: any) => {
      const g = groupMap.get(s.groupId) || s.group;
      const groupName = g?.name || 'مجموعة';
      const formattedTime = s.startTime ? formatTime12h(s.startTime) : '';
      let timeLabel = formattedTime ? ` (الساعة ${formattedTime})` : '';

      if (
        formattedTime &&
        (groupName.includes(`(الساعة ${formattedTime})`) || groupName.includes(formattedTime))
      ) {
        timeLabel = '';
      }

      const loc = g?.schedules?.[0]?.location ? ` - 📍 ${g.schedules[0].location}` : '';
      const topic = s.topic ? ` - 📖 ${s.topic}` : '';

      return {
        label: `${groupName}${timeLabel}${topic}${loc}`,
        value: s.id,
      };
    });

    return [
      { label: `-- اختر من حصص اليوم (${filteredSessions.length} حصة) --`, value: '' },
      ...optionsList,
    ];
  }, [filteredSessions, groupMap]);

  const allSessionsSelectOptions = useMemo(() => {
    const optionsList = filteredAllSessions.map((s: any) => {
      const g = groupMap.get(s.groupId) || s.group;
      const groupName = g?.name || 'مجموعة';
      const formattedTime = s.startTime ? formatTime12h(s.startTime) : '';

      let dateLabel = '';
      if (s.sessionDate) {
        const d = new Date(s.sessionDate);
        if (!isNaN(d.getTime())) {
          dateLabel = d.toLocaleDateString('ar-EG', {
            weekday: 'short',
            day: 'numeric',
            month: 'numeric',
          });
        }
      }

      const timePart = formattedTime ? ` (${formattedTime})` : '';
      const topic = s.topic ? ` - ${s.topic}` : '';
      const loc = g?.schedules?.[0]?.location ? ` - 📍 ${g.schedules[0].location}` : '';

      return {
        label: `📅 ${dateLabel} | ${groupName}${timePart}${topic}${loc}`,
        value: s.id,
      };
    });

    return [
      { label: `-- اختر من جميع حصص الترم (${filteredAllSessions.length} حصة) --`, value: '' },
      ...optionsList,
    ];
  }, [filteredAllSessions, groupMap]);

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-2 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">رصد الحضور والغياب</h1>
            <p className="mt-1 sm:mt-3 text-slate-500 text-sm sm:text-lg">
              لوحة إدارة الحضور اليومية. اختر المرحلة والصف لعرض مجموعات اليوم، ثم ابدأ في مسح الـ QR.
            </p>
          </div>
          
          {/* Active Academic Period Badge */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-100 p-2 sm:p-2.5 rounded-2xl">
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
              <Calendar className="w-3.5 h-3.5" />
              العام: {activeYear || '2026-2027'}
            </div>
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
              <BookOpen className="w-3.5 h-3.5" />
              {activeTerm === 'SECOND_TERM' ? 'الفصل الدراسي الثاني' : 'الفصل الدراسي الأول'}
            </div>
          </div>
        </div>
      </div>

      {/* If opened directly for a specific session from Calendar: show sleek focused banner instead of dropdown filters */}
      {paramSessionId ? (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-primary-50 p-6 rounded-3xl border border-emerald-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  حصة محددة من جدول الحصص
                </span>
                {report?.groupName && (
                  <span className="text-xs font-bold text-slate-500">
                    {report.topic || 'رصد الحضور'}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-slate-900 mt-1">
                {report?.groupName || 'جاري تحميل بيانات المجموعة...'}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                الماسح الضوئي مخصص حصرياً لطلاب هذه المجموعة فقط.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                router.push('/teacher/attendance');
              }}
              className="text-xs rounded-xl bg-white hover:bg-slate-50 border-slate-200 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 ml-1.5" />
              اختيار حصة أخرى
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                router.push('/teacher/schedules');
              }}
              className="text-xs rounded-xl bg-white hover:bg-slate-50 border-slate-200 shadow-xs"
            >
              العودة لجدول الحصص
            </Button>
          </div>
        </div>
      ) : (
        /* Interconnected Filters Toolbar for general navigation */
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-600" />
              تصفية واختيار حصص اليوم ({activeYear || '2026-2027'} - {activeTerm === 'SECOND_TERM' ? 'ترم ثانٍ' : 'ترم أول'})
            </h2>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary-600 transition-colors font-medium cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                إعادة تعيين الفلاتر
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            {/* Stage MultiSelect Checkboxes Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">المرحلة الدراسية</label>
              <MultiSelectDropdown
                placeholder="المرحلة الدراسية"
                allSelectedLabel="جميع المراحل الدراسية"
                options={[
                  { label: 'المرحلة الابتدائية', value: 'المرحلة الابتدائية' },
                  { label: 'المرحلة الإعدادية', value: 'المرحلة الإعدادية' },
                  { label: 'المرحلة الثانوية', value: 'المرحلة الثانوية' },
                ]}
                selectedValues={selectedStages}
                onChange={handleStagesChange}
              />
            </div>

            {/* Grade Level MultiSelect Checkboxes Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">الصف الدراسي</label>
              <MultiSelectDropdown
                placeholder="الصف الدراسي"
                allSelectedLabel="جميع الصفوف الدراسية"
                withSearch={availableGradeOptions.length > 5}
                options={availableGradeOptions}
                selectedValues={selectedGrades}
                onChange={setSelectedGrades}
              />
            </div>

            {/* Location / Place MultiSelect Checkboxes Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">المكان / السنتر</label>
              <MultiSelectDropdown
                placeholder="المكان / السنتر"
                allSelectedLabel="جميع الأماكن والسناتر"
                withSearch={true}
                options={availableLocations.map((loc) => ({
                  label: loc,
                  value: loc,
                  icon: <MapPin className="w-3.5 h-3.5 text-primary-600" />,
                }))}
                selectedValues={selectedLocations}
                onChange={setSelectedLocations}
              />
            </div>
          </div>

          {/* Dual Session Pickers: حصص اليوم & جميع حصص الترم */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. حصص اليوم */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  حصص اليوم
                </span>
                <span className="text-slate-400 font-medium text-[11px]">
                  {filteredSessions.length} حصص متاحة لليوم
                </span>
              </label>

              {isLoadingSessions ? (
                <div className="animate-pulse h-10 bg-slate-100 rounded-xl w-full"></div>
              ) : isErrorSessions ? (
                <p className="text-red-500 text-xs">فشل تحميل حصص اليوم.</p>
              ) : (
                <Select
                  value={
                    filteredSessions.some(
                      (s: any) => String(s.id).toLowerCase() === String(selectedSessionId).toLowerCase()
                    )
                      ? selectedSessionId
                      : ''
                  }
                  onChange={(e) => {
                    if (e.target.value) setSelectedSessionId(e.target.value);
                  }}
                  className="w-full rounded-xl border-emerald-200 focus:border-emerald-500 font-semibold bg-emerald-50/20"
                  options={todaySelectOptions}
                />
              )}
            </div>

            {/* 2. جميع حصص الترم (السابقة والقادمة) */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-primary-700 font-bold">
                  <BookOpen className="w-4 h-4 text-primary-600" />
                  جميع حصص الترم (السابقة والمستقبلية)
                </span>
                <span className="text-slate-400 font-medium text-[11px]">
                  {filteredAllSessions.length} حصة مجدولة
                </span>
              </label>

              {isLoadingAllSessions ? (
                <div className="animate-pulse h-10 bg-slate-100 rounded-xl w-full"></div>
              ) : (
                <Select
                  value={
                    filteredAllSessions.some(
                      (s: any) => String(s.id).toLowerCase() === String(selectedSessionId).toLowerCase()
                    )
                      ? selectedSessionId
                      : ''
                  }
                  onChange={(e) => {
                    if (e.target.value) setSelectedSessionId(e.target.value);
                  }}
                  className="w-full rounded-xl border-primary-200 focus:border-primary-500 font-semibold bg-primary-50/20"
                  options={allSessionsSelectOptions}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Workspace */}
      {selectedSessionId && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {isLoadingReport ? (
            <div className="animate-pulse h-32 bg-slate-100 rounded-3xl w-full"></div>
          ) : isErrorReport ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl">فشل تحميل تقرير الحصة.</div>
          ) : report ? (
            <>
              <AttendanceReportCard metrics={report.metrics} />

              <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                <CardHeader className="border-b border-slate-100 px-6 py-5 bg-slate-50/30">
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button
                      variant={activeTab === 'QR' ? 'primary' : 'outline'}
                      onClick={() => setActiveTab('QR')}
                      className={`min-w-[130px] rounded-xl ${activeTab === 'QR' ? 'shadow-md shadow-primary-500/20' : ''}`}
                    >
                      <QrCode className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
                      مسح QR للحضور
                    </Button>
                    <Button
                      variant={activeTab === 'MANUAL' ? 'primary' : 'outline'}
                      onClick={() => setActiveTab('MANUAL')}
                      className={`min-w-[130px] rounded-xl ${activeTab === 'MANUAL' ? 'shadow-md shadow-primary-500/20' : ''}`}
                    >
                      <ClipboardList className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
                      رصد يدوي للحضور
                    </Button>
                    <Button
                      variant={activeTab === 'HOMEWORK_ONSITE' ? 'primary' : 'outline'}
                      onClick={() => setActiveTab('HOMEWORK_ONSITE')}
                      className={`min-w-[200px] rounded-xl ${
                        activeTab === 'HOMEWORK_ONSITE'
                          ? 'shadow-md shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      <ClipboardCheck className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
                      تسليم الواجب والحضور (QR / يدوي)
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {activeTab === 'QR' ? (
                    <QrScanner sessionId={selectedSessionId} />
                  ) : activeTab === 'MANUAL' ? (
                    <ManualAttendanceRoster sessionId={selectedSessionId} records={report.records} />
                  ) : (
                    <div className="space-y-6">
                      {/* Mode selector between Fast QR Scan and Manual Checklist */}
                      <div className="flex justify-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit mx-auto">
                        <button
                          type="button"
                          onClick={() => setHomeworkMode('QR')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            homeworkMode === 'QR'
                              ? 'bg-white text-emerald-800 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <QrCode className="w-4 h-4" />
                          <span>مسح QR السريع للواجب</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHomeworkMode('CHECKLIST')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            homeworkMode === 'CHECKLIST'
                              ? 'bg-white text-emerald-800 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <ClipboardList className="w-4 h-4" />
                          <span>قائمة الفحص اليدوي للواجب</span>
                        </button>
                      </div>

                      {homeworkMode === 'QR' ? (
                        <OnsiteHomeworkScanner
                          sessionId={selectedSessionId}
                          groupId={report.groupId}
                        />
                      ) : (
                        <ManualHomeworkChecklist
                          sessionId={selectedSessionId}
                          groupId={report.groupId}
                        />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function TeacherAttendancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold">جاري تحميل لوحة رصد الحضور...</div>}>
      <TeacherAttendanceContent />
    </Suspense>
  );
}

