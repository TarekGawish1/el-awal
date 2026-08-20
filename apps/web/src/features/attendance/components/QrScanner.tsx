'use client';

import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useScanQrAttendance } from '../hooks/use-attendance';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { RefreshCcw, UserCheck, AlertTriangle, CheckCircle2, UserPlus, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface QrScannerProps {
  sessionId: string;
}

export function QrScanner({ sessionId }: QrScannerProps) {
  const [lastScanResult, setLastScanResult] = useState<{
    success?: boolean;
    duplicate?: boolean;
    message?: string;
    studentName?: string;
  } | null>(null);

  const [crossGroupPrompt, setCrossGroupPrompt] = useState<{
    token: string;
    student?: {
      id?: string;
      fullName?: string;
      studentCode?: string;
      gradeLevel?: string;
    };
    studentGroup?: {
      id?: string;
      name?: string;
      gradeLevel?: string;
    };
    sessionGroup?: {
      id?: string;
      name?: string;
      gradeLevel?: string;
    };
    message?: string;
  } | null>(null);

  const { mutate, isPending } = useScanQrAttendance();
  const [locked, setLocked] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const handleScan = (detectedCodes: any[]) => {
    if (locked || isPending || crossGroupPrompt || !detectedCodes || detectedCodes.length === 0) {
      return;
    }

    const token = detectedCodes[0]?.rawValue;
    if (!token) return;

    setLocked(true);
    mutate(
      { sessionId, qrCodeToken: token, allowCrossGroup: false },
      {
        onSuccess: (data) => {
          if (data.isCrossGroupPrompt) {
            // Student is in another group of the same grade level -> show cross-group prompt
            setCrossGroupPrompt({
              token,
              student: data.student,
              studentGroup: data.studentGroup,
              sessionGroup: data.sessionGroup,
              message: data.message,
            });
            setLastScanResult(null);
            return;
          }

          if (data.isDuplicate) {
            setLastScanResult({
              success: false,
              duplicate: true,
              message: data.message || 'تم تسجيل حضور هذا الطالب لهذه الحصة مسبقاً.',
              studentName: data.student?.fullName,
            });
            toast('تم رصد هذا الطالب مسبقاً', { icon: '⚠️' });
          } else {
            setLastScanResult({
              success: true,
              message: data.message || 'تم تسجيل الحضور بنجاح.',
              studentName: data.student?.fullName,
            });
            toast.success(`تم حضور: ${data.student?.fullName}`);
          }

          // Unlock after 1.5s to allow subsequent scans
          setTimeout(() => setLocked(false), 1500);
        },
        onError: (error: any) => {
          const message =
            error?.message ||
            error?.response?.data?.message ||
            'رمز الـ QR غير صالح أو حدث خطأ أثناء المسح.';
          const errorMsg = Array.isArray(message) ? message[0] : message;

          setLastScanResult({
            success: false,
            duplicate: false,
            message: errorMsg,
          });
          toast.error(errorMsg);

          // Unlock after 1.5s to allow retry
          setTimeout(() => setLocked(false), 1500);
        },
      },
    );
  };

  const handleConfirmCrossGroup = () => {
    if (!crossGroupPrompt) return;

    mutate(
      { sessionId, qrCodeToken: crossGroupPrompt.token, allowCrossGroup: true },
      {
        onSuccess: (data) => {
          const studentName = data.student?.fullName || crossGroupPrompt.student?.fullName || 'الطالب';
          setCrossGroupPrompt(null);
          setLastScanResult({
            success: true,
            message: `تم تسجيل حضور الطالب [${studentName}] كحضور استثنائي بنجاح!`,
            studentName,
          });
          toast.success(`تم تسجيل حضور استثنائي: ${studentName}`);
          setTimeout(() => setLocked(false), 1500);
        },
        onError: (error: any) => {
          const message =
            error?.message ||
            error?.response?.data?.message ||
            'فشل تسجيل الحضور الاستثنائي.';
          const errorMsg = Array.isArray(message) ? message[0] : message;
          toast.error(errorMsg);
          setCrossGroupPrompt(null);
          setLocked(false);
        },
      },
    );
  };

  const handleCancelCrossGroup = () => {
    setCrossGroupPrompt(null);
    setLocked(false);
  };

  const handleError = (error: any) => {
    console.error('QR Scanner Error:', error);
    if (error?.name === 'NotAllowedError' || error?.message?.includes('Permission')) {
      setCameraError('تم رفض صلاحية استخدام الكاميرا. يرجى تفعيلها من إعدادات المتصفح.');
    } else if (error?.name === 'NotSupportedError' || error?.message?.includes('secure context')) {
      setCameraError('لا يمكن الوصول للكاميرا. تأكد من استخدام اتصال آمن (HTTPS) أو أنك تستخدم localhost.');
    } else {
      setCameraError(error?.message || 'حدث خطأ في تشغيل الكاميرا.');
    }
  };

  return (
    <div className="flex flex-col items-center py-4">
      <div className="w-full max-w-sm aspect-square bg-slate-900 rounded-3xl overflow-hidden border border-slate-100 shadow-sm relative ring-4 ring-primary-50">
        <Scanner
          onScan={handleScan}
          onError={handleError}
          formats={['qr_code']}
          constraints={{ facingMode }}
          styles={{ video: { transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' } }}
        />

        <button
          type="button"
          onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
          className="absolute top-4 right-4 z-20 bg-white/20 hover:bg-white/40 text-white backdrop-blur-md p-2.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm cursor-pointer"
          title="تبديل الكاميرا"
        >
          <RefreshCcw className="w-5 h-5" />
        </button>

        {(locked || isPending) && !crossGroupPrompt && (
          <div className="absolute inset-0 bg-white/60 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent mb-2"></div>
            <span className="text-xs font-bold text-slate-700">جاري معالجة الـ QR...</span>
          </div>
        )}
      </div>

      {/* Cross-Group Attendance Prompt Modal / Card */}
      {crossGroupPrompt && (
        <div className="mt-5 w-full max-w-md bg-amber-50/90 border border-amber-200 rounded-3xl p-5 shadow-lg animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1.5 text-right">
              <h4 className="text-sm font-black text-amber-950">
                الطالب مسجل في مجموعة أخرى (نفس الصف الدراسي)
              </h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                الطالب <strong className="font-extrabold text-slate-900">{crossGroupPrompt.student?.fullName}</strong> مسجل في{' '}
                <strong className="font-bold text-slate-800">{crossGroupPrompt.studentGroup?.name}</strong>{' '}
                ({crossGroupPrompt.student?.gradeLevel}).
              </p>
              <p className="text-[11px] text-amber-700 font-semibold pt-1">
                هل ترغب في تسجيل حضوره في هذه الحصة كحضور استثنائي (تبديل ميعاد)؟
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-200/80 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelCrossGroup}
              className="text-xs rounded-xl"
            >
              إلغاء وتخطي
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmCrossGroup}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              {isPending ? 'جاري التسجيل...' : '✅ تسجيل حضور استثنائي'}
            </Button>
          </div>
        </div>
      )}

      {/* Result Alert Box */}
      <div className="mt-6 w-full max-w-sm min-h-[80px]">
        {cameraError ? (
          <Alert variant="error">
            <div className="flex flex-col">
              <span className="font-semibold">خطأ في الكاميرا</span>
              <span className="text-sm mt-1">{cameraError}</span>
            </div>
          </Alert>
        ) : lastScanResult ? (
          <Alert
            variant={
              lastScanResult.success
                ? 'success'
                : lastScanResult.duplicate
                ? 'warning'
                : 'error'
            }
          >
            <div className="flex flex-col">
              <span className="font-semibold">{lastScanResult.message}</span>
              {lastScanResult.studentName && (
                <span className="text-sm mt-1 font-bold">{lastScanResult.studentName}</span>
              )}
            </div>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}

