'use client';

import React from 'react';
import { useSessionReport } from '../hooks/use-attendance';
import { ExternalStudentModal } from './ExternalStudentModal';
import { CameraPermissionModal } from '@/components/camera';
import { ManualAttendanceRoster } from './ManualAttendanceRoster';
import { useAttendanceQrScanner } from '../hooks/useAttendanceQrScanner';
import { QrScannerViewport } from './QrScannerViewport';

interface QrScannerProps {
  sessionId: string;
}

export function QrScanner({ sessionId }: QrScannerProps) {
  const { data: sessionReport } = useSessionReport(sessionId);

  const {
    lastScanResult,
    crossGroupPrompt,
    locked,
    isPending,
    cameraError,
    setCameraError,
    facingMode,
    setFacingMode,
    cameraKey,
    setCameraKey,
    flashType,
    isRequestingPermission,
    showPermissionGuide,
    setShowPermissionGuide,
    scannerContainerRef,
    requestCameraPermission,
    handleScan,
    handleConfirmCrossGroup,
    handleCancelCrossGroup,
    handleError,
  } = useAttendanceQrScanner({ sessionId });

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start py-4">
      <div className="md:col-span-6">
        <QrScannerViewport
          scannerContainerRef={scannerContainerRef}
          cameraKey={cameraKey}
          facingMode={facingMode}
          locked={locked}
          isPending={isPending}
          hasCrossGroupPrompt={!!crossGroupPrompt}
          flashType={flashType}
          cameraError={cameraError}
          isRequestingPermission={isRequestingPermission}
          lastScanResult={lastScanResult}
          onScan={handleScan}
          onError={handleError}
          onToggleFacingMode={() => {
            setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
            setCameraKey((prev) => prev + 1);
          }}
          onRequestPermission={requestCameraPermission}
          onOpenPermissionGuide={() => setShowPermissionGuide(true)}
          onRetryCamera={() => {
            setCameraError(null);
            setCameraKey((prev) => prev + 1);
          }}
        />

        {/* External Student Cross-Group Modal */}
        <ExternalStudentModal
          isOpen={!!crossGroupPrompt}
          onClose={handleCancelCrossGroup}
          onConfirm={handleConfirmCrossGroup}
          isPending={isPending}
          student={crossGroupPrompt?.student}
          studentGroup={crossGroupPrompt?.studentGroup}
          sessionGroup={crossGroupPrompt?.sessionGroup}
        />
      </div>

      <div className="md:col-span-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <ManualAttendanceRoster 
            sessionId={sessionId} 
            records={sessionReport?.records || []} 
            isCompact={true}
          />
        </div>
      </div>

      {/* Camera Permission Guide Modal */}
      <CameraPermissionModal
        isOpen={showPermissionGuide}
        onClose={() => setShowPermissionGuide(false)}
        onPermissionGranted={() => {
          setCameraError(null);
          setCameraKey((prev) => prev + 1);
        }}
      />
    </div>
  );
}
