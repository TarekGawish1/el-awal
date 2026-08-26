'use client';

import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  MapPin,
  Paperclip,
  Users,
} from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useStudentGroup, useStudentGroupSessions } from '@/features/student-portal/hooks/useStudentPortal';
import { StudentGroupSession } from '@/features/student-portal/api/student.api';
import { SessionDetailsModal } from '@/features/student-portal/components/SessionDetailsModal';

const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function sessionDateKey(value: string) {
  return value.slice(0, 10);
}

function formatTime(value?: string | null) {
  if (!value) return '--';
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  let hour = Number(match[1]);
  const suffix = hour >= 12 ? 'م' : 'ص';
  hour = hour % 12 || 12;
  return `${hour}:${match[2]} ${suffix}`;
}

function attendanceForSession(session: StudentGroupSession, today: string) {
  if (session.sessionDate.slice(0, 10) > today) return { label: 'قادمة', variant: 'neutral' as const };
  if (session.attendance?.status === 'PRESENT') return { label: 'حاضر', variant: 'success' as const };
  if (session.attendance?.status === 'EXCUSED') return { label: 'عذر مقبول', variant: 'warning' as const };
  return { label: 'غائب', variant: 'error' as const };
}

function CalendarSessionCard({ session, onClick, today }: { session: StudentGroupSession; onClick: () => void; today: string }) {
  const attendance = attendanceForSession(session, today);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-primary-100 bg-primary-50/60 p-3 text-start shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
      aria-label={`تفاصيل ${session.topic || 'الحصة'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-xs font-extrabold leading-5 text-slate-800">{session.topic || 'حصة دراسية'}</p>
        <Badge variant={attendance.variant} size="sm">{attendance.label}</Badge>
      </div>
      <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-slate-500"><Clock3 className="h-3 w-3" />{formatTime(session.startTime)} - {formatTime(session.endTime)}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {session.assessment && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700"><FileText className="h-3 w-3" />واجب</span>}
        {session.educationalContents.length > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700"><Paperclip className="h-3 w-3" />ملخص</span>}
      </div>
    </button>
  );
}

export default function StudentGroupPage() {
  const initialDate = new Date();
  const [monthDate, setMonthDate] = useState(() => new Date(Date.UTC(initialDate.getFullYear(), initialDate.getMonth(), 1)));
  const [selectedSession, setSelectedSession] = useState<StudentGroupSession | null>(null);
  const query = { month: monthDate.getUTCMonth() + 1, year: monthDate.getUTCFullYear() };
  const { data: groupData, isLoading: isGroupLoading, isError: isGroupError } = useStudentGroup();
  const { data: sessions = [], isLoading: isSessionsLoading, isError: isSessionsError } = useStudentGroupSessions(query);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(Date.UTC(query.year, query.month - 1, 1));
    const daysInMonth = new Date(Date.UTC(query.year, query.month, 0)).getUTCDate();
    const leadingDays = firstDay.getUTCDay();
    const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
    return Array.from({ length: totalCells }, (_, index) => {
      const day = index - leadingDays + 1;
      return day > 0 && day <= daysInMonth ? new Date(Date.UTC(query.year, query.month - 1, day)) : null;
    });
  }, [query.month, query.year]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, StudentGroupSession[]>();
    sessions.forEach((session) => {
      const key = sessionDateKey(session.sessionDate);
      map.set(key, [...(map.get(key) || []), session]);
    });
    return map;
  }, [sessions]);

  const today = dateKey(new Date());
  const schedules = groupData?.group.schedules || [];

  if (isGroupLoading) {
    return <div className="space-y-5"><Skeleton className="h-48 w-full rounded-2xl" /><Skeleton className="h-[520px] w-full rounded-2xl" /></div>;
  }

  if (isGroupError || !groupData) {
    return <Alert variant="info"><Users className="h-5 w-5" /><span>لا توجد مجموعة دراسية نشطة مرتبطة بحسابك حالياً.</span></Alert>;
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-none bg-gradient-to-br from-primary-700 to-primary-900 text-white shadow-lg">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge className="mb-3 border-white/20 bg-white/10 text-white">المجموعة الدراسية</Badge>
              <h1 className="text-2xl font-extrabold md:text-3xl">{groupData.group.name}</h1>
              <p className="mt-2 text-sm text-primary-100">المعلم: {groupData.teacher.fullName}</p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-primary-100">
                <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{schedules.map((schedule) => dayNames[schedule.dayOfWeek]).join(' و ') || 'لم يحدد بعد'}</span>
                <span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{schedules[0] ? `${formatTime(schedules[0].startTime)} إلى ${formatTime(schedules[0].endTime)}` : 'لم يحدد الوقت'}</span>
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{schedules[0]?.location || 'القاعة الرئيسية'}</span>
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 md:min-w-56">
              <p className="text-xs text-primary-100">حالة الاشتراك الشهري</p>
              <Badge variant={groupData.subscription.isPaid ? 'success' : 'error'} className="mt-2 border-white/20 bg-white/90">
                {groupData.subscription.isPaid ? `تم سداد اشتراك شهر ${groupData.subscription.month}` : 'بانتظار السداد'}
              </Badge>
              <p className="mt-2 text-xs text-primary-100">المطلوب: {groupData.subscription.amountExpected} جنيه</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5 text-primary-600" />جدول حصص المجموعة</CardTitle>
            <p className="mt-1 text-xs text-slate-500">اضغط على أي حصة لعرض الحضور والواجبات والمرفقات.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMonthDate(new Date(Date.UTC(query.year, query.month - 2, 1)))} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="الشهر السابق"><ChevronRight className="h-4 w-4" /></button>
            <span className="min-w-32 text-center text-sm font-extrabold text-slate-800">{monthNames[query.month - 1]} {query.year}</span>
            <button type="button" onClick={() => setMonthDate(new Date(Date.UTC(query.year, query.month, 1)))} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="الشهر التالي"><ChevronLeft className="h-4 w-4" /></button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-5">
          {isSessionsError ? <Alert variant="error">تعذر تحميل جدول الحصص لهذا الشهر.</Alert> : isSessionsLoading ? <Skeleton className="h-[480px] w-full" /> : (
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-7 gap-2 pb-2">{dayNames.map((day) => <div key={day} className="py-2 text-center text-xs font-bold text-slate-500">{day}</div>)}</div>
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, index) => {
                    const key = day ? dateKey(day) : `empty-${index}`;
                    const daySessions = day ? (sessionsByDate.get(key) || []) : [];
                    return <div key={key} className={`min-h-32 rounded-xl border p-2 ${day ? 'border-slate-100 bg-white' : 'border-transparent bg-slate-50/40'}`}>
                      {day && <><div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${key === today ? 'bg-primary-600 text-white' : 'text-slate-500'}`}>{day.getUTCDate()}</div><div className="space-y-2">{daySessions.map((session) => <CalendarSessionCard key={session.id} session={session} today={today} onClick={() => setSelectedSession(session)} />)}</div></>}
                    </div>;
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSession && <SessionDetailsModal session={selectedSession} onClose={() => setSelectedSession(null)} />}
    </div>
  );
}
