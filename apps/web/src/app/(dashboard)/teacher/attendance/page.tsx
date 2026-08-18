'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { RotateCcw, MapPin, Calendar, Users, QrCode, ClipboardList, BookOpen, Sparkles } from 'lucide-react';

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

export default function TeacherAttendancePage() {
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'QR' | 'MANUAL'>('QR');

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

    if (sessions && Array.isArray(sessions)) {
      sessions.forEach((s: any) => {
        const gGrade = s.group?.gradeLevel;
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
  }, [selectedStages, sessions]);

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
      const fullGroup = groupMap.get(s.groupId);
      const groupLocations = fullGroup?.schedules?.map((sch: any) => sch.location).filter(Boolean) || [];
      const matchesLocation =
        selectedLocations.length === 0 ||
        groupLocations.some((loc: string) => selectedLocations.includes(loc));

      return matchesStage && matchesGrade && matchesLocation;
    });
  }, [sessions, groupMap, selectedStages, selectedGrades, selectedLocations, activeYear, activeTerm]);

  // Auto-select nearest session on mount
  useEffect(() => {
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
      }
    } else if (filteredSessions.length > 0 && selectedSessionId) {
      // If currently selected session is no longer in filtered list, reset selection
      const exists = filteredSessions.some((s: any) => s.id === selectedSessionId);
      if (!exists) {
        setSelectedSessionId('');
      }
    }
  }, [filteredSessions, selectedSessionId]);

  const { data: report, isLoading: isLoadingReport, isError: isErrorReport } = useSessionReport(selectedSessionId);

  const hasActiveFilters =
    selectedStages.length > 0 || selectedGrades.length > 0 || selectedLocations.length > 0;

  const resetFilters = () => {
    setSelectedStages([]);
    setSelectedGrades([]);
    setSelectedLocations([]);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">رصد الحضور والغياب</h1>
            <p className="mt-3 text-slate-500 text-lg">
              لوحة إدارة الحضور اليومية. اختر المرحلة والصف لعرض مجموعات اليوم، ثم ابدأ في مسح الـ QR.
            </p>
          </div>
          
          {/* Active Academic Period Badge */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-100 p-2.5 rounded-2xl">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
              <Calendar className="w-3.5 h-3.5" />
              العام: {activeYear || '2026-2027'}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
              <BookOpen className="w-3.5 h-3.5" />
              {activeTerm === 'SECOND_TERM' ? 'الفصل الدراسي الثاني' : 'الفصل الدراسي الأول'}
            </div>
          </div>
        </div>
      </div>

      {/* Interconnected Filters Toolbar */}
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
              <RotateCcw className="w-3 h-3" />
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

        {/* Session Picker Dropdown */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-semibold text-neutral-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-primary-700">
              <Users className="w-4 h-4 text-primary-600" />
              الحصة / المجموعة المراد رصدها *
            </span>
            <span className="text-slate-400 font-normal">
              {filteredSessions.length} حصص متاحة لليوم
            </span>
          </label>

          {isLoadingSessions ? (
            <div className="animate-pulse h-10 bg-slate-100 rounded-xl w-full"></div>
          ) : isErrorSessions ? (
            <p className="text-red-500 text-sm">فشل تحميل حصص اليوم.</p>
          ) : filteredSessions.length === 0 ? (
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-500 text-center">
              لا توجد حصص مجدولة تطابق خيارات الفلترة المحددة لليوم.
            </div>
          ) : (
            <Select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full rounded-xl border-primary-200 focus:border-primary-500 font-semibold"
              options={[
                { label: '-- اختر الحصة لبدء الرصد --', value: '' },
                ...filteredSessions.map((s: any) => {
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

                  return {
                    label: `${groupName}${timeLabel}${loc}`,
                    value: s.id,
                  };
                }),
              ]}
            />
          )}
        </div>
      </div>

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
                  <div className="flex justify-center space-x-4 rtl:space-x-reverse">
                    <Button
                      variant={activeTab === 'QR' ? 'primary' : 'outline'}
                      onClick={() => setActiveTab('QR')}
                      className={`w-40 rounded-xl ${activeTab === 'QR' ? 'shadow-md shadow-primary-500/20' : ''}`}
                    >
                      <QrCode className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
                      مسح QR
                    </Button>
                    <Button
                      variant={activeTab === 'MANUAL' ? 'primary' : 'outline'}
                      onClick={() => setActiveTab('MANUAL')}
                      className={`w-40 rounded-xl ${activeTab === 'MANUAL' ? 'shadow-md shadow-primary-500/20' : ''}`}
                    >
                      <ClipboardList className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
                      رصد يدوي
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {activeTab === 'QR' ? (
                    <QrScanner sessionId={selectedSessionId} />
                  ) : (
                    <ManualAttendanceRoster sessionId={selectedSessionId} records={report.records} />
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
