'use client';

import React, { useState } from 'react';
import { Camera, Lock, RefreshCw, X, ShieldAlert, CheckCircle2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export interface CameraPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
}

export function CameraPermissionModal({
  isOpen,
  onClose,
  onPermissionGranted,
}: CameraPermissionModalProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  if (!isOpen) return null;

  const handleTestAndRetry = async () => {
    setIsRetrying(true);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        toast.error('المتصفح لا يدعم الوصول المباشر للكاميرا أو يتطلب اتصال HTTPS آمن.');
        return;
      }

      // Explicit user gesture call to request camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      // Stream successfully acquired! Release it so the scanner component can capture it
      stream.getTracks().forEach((track) => track.stop());

      toast.success('تم تفعيل صلاحية الكاميرا بنجاح! 🚀');
      onPermissionGranted?.();
      onClose();
    } catch (err: any) {
      console.warn('Manual permission test failed:', err);
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission') || err?.message?.includes('denied')) {
        toast.error('ما زالت صلاحية الكاميرا محظورة في المتصفح. يرجى اتباع الخطوات الموضحة وتفعيلها أولاً.', {
          duration: 4000,
        });
      } else {
        toast.error('تعذر الوصول للكاميرا: ' + (err?.message || 'تأكد من عدم استخدام تطبيق آخر للكاميرا'));
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                كيفية تفعيل صلاحية الكاميرا
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                خطوات بسيطة للسماح للمتصفح بمسح بطاقات الـ QR
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-sm text-slate-700">
          {/* Alert Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-bold block text-amber-950 mb-0.5">
                تم حظر إذن الكاميرا مسبقاً في إعدادات المتصفح
              </span>
              بسبب سياسات الأمان في المتصفحات (مثل Google Chrome و Safari)، لا يمكن للموقع فتح الكاميرا تلقائياً إذا تم رفض الإذن من قبل، ويجب تفعيلها يدوياً باتباع الخطوات التالية:
            </div>
          </div>

          {/* Step by Step Guide */}
          <div className="space-y-3">
            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 font-black text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <div className="space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs sm:text-sm">
                  <span>اضغط على أيقونة الإعدادات أو القفل</span>
                  <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[11px] text-slate-600 font-semibold shadow-2xs">
                    <Lock className="w-3 h-3 text-slate-500" /> في شريط العناوين
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-normal">
                  في أعلى شاشة المتصفح بجانب رابط الموقع (URL)، اضغط على أيقونة القفل أو شارات الإعدادات 🔒.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 font-black text-xs flex items-center justify-center shrink-0">
                2
              </div>
              <div className="space-y-1">
                <div className="font-bold text-slate-800 text-xs sm:text-sm">
                  اختر "أذونات الموقع" أو "الصلاحيات" (Permissions)
                </div>
                <p className="text-xs text-slate-500 leading-normal">
                  ستظهر لك نافذة منبثقة من المتصفح تحتوي على صلاحيات الموقع الحالي.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 font-black text-xs flex items-center justify-center shrink-0">
                3
              </div>
              <div className="space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs sm:text-sm">
                  <span>فعّل خيار "الكاميرا" (Camera)</span>
                  <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded text-[11px] font-bold">
                    <CheckCircle2 className="w-3 h-3" /> سماح (Allow)
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-normal">
                  غيّر حالة الكاميرا من "محظور" (Blocked) إلى "سماح" (Allowed).
                </p>
              </div>
            </div>
          </div>

          {/* Quick Tips for PWA / Mobile */}
          <div className="text-[11px] text-slate-500 bg-slate-50/80 p-3 rounded-xl border border-dashed border-slate-200 space-y-1">
            <span className="font-bold text-slate-700 block">📱 لمستخدمي تطبيق الهاتف أو وضع ملء الشاشة (PWA):</span>
            <p>
              إذا لم يظهر شريط العناوين، يمكنك الدخول إلى: <strong>إعدادات الهاتف (Settings) ⬅️ التطبيقات (Apps) ⬅️ تطبيق المنصة ⬅️ الأذونات (Permissions) ⬅️ الكاميرا ⬅️ سماح</strong>.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={handleTestAndRetry}
            disabled={isRetrying}
            className="w-full sm:flex-1 py-2.5 px-4 bg-primary text-white font-bold text-xs sm:text-sm rounded-xl hover:bg-primary-700 active:bg-primary-800 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isRetrying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>جاري فحص الإذن والتشغيل...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>لقد منحت الإذن - تشغيل الكاميرا الآن</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReload}
            className="w-full sm:w-auto py-2.5 px-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>تحديث الصفحة</span>
          </button>
        </div>
      </div>
    </div>
  );
}
