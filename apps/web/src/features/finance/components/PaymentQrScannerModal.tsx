'use client';

import React from 'react';
import { QrCode, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CameraPermissionModal } from '@/components/camera';
import { usePaymentQrScanner } from '../hooks/usePaymentQrScanner';
import { PaymentScannerControls } from './qr-scanner/PaymentScannerControls';
import { PaymentScannerViewport } from './qr-scanner/PaymentScannerViewport';
import { PaymentScannerFeedback } from './qr-scanner/PaymentScannerFeedback';

interface PaymentQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGroupId?: string;
  initialPeriodYear?: number;
  initialPeriodMonth?: number;
}

export function PaymentQrScannerModal({
  isOpen,
  onClose,
  initialGroupId,
  initialPeriodYear,
  initialPeriodMonth,
}: PaymentQrScannerModalProps) {
  const {
    paymentType,
    setPaymentType,
    groupId,
    setGroupId,
    selectedBookletId,
    setSelectedBookletId,
    periodYear,
    setPeriodYear,
    periodMonth,
    setPeriodMonth,
    amountPaidOverride,
    setAmountPaidOverride,
    soundEnabled,
    setSoundEnabled,
    scannedCount,
    lastScanResult,
    cameraError,
    setCameraError,
    locked,
    facingMode,
    setFacingMode,
    cameraKey,
    setCameraKey,
    isRequestingPermission,
    showPermissionGuide,
    setShowPermissionGuide,
    scannerContainerRef,
    groups,
    eligibleBooklets,
    isPending,
    handleScan,
    handleCameraError,
    requestCameraPermission,
  } = usePaymentQrScanner({
    isOpen,
    initialGroupId,
    initialPeriodYear,
    initialPeriodMonth,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-xl max-h-[88dvh] overflow-y-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-200 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            الماسح الذكي لتحصيل المدفوعات والمذكرات
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4" dir="rtl">
          <PaymentScannerControls
            paymentType={paymentType}
            setPaymentType={setPaymentType}
            groupId={groupId}
            setGroupId={setGroupId}
            selectedBookletId={selectedBookletId}
            setSelectedBookletId={setSelectedBookletId}
            periodYear={periodYear}
            setPeriodYear={setPeriodYear}
            periodMonth={periodMonth}
            setPeriodMonth={setPeriodMonth}
            amountPaidOverride={amountPaidOverride}
            setAmountPaidOverride={setAmountPaidOverride}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            groups={groups}
            eligibleBooklets={eligibleBooklets}
          />

          <PaymentScannerViewport
            scannerContainerRef={scannerContainerRef}
            paymentType={paymentType}
            cameraKey={cameraKey}
            facingMode={facingMode}
            setFacingMode={setFacingMode}
            setCameraKey={setCameraKey}
            setCameraError={setCameraError}
            locked={locked}
            isPending={isPending}
            cameraError={cameraError}
            isRequestingPermission={isRequestingPermission}
            requestCameraPermission={requestCameraPermission}
            setShowPermissionGuide={setShowPermissionGuide}
            scannedCount={scannedCount}
            onScan={handleScan}
            onError={handleCameraError}
          />

          <PaymentScannerFeedback
            cameraError={cameraError}
            lastScanResult={lastScanResult}
            paymentType={paymentType}
            isRequestingPermission={isRequestingPermission}
            requestCameraPermission={requestCameraPermission}
            setShowPermissionGuide={setShowPermissionGuide}
          />

          {/* Footer */}
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={onClose} className="cursor-pointer">
              إغلاق الماسح
            </Button>
          </div>
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
