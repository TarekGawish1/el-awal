'use client';

import React from 'react';
import { Camera, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { ScanResultState } from '../../hooks/usePaymentQrScanner';

interface PaymentScannerFeedbackProps {
  cameraError: string | null;
  lastScanResult: ScanResultState | null;
  paymentType: 'TUITION' | 'BOOKLET';
  isRequestingPermission: boolean;
  requestCameraPermission: () => Promise<void>;
  setShowPermissionGuide: (show: boolean) => void;
}

export function PaymentScannerFeedback({
  cameraError,
  lastScanResult,
  paymentType,
  isRequestingPermission,
  requestCameraPermission,
  setShowPermissionGuide,
}: PaymentScannerFeedbackProps) {
  return (
    <div className="min-h-[85px]">
      {cameraError ? (
        <Alert variant="error">
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col">
              <span className="font-bold flex items-center gap-1.5 text-rose-800">
                <Camera className="w-4 h-4 text-rose-600" />
                تعذر الوصول إلى الكاميرا
              </span>
              <span className="text-xs mt-1 text-rose-700 leading-relaxed">{cameraError}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-200/60">
              <button
                type="button"
                onClick={requestCameraPermission}
                disabled={isRequestingPermission}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {isRequestingPermission ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري الطلب...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>طلب إذن الكاميرا مجدداً</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowPermissionGuide(true)}
                className="px-3 py-1.5 bg-white border border-rose-300 text-rose-800 hover:bg-rose-50 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>طريقة التفعيل من المتصفح 🔒</span>
              </button>
            </div>
          </div>
        </Alert>
      ) : lastScanResult ? (
        lastScanResult.success ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">{lastScanResult.studentName}</h4>
                  {lastScanResult.isDuplicate ? (
                    <Badge variant="warning" className="text-[10px]">مُسجل مسبقاً</Badge>
                  ) : (
                    <Badge variant="success" className="text-[10px]">
                      {lastScanResult.bookletTitle ? 'تم سداد المذكرة' : 'تم الدفع بنجاح'}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {lastScanResult.bookletTitle ? (
                    <span className="font-bold text-purple-700">📚 {lastScanResult.bookletTitle}</span>
                  ) : (
                    <>المجموعة: <strong className="text-slate-800">{lastScanResult.groupName}</strong> &bull; {lastScanResult.period}</>
                  )}
                </p>
              </div>
            </div>
            <div className="text-left">
              <span className="block text-xs text-slate-500 font-medium">المبلغ المسدد</span>
              <span className="text-base font-black text-emerald-700">{lastScanResult.amount} ج.م</span>
            </div>
          </div>
        ) : (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in duration-200">
            <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-rose-900 text-sm">{lastScanResult.title || 'فشل تسجيل الدفعة'}</h4>
              <p className="text-xs text-rose-700 mt-0.5">{lastScanResult.message}</p>
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-3 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
          {paymentType === 'BOOKLET'
            ? 'اختر المذكرة أعلاه ثم وجه الكاميرا نحو QR الطالب لتسجيل سداد واستلام المذكرة فورياً'
            : 'وجه كاميرا الجهاز نحو بطاقة الـ QR الخاصة بالطالب لتسجيل سداد المصروفات فورياً'}
        </div>
      )}
    </div>
  );
}
