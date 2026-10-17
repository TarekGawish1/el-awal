'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { Calendar, TrendingUp, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatArabicDate, formatArabicTime } from '@/lib/utils/formatters';

interface AttendanceRecord {
  id: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | string;
  recordingMethod?: string;
  recordedAt?: string;
  session?: {
    sessionDate?: string;
    topic?: string;
    group?: {
      name?: string;
    };
  };
}

interface StudentAttendanceHistoryProps {
  records: AttendanceRecord[];
}

export function StudentAttendanceHistory({ records }: StudentAttendanceHistoryProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;

  const totalSessions = records.length;
  const presentCount = records.filter((r) => r.status === 'PRESENT').length;
  const absentCount = records.filter((r) => r.status === 'ABSENT').length;
  const excusedCount = records.filter((r) => r.status === 'EXCUSED').length;

  const attendanceRate = totalSessions > 0
    ? Math.round((presentCount / totalSessions) * 100)
    : 100;

  const totalPages = Math.ceil(records.length / PAGE_SIZE);
  const paginatedRecords = records.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <Badge variant="success" className="gap-1 font-medium"><CheckCircle2 className="w-3 h-3" /> حاضر</Badge>;
      case 'ABSENT':
        return <Badge variant="error" className="gap-1 font-medium"><XCircle className="w-3 h-3" /> غائب</Badge>;
      case 'EXCUSED':
        return <Badge variant="warning" className="gap-1 font-medium"><Clock className="w-3 h-3" /> معذر</Badge>;
      default:
        return <Badge variant="outline">غير مسجل</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm shadow-slate-200/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">نسبة الحضور</p>
              <h4 className="text-xl font-bold text-slate-800 mt-0.5">{attendanceRate}%</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm shadow-slate-200/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">أيام الحضور</p>
              <h4 className="text-xl font-bold text-slate-800 mt-0.5">{presentCount}</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm shadow-slate-200/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">أيام الغياب</p>
              <h4 className="text-xl font-bold text-slate-800 mt-0.5">{absentCount + excusedCount}</h4>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Card */}
      <Card className="border-none shadow-sm shadow-slate-200/50">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-md flex items-center gap-2 font-bold text-slate-800">
            <Calendar className="w-5 h-5 text-primary-600" />
            سجل الحضور والغياب التفصيلي
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {records.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">لا توجد سجلات حضور مسجلة بعد.</p>
              <p className="text-xs text-slate-400 mt-1">عند حضورك الحصص وتأكيد الكود الخاص بك، ستظهر السجلات هنا.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto w-full">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500">
                      <th className="py-3.5 px-6 font-semibold">التاريخ</th>
                      <th className="py-3.5 px-6 font-semibold">المجموعة الدراسية / الدرس</th>
                      <th className="py-3.5 px-6 font-semibold">حالة الحضور</th>
                      <th className="py-3.5 px-6 font-semibold">طريقة الرصد</th>
                      <th className="py-3.5 px-6 font-semibold">وقت الرصد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-4 px-6 font-medium text-slate-800">
                          {formatArabicDate(record.session?.sessionDate)}
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-semibold text-slate-800 block">
                            {record.session?.group?.name}
                          </span>
                          {record.session?.topic && (
                            <span className="text-xs text-slate-500 block mt-0.5">
                              {record.session.topic}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {getStatusBadge(record.status)}
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-500">
                          {record.recordingMethod === 'QR_SCAN' ? 'مسح QR Code' : 'رصد يدوي'}
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-500 font-mono">
                          {record.recordedAt ? formatArabicTime(record.recordedAt) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="block md:hidden divide-y divide-slate-100">
                {paginatedRecords.map((record) => (
                  <div key={record.id} className="p-4 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          {record.session?.group?.name || 'مجموعة دراسية'}
                        </span>
                        {record.session?.topic && (
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            📖 {record.session.topic}
                          </span>
                        )}
                      </div>
                      {getStatusBadge(record.status)}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                      <span className="font-medium text-slate-700">
                        📅 {formatArabicDate(record.session?.sessionDate)}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {record.recordingMethod === 'QR_SCAN' ? '📱 مسح QR' : '✍️ رصد يدوي'}
                        {record.recordedAt && ` • ${formatArabicTime(record.recordedAt)}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-slate-100">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={records.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setCurrentPage}
                    itemLabel="سجل حضور"
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
