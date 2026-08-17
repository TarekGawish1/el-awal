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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Attendance Management</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage physical classroom attendance using QR scanner or manual entry.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Group Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Group</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingGroups ? (
              <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            ) : isErrorGroups ? (
              <p className="text-red-500">Failed to load groups. Please try again.</p>
            ) : !groups || groups.length === 0 ? (
              <p className="text-gray-500">You have no active groups.</p>
            ) : (
              <Select
                value={selectedGroupId}
                onChange={handleGroupChange}
                className="w-full"
                options={[
                  { label: '-- Choose a Group --', value: '' },
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
        <Card>
          <CardHeader>
            <CardTitle>Select Lesson Session</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedGroupId ? (
              <p className="text-gray-500 mt-2">Please select a group first.</p>
            ) : isLoadingSessions ? (
              <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            ) : isErrorSessions ? (
              <p className="text-red-500">Failed to load sessions.</p>
            ) : !sessions || sessions.length === 0 ? (
              <p className="text-gray-500 mt-2">No physical sessions generated for this group.</p>
            ) : (
              <Select
                value={selectedSessionId}
                onChange={handleSessionChange}
                className="w-full"
                options={[
                  { label: '-- Choose a Session --', value: '' },
                  ...sessions.map((s) => {
                    const dateStr = new Date(s.sessionDate).toLocaleDateString('ar-EG');
                    return {
                      label: `${s.topic || 'حصة'} - ${dateStr} ${s.startTime ? `(${s.startTime})` : ''} ${s._count ? ` [${s._count.attendanceRecords} marked]` : ''}`,
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
        <div className="space-y-6">
          {isLoadingReport ? (
            <div className="animate-pulse h-32 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          ) : isErrorReport ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg">Failed to load session report.</div>
          ) : report ? (
            <>
              <AttendanceReportCard metrics={report.metrics} />

              <Card>
                <CardHeader>
                  <div className="flex justify-center space-x-4 rtl:space-x-reverse border-b dark:border-gray-700 pb-4">
                    <Button
                      variant={activeTab === 'QR' ? 'primary' : 'outline'}
                      onClick={() => setActiveTab('QR')}
                      className="w-40"
                    >
                      QR Scanner
                    </Button>
                    <Button
                      variant={activeTab === 'MANUAL' ? 'primary' : 'outline'}
                      onClick={() => setActiveTab('MANUAL')}
                      className="w-40"
                    >
                      Manual Entry
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
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
