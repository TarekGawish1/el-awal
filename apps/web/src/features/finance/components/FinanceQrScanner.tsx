'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { Upload } from 'lucide-react';
import { CameraPermissionModal } from '@/components/camera';
import { useFinanceQrScanner } from '../hooks/useFinanceQrScanner';
import { FinanceScannerModeSelector } from './qr-scanner/FinanceScannerModeSelector';
import { FinanceScannerViewport } from './qr-scanner/FinanceScannerViewport';

interface FinanceQrScannerProps {
  groupId?: string;
  periodYear: number;
  periodMonth: number;
  onPaymentSuccess?: (studentName: string, amount: number) => void;
}

export function FinanceQrScanner({
  groupId,
  periodYear,
  periodMonth,
  onPaymentSuccess,
}: FinanceQrScannerProps) {
  const {
    paymentType,
    setPaymentType,
    selectedBookletId,
    setSelectedBookletId,
    selectedPeriodMonth,
    setSelectedPeriodMonth,
    selectedPeriodYear,
    setSelectedPeriodYear,
    booklets,
    lastScanResult,
    isPending,
    locked,
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
    isDecodingImage,
    fileInputRef,
    scannerContainerRef,
    requestCameraPermission,
    handleScan,
    handleImageUpload,
    handleError,
  } = useFinanceQrScanner({
    groupId,
    periodYear,
    periodMonth,
    onPaymentSuccess,
  });

  return (
    <div className="flex flex-col items-center py-1 space-y-3">
      {/* Hidden File Input for Image QR Scanning */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Mode & Period/Booklet Selectors */}
      <FinanceScannerModeSelector
        paymentType={paymentType}
        setPaymentType={setPaymentType}
        selectedPeriodMonth={selectedPeriodMonth}
        setSelectedPeriodMonth={setSelectedPeriodMonth}
        selectedPeriodYear={selectedPeriodYear}
        setSelectedPeriodYear={setSelectedPeriodYear}
        selectedBookletId={selectedBookletId}
        setSelectedBookletId={setSelectedBookletId}
        booklets={booklets}
      />

      {/* Camera Viewport */}
      <FinanceScannerViewport
        scannerContainerRef={scannerContainerRef}
        flashType={flashType}
        paymentType={paymentType}
        cameraKey={cameraKey}
        onScan={handleScan}
        onError={handleError}
        locked={locked}
        isPending={isPending}
        facingMode={facingMode}
        onSwitchCamera={() => {
          setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
          setCameraKey((prev) => prev + 1);
        }}
        onPickImage={() => fileInputRef.current?.click()}
        isDecodingImage={isDecodingImage}
        cameraError={cameraError}
        isRequestingPermission={isRequestingPermission}
        onRequestPermission={requestCameraPermission}
        onOpenGuide={() => setShowPermissionGuide(true)}
        onRetry={() => {
          setCameraError(null);
          setCameraKey((prev) => prev + 1);
        }}
      />

      {/* Live Scan Results & Clean Action Area */}
      <div className="w-full max-w-xs min-h-[44px]">
        {lastScanResult ? (
          <Alert
            variant={
              lastScanResult.success
                ? 'success'
                : lastScanResult.isDuplicate || lastScanResult.isNotFound
                ? 'warning'
                : 'error'
            }
          >
            <div className="flex flex-col text-xs">
              {lastScanResult.title && (
                <span className="font-bold mb-0.5">{lastScanResult.title}</span>
              )}
              <span className="font-medium leading-relaxed">{lastScanResult.message}</span>
              {lastScanResult.studentName && (
                <span className="mt-1 font-bold">
                  {lastScanResult.studentName}{' '}
                  {lastScanResult.bookletTitle && `(مذكرة: ${lastScanResult.bookletTitle})`}
                </span>
              )}
            </div>
          </Alert>
        ) : cameraError ? (
          <div className="text-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>أو مسح رمز QR من صورة / كاميرا الهاتف</span>
            </button>
          </div>
        ) : (
          <div className="text-center py-2 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
            {paymentType === 'BOOKLET'
              ? 'وجه الكاميرا نحو بطاقة QR الطالب لتحصيل المذكرة'
              : 'وجه الكاميرا نحو بطاقة QR الطالب لتسجيل السداد'}
          </div>
        )}
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

export default FinanceQrScanner;
