'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSessionReport } from '@/features/attendance/hooks/use-attendance';
import { useGroup } from '@/features/groups/hooks/useGroups';
import { AttendanceReportCard } from '@/features/attendance/components/AttendanceReportCard';

import { QrScanner } from '@/features/attendance/components/QrScanner';
import { ManualAttendanceRoster } from '@/features/attendance/components/ManualAttendanceRoster';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ArrowRight,
  ClipboardCheck,
  QrCode,
  ClipboardList,
  Calendar,
  Users,
  AlertCircle,
} from 'lucide-react';

export default function GroupSessionDeliveryPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = (params?.id as string) || '';
  const sessionId = (params?.sessionId as string) || '';

  const { data: group } = useGroup(groupId);
  const { data: report, isLoading: isLoadingReport, isError } = useSessionReport(sessionId);

  const [activeTab, setActiveTab] = useState<'QR' | 'MANUAL'>('QR');

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`/teacher/groups/${groupId}`}
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowRight className="w-4 h-4 ml-1.5" />
            العودة لبيانات المجموعة ({group?.name || 'المجموعة الدراسية'})
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
              تسليم الواجب ورصد الحضور للحصة
            </h1>
            {group?.gradeLevel && (
              <Badge variant="info" className="text-xs font-bold">
                {group.gradeLevel}
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>المجموعة: <strong className="text-slate-700">{group?.name || 'جاري التحميل...'}</strong></span>
            {report?.topic && <span>• الموضوع: <strong className="text-slate-700">{report.topic}</strong></span>}
          </p>
        </div>

        <Link href={`/teacher/attendance?sessionId=${sessionId}&groupId=${groupId}`}>
          <Button variant="outline" size="sm" className="text-xs">
            عرض في مركز الحضور العام
          </Button>
        </Link>
      </div>

      {isLoadingReport ? (
        <div className="animate-pulse h-40 bg-slate-100 rounded-3xl w-full" />
      ) : isError ? (
        <div className="p-6 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 text-center text-sm font-semibold flex items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-500" />
          <span>تعذر تحميل تقرير الحصة الدراسية. يرجى التأكد من صحة الرابط أو المزامنة المحلية.</span>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* KPI Attendance & Delivery Card */}
          <AttendanceReportCard metrics={report.metrics} />

          {/* Main Delivery & Roll-Call Panel */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 px-6 py-5 bg-slate-50/30">
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  variant={activeTab === 'QR' ? 'primary' : 'outline'}
                  onClick={() => setActiveTab('QR')}
                  className={`min-w-[140px] rounded-xl ${activeTab === 'QR' ? 'shadow-md shadow-primary-500/20' : ''}`}
                >
                  <QrCode className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
                  مسح QR للحضور
                </Button>

                <Button
                  variant={activeTab === 'MANUAL' ? 'primary' : 'outline'}
                  onClick={() => setActiveTab('MANUAL')}
                  className={`min-w-[140px] rounded-xl ${activeTab === 'MANUAL' ? 'shadow-md shadow-primary-500/20' : ''}`}
                >
                  <ClipboardList className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
                  رصد يدوي للحضور
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {activeTab === 'QR' ? (
                <QrScanner sessionId={sessionId} />
              ) : (
                <ManualAttendanceRoster sessionId={sessionId} records={report.records} />
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
