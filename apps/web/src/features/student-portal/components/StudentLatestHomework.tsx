'use client';

import React, { useMemo } from 'react';
import { CalendarDays, Clock, Download, Edit3, FileText, MapPin } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useStudentGroup, useStudentGroupSessions } from '@/features/student-portal/hooks/useStudentPortal';
import { formatArabicDate, formatArabicTime } from '@/lib/utils/formatters';

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function formatDate(value: string) {
  const date = new Date(value);
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${ARABIC_MONTHS[date.getMonth()]}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${ARABIC_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Renders the homework attached to the latest group lesson session and lets the
 * student open the assessment to submit their answers.
 */
export function StudentLatestHomework() {
  const now = new Date();
  const { data: groupData } = useStudentGroup();
  const { data: sessions = [], isLoading } = useStudentGroupSessions({ month: now.getMonth() + 1, year: now.getFullYear() });

  const latestHomeworkSession = useMemo(() => {
    // Find sessions that have an assessment
    const withHomework = sessions.filter((session: any) => {
      const assessment = session.assessment;
      return Boolean(assessment && assessment.id);
    });
    if (withHomework.length === 0) return null;

    // Prioritize active or submitted homework, otherwise show the latest session homework
    const active = withHomework.filter((session: any) => {
      const assessment = session.assessment;
      if (assessment.submission && assessment.submission.status !== 'UNSOLVED') return true;
      if (assessment.dueDate && new Date(assessment.dueDate).getTime() >= Date.now()) return true;
      return false;
    });

    const candidates = active.length > 0 ? active : withHomework;
    return candidates.sort((a: any, b: any) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())[0];
  }, [sessions]);

  if (isLoading) {
    return <Card className="border-slate-100 shadow-sm"><CardContent className="flex items-center justify-center p-10"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" /></CardContent></Card>;
  }

  if (!latestHomeworkSession || !latestHomeworkSession.assessment) {
    return (
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="border-b border-slate-50 bg-slate-50/50 pb-4">
          <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />واجب آخر حصة دراسية</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8 text-slate-500 flex flex-col items-center">
            <FileText className="w-10 h-10 text-slate-300 mb-3" />
            <p>لا يوجد واجب مرتبط بحصص مجموعتك حالياً</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const assessment = latestHomeworkSession.assessment;
  const submission = assessment.submission;
  const worksheet = latestHomeworkSession.educationalContents?.[0];
  const isExpired = Boolean(assessment.dueDate && new Date(assessment.dueDate).getTime() < Date.now());
  const safeSubmission = submission || null;

  return (
    <Card className="border-slate-100 shadow-sm">
      <CardHeader className="border-b border-slate-50 bg-slate-50/50 pb-4">
        <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />واجب آخر حصة دراسية</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <Link href={`/student/homework?id=${assessment.id}`} className="block group/title">
              <h3 className="text-base font-extrabold text-slate-800 group-hover/title:text-primary-700 transition-colors">{latestHomeworkSession.topic || assessment.title}</h3>
              <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                <CalendarDays className="w-3.5 h-3.5" />
                {formatDate(latestHomeworkSession.sessionDate)} • {groupData?.group?.name || 'المجموعة الدراسية'}
              </p>
            </Link>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-sm leading-6 text-slate-600">
            {assessment.description || 'تسليم إجابة واجب الحصة.'
              ? <p>{assessment.description || 'مطلوب تسليم إجابة هذا الواجب قبل الموعد المحدد.'}</p>
              : null}
            {latestHomeworkSession.location && <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="w-3.5 h-3.5" />القاعة: {latestHomeworkSession.location}</p>}
          </div>

          {worksheet && (
            <a href={worksheet.downloadUrl || worksheet.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-primary-700 transition-colors hover:bg-primary-50">
              <Download className="h-4 w-4" />تحميل ملف أسئلة الواجب
            </a>
          )}

          {assessment.dueDate && (
            <p className={`flex items-center gap-1.5 text-xs font-semibold ${isExpired ? 'text-rose-600' : 'text-amber-700'}`}>
              <Clock className="w-3.5 h-3.5" />آخر موعد للتسليم: {formatArabicDate(assessment.dueDate)} — الساعة {formatArabicTime(assessment.dueDate)}
            </p>
          )}

          {safeSubmission ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <Badge variant="success" className="mb-2">✅ تم تسليم الحل</Badge>
              <p className="text-xs text-emerald-800 leading-6">
                {safeSubmission.submittedAt && `تم الرفع بتاريخ ${formatDateTime(safeSubmission.submittedAt)}`}
                {safeSubmission.attachmentUrl ? ` • ${safeSubmission.attachmentUrl.split('/').pop()}` : ''}
              </p>
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                {safeSubmission.status === 'GRADED' ? `درجتك: ${safeSubmission.scoreObtained ?? 0}/${assessment.totalScore}` : safeSubmission.status === 'SUBMITTED' ? 'بانتظار مراجعة الأستاذ' : 'قيد المعالجة'}
              </p>
              {safeSubmission.teacherFeedback && <p className="mt-1 text-xs text-emerald-800">ملاحظة الأستاذ: {safeSubmission.teacherFeedback}</p>}
            </div>
          ) : isExpired ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
              <Badge variant="error" className="mb-2">⏰ انتهى موعد التسليم</Badge>
              <p className="text-xs text-rose-700 font-medium">انتهت المدة المحددة لتسليم هذا الواجب. يرجى مراجعة المعلم.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <Badge variant="warning" className="mb-2">⚠️ بانتظار تسليم الحل</Badge>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/student/homework?id=${assessment.id}`}>
                  <Button type="button" className="bg-primary-600 hover:bg-primary-700 font-bold"><Edit3 className="h-4 w-4" />حل واجب الحصة الآن</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default StudentLatestHomework;
