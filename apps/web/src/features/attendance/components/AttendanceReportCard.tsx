import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { SessionReportMetrics } from '../types/attendance.types';

interface AttendanceReportCardProps {
  metrics: SessionReportMetrics;
}

export function AttendanceReportCard({ metrics }: AttendanceReportCardProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Session Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div className="p-4 bg-gray-50 rounded-lg dark:bg-gray-800">
            <p className="text-sm text-gray-500 mb-1">Total</p>
            <p className="text-2xl font-bold">{metrics.totalEnrolled}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg dark:bg-green-900/20">
            <p className="text-sm text-green-600 mb-1">Present</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{metrics.presentCount}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg dark:bg-red-900/20">
            <p className="text-sm text-red-600 mb-1">Absent</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{metrics.absentCount}</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg dark:bg-yellow-900/20">
            <p className="text-sm text-yellow-600 mb-1">Excused</p>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{metrics.excusedCount}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-900/20">
            <p className="text-sm text-blue-600 mb-1">Rate</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{metrics.attendanceRatePercentage}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
