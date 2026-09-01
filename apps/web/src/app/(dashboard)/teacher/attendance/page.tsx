'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MultiSelectDropdown } from '@/features/groups/components/MultiSelectDropdown';
import { useTodaySessions, useSessionReport } from '@/features/attendance/hooks/use-attendance';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useStoredAcademicPeriod } from '@/features/groups/hooks/useAcademicPeriod';
import { AttendanceReportCard } from '@/features/attendance/components/AttendanceReportCard';
import { QrScanner } from '@/features/attendance/components/QrScanner';
import { ManualAttendanceRoster } from '@/features/attendance/components/ManualAttendanceRoster';
import { QrHomeworkScanner } from '@/features/attendance/components/QrHomeworkScanner';
import { SearchableSessionCombobox } from '@/features/attendance/components/SearchableSessionCombobox';

import { useTeacherSessions } from '@/features/schedules/hooks/useSchedules';
import { RotateCcw, MapPin, Calendar, Users, QrCode, ClipboardList, BookOpen, Sparkles, ClipboardCheck, SlidersHorizontal, X, Clock } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'QR' | 'MANUAL' | 'QR_HOMEWORK'>('QR');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

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

  // Auto-select session based on paramSessionId, paramGroupId, or nearest time, and sync with active filters
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
      const todayGroupSession =
        (filteredSessions || []).find(
          (s: any) => String(s.groupId).toLowerCase() === cleanGroupId
        ) ||
        (sessions || []).find(
          (s: any) => String(s.groupId).toLowerCase() === cleanGroupId
        );
      if (todayGroupSession) {
        if (selectedSessionId !== todayGroupSession.id) {
          setSelectedSessionId(todayGroupSession.id);
        }
        return;
      }

      // If no session found in today's list, find closest in all semester sessions for this group
      const allGroupSession =
        (filteredAllSessions || []).find(
          (s: any) => String(s.groupId).toLowerCase() === cleanGroupId
        ) ||
        (allTeacherSessions || []).find(
          (s: any) => String(s.groupId).toLowerCase() === cleanGroupId
        );
      if (allGroupSession) {
        if (selectedSessionId !== allGroupSession.id) {
          setSelectedSessionId(allGroupSession.id);
        }
        return;
      }

      if (selectedSessionId) return;
    }

    // 3. Check if currently selected session is still valid under active filters
    const isCurrentInFilteredToday = filteredSessions.some(
      (s: any) => String(s.id).toLowerCase() === String(selectedSessionId).toLowerCase()
    );
    const isCurrentInFilteredAll = filteredAllSessions.some(
      (s: any) => String(s.id).toLowerCase() === String(selectedSessionId).toLowerCase()
    );

    if (selectedSessionId && (isCurrentInFilteredToday || isCurrentInFilteredAll)) {
      return; // Current selection remains valid
    }

    // 4. Auto-select nearest today's session or first available matching session
    if (filteredSessions.length > 0) {
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
      } else {
        setSelectedSessionId(filteredSessions[0].id);
      }
    } else if (filteredAllSessions.length > 0) {
      setSelectedSessionId(filteredAllSessions[0].id);
    } else {
      setSelectedSessionId('');
    }
  }, [filteredSessions, filteredAllSessions, sessions, allTeacherSessions, selectedSessionId, paramSessionId, paramGroupId]);

  const { data: report, isLoading: isLoadingReport, isError: isErrorReport } = useSessionReport(selectedSessionId);

  const hasActiveFilters =
    selectedStages.length > 0 || selectedGrades.length > 0 || selectedLocations.length > 0;

  const resetFilters = () => {
    setSelectedStages([]);
    setSelectedGrades([]);
    setSelectedLocations([]);
  };

  const activeFiltersCount = (selectedStages.length > 0 ? 1 : 0) + (selectedGrades.length > 0 ? 1 : 0) + (selectedLocations.length > 0 ? 1 : 0);

  // Helper to find the active session object
  const activeSessionObj = useMemo(() => {
    if (!selectedSessionId) return null;
    return filteredSessions.find(s => s.id === selectedSessionId) ||
           sessions?.find((s: any) => s.id === selectedSessionId) ||
           filteredAllSessions.find(s => s.id === selectedSessionId) ||
           allTeacherSessions?.find((s: any) => s.id === selectedSessionId);
  }, [selectedSessionId, filteredSessions, sessions, filteredAllSessions, allTeacherSessions]);

  const activeGroup = useMemo(() => {
    if (!activeSessionObj) return null;
    return groupMap.get(activeSessionObj.groupId) || (activeSessionObj as unknown as { group?: any }).group;
  }, [activeSessionObj, groupMap]);

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-2 sm:px-6 lg:px-8 space-y-6">
      
      {/* 1. Header (Compact) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">رصد الحضور والغياب</h1>
          <p className="mt-1 text-slate-500 text-sm">أداة تسجيل حضور الطلاب للحصة الحالية.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
          <div className="px-2.5 py-1 text-xs font-bold bg-white text-slate-700 rounded-lg shadow-xs">
            {activeYear || '2026-2027'}
          </div>
          <div className="px-2.5 py-1 text-xs font-bold bg-white text-slate-700 rounded-lg shadow-xs">
            {activeTerm === 'SECOND_TERM' ? 'الترم الثاني' : 'الترم الأول'}
          </div>
        </div>
      </div>

      {/* 2. Primary Session Selector & Drawer Toggle */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          {isErrorSessions ? (
             <p className="text-red-500 text-xs">فشل تحميل حصص اليوم.</p>
          ) : (
            <SearchableSessionCombobox
              label="الحصة الحالية"
              countLabel={`${filteredSessions.length} حصص اليوم`}
              sessions={filteredSessions}
              selectedSessionId={selectedSessionId}
              onSelectSession={(id) => setSelectedSessionId(id)}
              placeholder="-- اختر الحصة --"
              isLoading={isLoadingSessions}
              isTodayPicker={true}
              groupMap={groupMap}
              className="w-full"
            />
          )}
        </div>
        
        <div className="md:pt-6 flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={() => setIsFilterDrawerOpen(true)}
            className="w-full md:w-auto h-11 rounded-xl bg-white border-slate-200 text-slate-700 hover:bg-slate-50 relative"
          >
            <SlidersHorizontal className="w-4 h-4 ml-2" />
            فلاتر متقدمة
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shadow-sm">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* 3. Filter Drawer Overlay */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex rtl:flex-row-reverse justify-end">
          <div 
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsFilterDrawerOpen(false)}
          />
          <div className="relative w-full max-w-sm h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right rtl:slide-in-from-left duration-300">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">تصفية الحصص</h2>
              <button 
                onClick={() => setIsFilterDrawerOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {activeFiltersCount > 0 && (
                 <div className="flex items-center justify-between bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <span className="text-xs font-semibold text-blue-700">يوجد فلاتر نشطة</span>
                    <button onClick={resetFilters} className="text-xs text-blue-600 hover:text-blue-800 underline">إعادة ضبط</button>
                 </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">المرحلة الدراسية</label>
                <MultiSelectDropdown
                  placeholder="اختر المرحلة"
                  allSelectedLabel="جميع المراحل"
                  options={[
                    { label: 'المرحلة الابتدائية', value: 'المرحلة الابتدائية' },
                    { label: 'المرحلة الإعدادية', value: 'المرحلة الإعدادية' },
                    { label: 'المرحلة الثانوية', value: 'المرحلة الثانوية' },
                  ]}
                  selectedValues={selectedStages}
                  onChange={handleStagesChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">الصف الدراسي</label>
                <MultiSelectDropdown
                  placeholder="اختر الصف"
                  allSelectedLabel="جميع الصفوف"
                  withSearch={availableGradeOptions.length > 5}
                  options={availableGradeOptions}
                  selectedValues={selectedGrades}
                  onChange={setSelectedGrades}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">المكان / السنتر</label>
                <MultiSelectDropdown
                  placeholder="اختر المكان"
                  allSelectedLabel="جميع الأماكن"
                  withSearch={true}
                  options={availableLocations.map((loc) => ({
                    label: loc,
                    value: loc,
                    icon: <MapPin className="w-3.5 h-3.5 text-slate-400" />,
                  }))}
                  selectedValues={selectedLocations}
                  onChange={setSelectedLocations}
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <SearchableSessionCombobox
                  label="البحث في جميع حصص الترم"
                  countLabel={`${filteredAllSessions.length} حصة مجدولة`}
                  sessions={filteredAllSessions}
                  selectedSessionId={selectedSessionId}
                  onSelectSession={(id) => {
                     setSelectedSessionId(id);
                     setIsFilterDrawerOpen(false);
                  }}
                  placeholder="-- ابحث في جميع الحصص --"
                  isLoading={isLoadingAllSessions}
                  isTodayPicker={false}
                  groupMap={groupMap}
                />
              </div>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-slate-50">
              <Button onClick={() => setIsFilterDrawerOpen(false)} className="w-full">
                تطبيق وإغلاق
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Active Session Context & Workspace */}
      {selectedSessionId ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Active Context Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-2 h-full bg-primary-500"></div>
            <div className="p-5 pl-5 pr-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100">
                    أنت تسجل حضور:
                  </span>
                  {activeGroup && (
                    <span className="text-xs font-semibold text-slate-500">
                      {getStageName(activeGroup.gradeLevel)}
                    </span>
                  )}
                  {paramSessionId && (
                     <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        مختارة من الجدول
                     </span>
                  )}
                </div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  {report?.groupName || (activeGroup?.name || 'مجموعة دراسية')}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600 font-medium">
                   {activeSessionObj?.startTime && (
                     <div className="flex items-center gap-1">
                       <Clock className="w-3.5 h-3.5 text-slate-400" />
                       {formatTime12h(activeSessionObj.startTime)}
                     </div>
                   )}
                   {activeGroup?.schedules?.[0]?.location && (
                     <div className="flex items-center gap-1">
                       <MapPin className="w-3.5 h-3.5 text-slate-400" />
                       {activeGroup.schedules[0].location}
                     </div>
                   )}
                </div>
              </div>
              
              {/* Inline Stats */}
              <div>
                {isLoadingReport ? (
                   <div className="animate-pulse h-8 w-40 bg-slate-100 rounded-lg"></div>
                ) : isErrorReport ? (
                   <div className="text-xs text-red-500 font-medium">فشل تحميل الإحصائيات</div>
                ) : report && (
                   <div className="mb-0">
                     <AttendanceReportCard metrics={report.metrics} />
                   </div>
                )}
              </div>
            </div>
            
            {/* Segmented Control / Tabs */}
            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
              <div className="flex p-1 bg-slate-200/50 rounded-xl max-w-md w-full">
                <button
                  onClick={() => setActiveTab('QR')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
                    activeTab === 'QR' 
                    ? 'bg-white text-primary-700 shadow-sm border border-slate-200' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  QR للحضور
                </button>
                <button
                  onClick={() => setActiveTab('QR_HOMEWORK')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
                    activeTab === 'QR_HOMEWORK' 
                    ? 'bg-white text-primary-700 shadow-sm border border-slate-200' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4" />
                  QR للواجب
                </button>
                <button
                  onClick={() => setActiveTab('MANUAL')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
                    activeTab === 'MANUAL' 
                    ? 'bg-white text-primary-700 shadow-sm border border-slate-200' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  يدوي
                </button>
              </div>
            </div>
          </div>

          {/* Workspace Area */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 sm:p-6 relative">
             <div className="absolute top-0 right-0 h-1.5 w-full bg-gradient-to-r from-transparent via-primary-500/20 to-primary-500 rounded-t-2xl"></div>
            {activeTab === 'QR' && <QrScanner sessionId={selectedSessionId} />}
            {activeTab === 'QR_HOMEWORK' && <QrHomeworkScanner sessionId={selectedSessionId} />}
            {activeTab === 'MANUAL' && (
              <ManualAttendanceRoster 
                sessionId={selectedSessionId} 
                records={report?.records || []}
                homeworkRecords={report?.homeworkRecords || []}
              />
            )}
          </div>
          
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed text-center">
          <Calendar className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700">لا توجد حصة محددة</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-sm">
            {activeFiltersCount > 0 
              ? 'لا توجد حصص مطابقة للفلاتر المحددة. جرب إعادة ضبط الفلاتر.' 
              : 'اختر حصة من القائمة للبدء في رصد الحضور.'}
          </p>
          {activeFiltersCount > 0 && (
            <Button variant="outline" onClick={resetFilters} className="mt-4 rounded-xl">
              إعادة ضبط الفلاتر
            </Button>
          )}
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

