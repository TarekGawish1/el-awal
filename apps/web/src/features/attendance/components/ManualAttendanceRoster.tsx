'use client';

import React, { useState, useEffect } from 'react';
import { useManualAttendance } from '../hooks/use-attendance';
import { AttendanceRecord, AttendanceStatus, BatchAttendanceDto } from '../types/attendance.types';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

interface ManualAttendanceRosterProps {
  sessionId: string;
  records: AttendanceRecord[];
}

export function ManualAttendanceRoster({ sessionId, records }: ManualAttendanceRosterProps) {
  const [localRecords, setLocalRecords] = useState<Record<string, AttendanceStatus>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const { mutate, isPending, error, isSuccess } = useManualAttendance();

  useEffect(() => {
    const initialState: Record<string, AttendanceStatus> = {};
    records.forEach((r) => {
      initialState[r.studentId] = r.status;
    });
    setLocalRecords(initialState);
    setHasChanges(false);
  }, [records]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setLocalRecords((prev) => ({ ...prev, [studentId]: status }));
    setHasChanges(true);
  };

  const handleSave = () => {
    const payload: BatchAttendanceDto = {
      records: Object.entries(localRecords).map(([studentId, status]) => ({
        studentId,
        status,
      })),
    };

    mutate({ sessionId, payload }, {
      onSuccess: () => setHasChanges(false),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Class Roster</h3>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || isPending}
        >
          {isPending ? 'Saving...' : 'Save Attendance'}
        </Button>
      </div>

      {isSuccess && !hasChanges && (
        <Alert variant="success">Attendance records updated successfully.</Alert>
      )}

      {error && (
        <Alert variant="error">Failed to save attendance. Please try again.</Alert>
      )}

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm text-left rtl:text-right">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3">Student Name</th>
              <th className="px-6 py-3">Code</th>
              <th className="px-6 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  No students found in this roster.
                </td>
              </tr>
            ) : (
              records.map((record) => {
                const currentStatus = localRecords[record.studentId] || record.status;
                return (
                  <tr key={record.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-medium">{record.fullName}</td>
                    <td className="px-6 py-4 font-mono text-xs">{record.studentCode}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center space-x-2 rtl:space-x-reverse">
                        <button
                          onClick={() => handleStatusChange(record.studentId, 'PRESENT')}
                          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                            currentStatus === 'PRESENT'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleStatusChange(record.studentId, 'ABSENT')}
                          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                            currentStatus === 'ABSENT'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          onClick={() => handleStatusChange(record.studentId, 'EXCUSED')}
                          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                            currentStatus === 'EXCUSED'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          Excused
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
