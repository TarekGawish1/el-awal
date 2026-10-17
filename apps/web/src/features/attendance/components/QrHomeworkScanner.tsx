'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ClipboardCheck, UserCheck, Volume2, VolumeX } from 'lucide-react';
import { useQrHomeworkScanner } from '../hooks/useQrHomeworkScanner';
import { QrHomeworkScannerCamera } from './QrHomeworkScannerCamera';
import { QrHomeworkManualList } from './QrHomeworkManualList';

interface QrHomeworkScannerProps {
  sessionId: string;
  groupId?: string;
  assessmentId?: string;
  assessmentTitle?: string;
  onSuccess?: (student: any) => void;
}

export function QrHomeworkScanner({
  sessionId,
  groupId,
  assessmentId = 'default-session-homework',
  assessmentTitle = 'واجب الحصة الدراسية',
  onSuccess,
}: QrHomeworkScannerProps) {
  const {
    activeAssessmentId,
    setActiveAssessmentId,
    availableAssessments,
    autoHomeworkLabel,
    locked,
    setLocked,
    facingMode,
    cameraKey,
    soundEnabled,
    setSoundEnabled,
    flashType,
    scannedStudent,
    setScannedStudent,
    lastScanResult,
    checkedCount,
    localHomeworkRecords,
    sessionReport,
    handleScan,
    handleRecordHomework,
    handleRemoveHomework,
    handleManualRecord,
    toggleFacingMode,
  } = useQrHomeworkScanner({
    sessionId,
    groupId,
    assessmentId,
    assessmentTitle,
    onSuccess,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm md:text-base">
              QR للواجب و الحضور معاً
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-xs font-semibold text-slate-600">الواجب المراد تقييمه:</span>
              <select
                value={activeAssessmentId}
                onChange={(e) => setActiveAssessmentId(e.target.value)}
                className="text-xs font-bold bg-white border border-indigo-200 rounded-lg px-2.5 py-1 text-slate-800 focus:ring-1 focus:ring-indigo-500 shadow-xs cursor-pointer"
              >
                <option value="default-session-homework">{autoHomeworkLabel} (تلقائي)</option>
                {availableAssessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="info" className="px-3 py-1.5 text-xs font-bold gap-1.5 shadow-xs">
            <UserCheck className="w-4 h-4" />
            <span>تم تقييم: {checkedCount} طالب</span>
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 px-2.5 text-xs"
            title={soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-indigo-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <QrHomeworkScannerCamera
          cameraKey={cameraKey}
          facingMode={facingMode}
          onToggleFacingMode={toggleFacingMode}
          onScan={handleScan}
          locked={locked}
          scannedStudent={scannedStudent}
          flashType={flashType}
          onRecordHomework={handleRecordHomework}
          onCancelScannedStudent={() => {
            setScannedStudent(null);
            setLocked(false);
          }}
        />

        <QrHomeworkManualList
          lastScanResult={lastScanResult}
          sessionReport={sessionReport}
          localHomeworkRecords={localHomeworkRecords}
          onRemoveHomework={handleRemoveHomework}
          onManualRecord={handleManualRecord}
        />
      </div>
    </div>
  );
}
