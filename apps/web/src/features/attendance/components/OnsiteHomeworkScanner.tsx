'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ClipboardCheck, UserCheck, Volume2, VolumeX } from 'lucide-react';
import { useOnsiteHomeworkScanner } from '../hooks/useOnsiteHomeworkScanner';
import { HomeworkScannerViewport } from './homework-scanner/HomeworkScannerViewport';
import { HomeworkRecentActivityList } from './homework-scanner/HomeworkRecentActivityList';

interface OnsiteHomeworkScannerProps {
  sessionId: string;
  groupId?: string;
  assessmentId?: string;
  assessmentTitle?: string;
  onSuccess?: (student: any) => void;
}

export function OnsiteHomeworkScanner({
  sessionId,
  groupId,
  assessmentId = 'default-session-homework',
  assessmentTitle = 'واجب الحصة الدراسية',
  onSuccess,
}: OnsiteHomeworkScannerProps) {
  const {
    locked,
    facingMode,
    cameraKey,
    soundEnabled,
    setSoundEnabled,
    flashType,
    recentChecked,
    lastScanResult,
    checkedCount,
    handleScan,
    toggleFacingMode,
  } = useOnsiteHomeworkScanner({
    sessionId,
    groupId,
    assessmentId,
    onSuccess,
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Assessment & Counter Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm md:text-base">
              مسح واستلام الواجب في السنتر (Onsite QR Scan)
            </h3>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span>الواجب النشط:</span>
              <strong className="text-emerald-700 font-semibold">{assessmentTitle}</strong>
              <span>• الرصد يسجل الحضور تلقائياً</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="success" className="px-3 py-1.5 text-xs font-bold gap-1.5 shadow-xs">
            <UserCheck className="w-4 h-4" />
            <span>تم تسليم: {checkedCount} طالب</span>
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 px-2.5 text-xs"
            title={soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </Button>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-6 flex flex-col items-center">
          <HomeworkScannerViewport
            cameraKey={cameraKey}
            facingMode={facingMode}
            locked={locked}
            flashType={flashType}
            onScan={handleScan}
            onToggleFacingMode={toggleFacingMode}
          />

          <p className="text-xs text-slate-400 mt-3 text-center">
            قم بتوجيه كاميرا الهاتف نحو كود الطالب لمسح الواجب ورصد حضوره تلقائياً.
          </p>
        </div>

        {/* Live Result Feedback & Recent Checkins */}
        <HomeworkRecentActivityList
          lastScanResult={lastScanResult}
          recentChecked={recentChecked}
        />
      </div>
    </div>
  );
}
