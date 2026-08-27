'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  QrCode,
  RefreshCw,
  Phone,
  CheckCircle2,
  AlertCircle,
  LogOut,
  X,
  ShieldCheck,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';

interface WhatsAppStatusResponse {
  connected: boolean;
  status: 'connecting' | 'open' | 'close' | 'qr' | string;
  qr?: string | null;
  connectedNumber?: string | null;
}

interface WhatsAppConnectionManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsAppConnectionManager({ isOpen, onClose }: WhatsAppConnectionManagerProps) {
  const [statusData, setStatusData] = useState<WhatsAppStatusResponse>({
    connected: false,
    status: 'connecting',
    qr: null,
    connectedNumber: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRelinking, setIsRelinking] = useState(false);
  const [isConfirmingRelink, setIsConfirmingRelink] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await apiClient<WhatsAppStatusResponse>('/notifications/whatsapp-status');
      setStatusData(data);
    } catch {
      // Backend might be offline or starting up
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleRelink = async () => {
    setIsRelinking(true);
    try {
      const res = await apiClient<{ success: boolean; message: string }>('/notifications/whatsapp-relink', {
        method: 'POST',
      });
      toast.success(res.message || 'تمت إعادة ضبط جلسة الواتساب بنجاح. جاري توليد كود QR جديد 🔄');
      setIsConfirmingRelink(false);
      await fetchStatus();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء إعادة ضبط الجلسة');
    } finally {
      setIsRelinking(false);
    }
  };

  if (!isOpen) return null;

  const isConnected = statusData.connected || statusData.status === 'open';
  const isQrReady = statusData.status === 'qr' || Boolean(statusData.qr);
  const isConnecting = statusData.status === 'connecting';

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-slate-100 space-y-6 text-start max-h-[88dvh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-8"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">بوابة ربط واتساب (WhatsApp Gateway)</h2>
              <p className="text-xs text-slate-500">إدارة إرسال إشعارات الدفع والقبول والغياب تلقائياً</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connection Status Card */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-600">حالة الاتصال الحالية:</span>
            {isConnected ? (
              <Badge variant="success" className="px-3 py-1 text-xs font-bold gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                متصل وجاهز للخدمة
              </Badge>
            ) : isQrReady ? (
              <Badge variant="warning" className="px-3 py-1 text-xs font-bold gap-1 bg-amber-100 text-amber-800 border-amber-200">
                <QrCode className="w-3.5 h-3.5" />
                بانتظار مسح رمز الـ QR
              </Badge>
            ) : (
              <Badge variant="error" className="px-3 py-1 text-xs font-bold gap-1 bg-red-100 text-red-800 border-red-200">
                <AlertCircle className="w-3.5 h-3.5" />
                غير متصل
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchStatus}
            className="text-slate-500 hover:text-slate-800 p-1.5 h-auto rounded-lg"
            title="تحديث الحالة"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Connected Number Info */}
        {isConnected && (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>الرقم المرتبط بالمنصة:</span>
              <span className="font-mono text-emerald-800" dir="ltr">
                {statusData.connectedNumber || 'جلسة فعالة'}
              </span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              ✅ جميع الرسائل التلقائية (إيصالات الدفع، بيانات حسابات الطلاب وأولياء الأمور، تنبيهات الغياب والدرجات) يتم إرسالها حالياً من خلال هذا الرقم.
            </p>
          </div>
        )}

        {/* QR Code Presentation */}
        {!isConnected && statusData.qr && (
          <div className="text-center space-y-4 py-2">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800">امسح رمز QR لربط رقم واتساب بالمنصة</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                افتح تطبيق واتساب ➔ الأجهزة المرتبطة ➔ ربط جهاز، ثم وجّه الكاميرا نحو الرمز التالي:
              </p>
            </div>
            <div className="inline-block p-4 bg-white rounded-2xl border-2 border-emerald-500/30 shadow-lg ring-8 ring-emerald-50">
              {statusData.qr.startsWith('data:image') ? (
                <img
                  src={statusData.qr}
                  alt="WhatsApp QR Code"
                  className="w-56 h-56 mx-auto rounded-lg object-contain"
                />
              ) : (
                <div className="p-1 bg-white rounded-lg flex items-center justify-center">
                  <QRCode
                    value={statusData.qr}
                    size={220}
                    style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                    viewBox="0 0 256 256"
                  />
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              يتجدد الرمز تلقائياً كل 20 ثانية للحفاظ على الأمان.
            </p>
          </div>
        )}

        {/* Connecting Spinner */}
        {!isConnected && !statusData.qr && isConnecting && (
          <div className="text-center py-8 space-y-3">
            <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-600">جاري الاتصال بخدمة واتساب وتوليد رمز الربط...</p>
          </div>
        )}

        {/* Action Buttons / Relink Feature */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          {!isConfirmingRelink ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={isRelinking}
              onClick={() => setIsConfirmingRelink(true)}
              className="w-full text-xs font-bold border-red-200 text-red-600 hover:bg-red-50 rounded-2xl py-3 gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج وربط رقم واتساب جديد (Relink)</span>
            </Button>
          ) : (
            <div className="p-4 rounded-2xl border border-red-200 bg-red-50/70 space-y-3">
              <div className="flex items-start gap-2 text-red-900">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold">هل أنت متأكد من فك الارتباط؟</h4>
                  <p className="text-[11px] text-red-700 leading-relaxed">
                    سيتم مسح بيانات الجلسة الحالية من قاعدة البيانات، وستحتاج لمسح رمز QR جديد لربط الرقم البديل.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={isRelinking}
                  onClick={handleRelink}
                  className="w-full text-xs bg-red-600 hover:bg-red-700 text-white rounded-xl py-2"
                >
                  {isRelinking ? 'جاري إعادة الضبط...' : 'نعم، فك الارتباط وتوليد QR جديد'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsConfirmingRelink(false)}
                  className="text-xs rounded-xl py-2 px-4"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full font-bold shadow-sm rounded-2xl py-3"
            onClick={onClose}
          >
            إغلاق النافذة
          </Button>
        </div>
      </div>
    </div>
  );
}
