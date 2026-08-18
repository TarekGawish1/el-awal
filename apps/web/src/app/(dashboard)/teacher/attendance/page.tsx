'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useTodaySessions, useSessionReport } from '@/features/attendance/hooks/use-attendance';
import { AttendanceReportCard } from '@/features/attendance/components/AttendanceReportCard';
import { QrScanner } from '@/features/attendance/components/QrScanner';
import { ManualAttendanceRoster } from '@/features/attendance/components/ManualAttendanceRoster';

const gradeOptions: Record<string, { label: string; value: string }[]> = {
  PRIMARY: [
    { label: 'الصف الأول الابتدائي', value: 'الصف الأول الابتدائي' },
    { label: 'الصف الثاني الابتدائي', value: 'الصف الثاني الابتدائي' },
    { label: 'الصف الثالث الابتدائي', value: 'الصف الثالث الابتدائي' },
    { label: 'الصف الرابع الابتدائي', value: 'الصف الرابع الابتدائي' },
    { label: 'الصف الخامس الابتدائي', value: 'الصف الخامس الابتدائي' },
    { label: 'الصف السادس الابتدائي', value: 'الصف السادس الابتدائي' },
  ],
  MIDDLE: [
    { label: 'الصف الأول الإعدادي', value: 'الصف الأول الإعدادي' },
    { label: 'الصف الثاني الإعدادي', value: 'الصف الثاني الإعدادي' },
    { label: 'الصف الثالث الإعدادي', value: 'الصف الثالث الإعدادي' },
  ],
  SECONDARY: [
    { label: 'الصف الأول الثانوي', value: 'الصف الأول الثانوي' },
    { label: 'الصف الثاني الثانوي', value: 'الصف الثاني الثانوي' },
    { label: 'الصف الثالث الثانوي', value: 'الصف الثالث الثانوي' },
  ],
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
  const [academicStage, setAcademicStage] = useState<string>('');
  const [gradeLevel, setGradeLevel] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'QR' | 'MANUAL'>('QR');

  const { 
    data: sessions, 
    isLoading: isLoadingSessions,
    isError: isErrorSessions
  } = useTodaySessions(academicStage, gradeLevel);

  const {
    data: report,
    isLoading: isLoadingReport,
    isError: isErrorReport
  } = useSessionReport(selectedSessionId);

  const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAcademicStage(e.target.value);
    setGradeLevel('');
    setSelectedSessionId('');
  };

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGradeLevel(e.target.value);
    setSelectedSessionId('');
  };

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSessionId(e.target.value);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
        <h1 className="text-3xl font-extrabold text-slate-900">رصد الحضور والغياب</h1>
        <p className="mt-3 text-slate-500 text-lg">
          لوحة إدارة الحضور اليومية. اختر المرحلة والصف لعرض مجموعات اليوم، ثم ابدأ في مسح الـ QR.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Stage Selector */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
              المرحلة الدراسية
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <Select
              value={academicStage}
              onChange={handleStageChange}
              className="w-full rounded-xl"
              options={[
                { label: '-- الكل --', value: '' },
                { label: 'الابتدائية', value: 'PRIMARY' },
                { label: 'الإعدادية', value: 'MIDDLE' },
                { label: 'الثانوية', value: 'SECONDARY' },
              ]}
            />
          </CardContent>
        </Card>

        {/* Grade Selector */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
              الصف الدراسي
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <Select
              value={gradeLevel}
              onChange={handleGradeChange}
              disabled={!academicStage}
              className="w-full rounded-xl"
              options={[
                { label: '-- الكل --', value: '' },
                ...(academicStage ? gradeOptions[academicStage] : []),
              ]}
            />
          </CardContent>
        </Card>

        {/* Session Selector */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-primary-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              مجموعات وحصص اليوم
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {isLoadingSessions ? (
              <div className="animate-pulse h-10 bg-slate-100 rounded-xl w-full"></div>
            ) : isErrorSessions ? (
              <p className="text-red-500 text-sm">فشل تحميل حصص اليوم.</p>
            ) : !sessions || sessions.length === 0 ? (
              <p className="text-slate-500 text-sm">لا توجد حصص مجدولة لليوم.</p>
            ) : (
              <Select
                value={selectedSessionId}
                onChange={handleSessionChange}
                className="w-full rounded-xl border-primary-200 focus:border-primary-500"
                options={[
                  { label: '-- اختر المجموعة لبدء الرصد --', value: '' },
                  ...sessions.map((s: any) => {
                    const groupName = s.group?.name || 'مجموعة';
                    const formattedTime = s.startTime ? formatTime12h(s.startTime) : '';
                    let timeLabel = formattedTime ? ` (الساعة ${formattedTime})` : '';
                    
                    if (formattedTime && (groupName.includes(`(الساعة ${formattedTime})`) || groupName.includes(formattedTime))) {
                      timeLabel = '';
                    }

                    return {
                      label: `${groupName}${timeLabel}`,
                      value: s.id,
                    };
                  })
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>

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
                      <svg className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      مسح QR
                    </Button>
                    <Button
                      variant={activeTab === 'MANUAL' ? 'primary' : 'outline'}
                      onClick={() => setActiveTab('MANUAL')}
                      className={`w-40 rounded-xl ${activeTab === 'MANUAL' ? 'shadow-md shadow-primary-500/20' : ''}`}
                    >
                      <svg className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
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
