'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { QrScanner } from '@/features/attendance/components/QrScanner';
import { QrHomeworkScanner } from '@/features/attendance/components/QrHomeworkScanner';
import { SessionLogbook } from '@/features/attendance/components/SessionLogbook';
import { formatTime12h } from '../utils/attendanceFormatters';
import type { AttendanceTab } from '../hooks/useTeacherAttendancePage';

interface AttendanceWorkspaceProps {
  isTooEarly: boolean;
  isEnded: boolean;
  activeTab: AttendanceTab;
  activeSessionObj: any;
  selectedSessionId: string;
  activeGroupId?: string;
  onSwitchToLogbook: () => void;
}

export function AttendanceWorkspace({
  isTooEarly,
  isEnded,
  activeTab,
  activeSessionObj,
  selectedSessionId,
  activeGroupId,
  onSwitchToLogbook,
}: AttendanceWorkspaceProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 sm:p-6 relative">
      <div className="absolute top-0 right-0 h-1.5 w-full bg-gradient-to-r from-transparent via-primary-500/20 to-primary-500 rounded-t-2xl"></div>

      {isTooEarly && activeTab !== 'LOGBOOK' ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-2">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">عفواً، موعد الحصة لم يحن بعد</h3>
          <p className="text-sm text-slate-500 max-w-md leading-relaxed">
            غير مسموح بفتح ماسح الـ QR أو تسجيل الحضور والواجب يدوياً إلا قبل موعد بداية الحصة بـ{' '}
            <span className="font-bold text-slate-700">15 دقيقة</span>.
          </p>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl mt-2 text-sm font-bold text-slate-700">
            <Clock className="w-4 h-4 text-slate-400" />
            موعد الحصة: {formatTime12h(activeSessionObj?.startTime || undefined)}
          </div>
        </div>
      ) : isEnded && activeTab !== 'LOGBOOK' ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">موعد الحصة انتهى</h3>
          <p className="text-sm text-slate-500 max-w-md leading-relaxed">
            غير مسموح بفتح ماسح الـ QR لأن وقت الحصة قد انتهى. يمكنك مراجعة وتعديل سجل الغياب من خلال الدفتر الشامل.
          </p>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl mt-2 text-sm font-bold text-slate-700">
            <Clock className="w-4 h-4 text-slate-400" />
            وقت النهاية: {formatTime12h((activeSessionObj as any)?.endTime || undefined)}
          </div>
          <Button
            onClick={onSwitchToLogbook}
            variant="outline"
            className="mt-4 rounded-xl font-bold border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            الانتقال للدفتر الشامل
          </Button>
        </div>
      ) : (
        <>
          {activeTab === 'QR' && <QrScanner sessionId={selectedSessionId} />}
          {activeTab === 'QR_HOMEWORK' && (
            <QrHomeworkScanner sessionId={selectedSessionId} groupId={activeGroupId} />
          )}
          {activeTab === 'LOGBOOK' && <SessionLogbook sessionId={selectedSessionId} />}
        </>
      )}
    </div>
  );
}
