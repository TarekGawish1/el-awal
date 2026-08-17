'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useGroupSessions, useSessionReport } from '@/features/attendance/hooks/use-attendance';
import { AttendanceReportCard } from '@/features/attendance/components/AttendanceReportCard';
import { QrScanner } from '@/features/attendance/components/QrScanner';
import { ManualAttendanceRoster } from '@/features/attendance/components/ManualAttendanceRoster';

export default function TeacherAttendancePage() {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'QR' | 'MANUAL'>('QR');

  const { data: groups, isLoading: isLoadingGroups, isError: isErrorGroups } = useGroups();
  
  const { 
    data: sessions, 
    isLoading: isLoadingSessions,
    isError: isErrorSessions
  } = useGroupSessions(selectedGroupId);

  const {
    data: report,
    isLoading: isLoadingReport,
    isError: isErrorReport
  } = useSessionReport(selectedSessionId);

  // Group selection handling
  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGroupId(e.target.value);
    setSelectedSessionId(''); // reset session when group changes
  };

  // Session selection handling
  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSessionId(e.target.value);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
        <h1 className="text-3xl font-extrabold text-slate-900">رصد الحضور والغياب</h1>
        <p className="mt-3 text-slate-500 text-lg">
          إدارة حضور الطلاب في المجموعات باستخدام الـ QR أو الإدخال اليدوي.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Group Selector */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              اختر المجموعة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoadingGroups ? (
              <div className="animate-pulse h-12 bg-slate-100 rounded-xl w-full"></div>
            ) : isErrorGroups ? (
              <p className="text-red-500 text-sm">فصل تحميل المجموعات. يرجى المحاولة مرة أخرى.</p>
            ) : !groups || groups.length === 0 ? (
              <p className="text-slate-500 text-sm">لا يوجد لديك مجموعات نشطة.</p>
            ) : (
              <Select
                value={selectedGroupId}
                onChange={handleGroupChange}
                className="w-full h-12 rounded-xl"
                options={[
                  { label: '-- اختر المجموعة --', value: '' },
                  ...groups.map((g) => ({
                    label: `${g.name} (${g.gradeLevel})`,
                    value: g.id,
                  }))
                ]}
              />
            )}
          </CardContent>
        </Card>

        {/* Session Selector */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              اختر الحصة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!selectedGroupId ? (
              <p className="text-slate-500 text-sm mt-2">يرجى اختيار المجموعة أولاً.</p>
            ) : isLoadingSessions ? (
              <div className="animate-pulse h-12 bg-slate-100 rounded-xl w-full"></div>
            ) : isErrorSessions ? (
              <p className="text-red-500 text-sm">فصل تحميل الحصص.</p>
            ) : !sessions || sessions.length === 0 ? (
              <p className="text-slate-500 text-sm mt-2">لا توجد حصص مسجلة لهذه المجموعة.</p>
            ) : (
              <Select
                value={selectedSessionId}
                onChange={handleSessionChange}
                className="w-full h-12 rounded-xl"
                options={[
                  { label: '-- اختر الحصة --', value: '' },
                  ...sessions.map((s) => {
                    const dateStr = new Date(s.sessionDate).toLocaleDateString('ar-EG');
                    return {
                      label: `${s.topic || 'حصة'} - ${dateStr} ${s.startTime ? `(${s.startTime})` : ''} ${s._count ? ` [${s._count.attendanceRecords} مسجل]` : ''}`,
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
        <div className="space-y-8">
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
