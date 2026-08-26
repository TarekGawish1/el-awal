'use client';

import React from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  MapPin,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StudentGroupSession } from '../api/student.api';

interface SessionDetailsModalProps {
  session: StudentGroupSession;
  onClose: () => void;
}

const attendanceLabels: Record<string, { label: string; variant: 'success' | 'error' | 'warning' | 'neutral' }> = {
  PRESENT: { label: 'حاضر', variant: 'success' },
  ABSENT: { label: 'غائب', variant: 'error' },
  EXCUSED: { label: 'عذر مقبول', variant: 'warning' },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function formatRecordedAt(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ar-EG', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function SessionDetailsModal({ session, onClose }: SessionDetailsModalProps) {
  const attendance = session.attendance ? attendanceLabels[session.attendance.status] : null;
  const assessment = session.assessment;
  const submission = assessment?.submission;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-details-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white p-5">
          <div>
            <p className="mb-1 text-xs font-bold text-primary-600">تفاصيل الحصة</p>
            <h2 id="session-details-title" className="text-xl font-extrabold text-slate-900">
              {session.topic || 'حصة دراسية'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق تفاصيل الحصة"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-3">
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary-600" />{formatDate(session.sessionDate)}</div>
            <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary-600" />{session.startTime || '--'} - {session.endTime || '--'}</div>
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary-600" />{session.location || 'القاعة الرئيسية'}</div>
          </div>

          <section className="rounded-xl border border-slate-100 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-bold text-slate-800">سجل الحضور</h3>
              {attendance ? <Badge variant={attendance.variant}>{attendance.label}</Badge> : <Badge variant="neutral">لم يسجل بعد</Badge>}
            </div>
            {session.attendance ? (
              <p className="text-sm leading-7 text-slate-500">
                تم تسجيل الحضور {session.attendance.recordingMethod === 'QR_SCAN' ? 'عبر مسح رمز الـ QR' : 'يدوياً'}
                {session.attendance.recordedAt ? ` الساعة ${formatRecordedAt(session.attendance.recordedAt)}` : ''}
                {session.attendance.notes ? `، ${session.attendance.notes}` : ''}.
              </p>
            ) : (
              <p className="text-sm text-slate-500">لم يتم تسجيل حضور لهذه الحصة حتى الآن.</p>
            )}
          </section>

          <section className="rounded-xl border border-slate-100 p-4">
            <h3 className="mb-3 font-bold text-slate-800">واجب الحصة</h3>
            {assessment ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-700">{assessment.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {submission?.status === 'GRADED'
                      ? `تم التسليم، درجتك: ${submission.scoreObtained ?? 0}/${assessment.totalScore}`
                      : submission
                        ? 'تم التسليم وبانتظار التصحيح'
                        : 'لم يتم التسليم بعد'}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => { window.location.href = `/student/assessments?id=${assessment.id}`; }}
                >
                  {submission ? 'عرض الواجب' : 'فتح وتسليم الواجب'}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">لا يوجد واجب مرتبط بهذه الحصة.</p>
            )}
          </section>

          <section className="rounded-xl border border-slate-100 p-4">
            <h3 className="mb-3 font-bold text-slate-800">مرفقات وملخصات الحصة</h3>
            {session.educationalContents.length > 0 ? (
              <div className="space-y-2">
                {session.educationalContents.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.downloadUrl || attachment.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 text-sm transition-colors hover:border-primary-200 hover:bg-primary-50/40"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-slate-700"><FileText className="h-4 w-4 shrink-0 text-rose-500" /><span className="truncate">{attachment.title}</span></span>
                    <Download className="h-4 w-4 shrink-0 text-primary-600" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">لا توجد ملفات مرفقة بهذه الحصة.</p>
            )}
          </section>

          {session.isCancelled && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />تم إلغاء هذه الحصة{session.cancellationReason ? `: ${session.cancellationReason}` : ''}.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default SessionDetailsModal;
