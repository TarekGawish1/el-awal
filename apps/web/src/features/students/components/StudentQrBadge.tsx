'use client';

import React, { useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import { useStudentQrCode, useRegenerateStudentQr } from '../hooks/use-students';
import { Button } from '@/components/ui/Button';
import { formatWhatsAppNumber } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

interface StudentQrBadgeProps {
  studentId: string;
  studentPhone?: string | null;
  loginEmail?: string | null;
  loginPhone?: string | null;
  loginPassword?: string | null;
}

export function StudentQrBadge({
  studentId,
  studentPhone,
  loginEmail,
  loginPhone,
  loginPassword,
}: StudentQrBadgeProps) {
  const { data, isLoading, isError } = useStudentQrCode(studentId);
  const { mutate: regenerate, isPending: isRegenerating } = useRegenerateStudentQr();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  const generateQrImageBlob = async (): Promise<Blob | null> => {
    if (!badgeRef.current || !data) return null;
    try {
      const svg = badgeRef.current.querySelector('svg');
      if (!svg) return null;

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      return new Promise<Blob | null>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 500;
          canvas.height = 600;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve(null);
            return;
          }

          // Background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 500, 600);

          // Top Header Bar
          ctx.fillStyle = '#2563eb';
          ctx.fillRect(0, 0, 500, 16);

          // Draw QR Image
          ctx.drawImage(img, 75, 50, 350, 350);

          // Student Full Name
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 26px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(data.fullName || '', 250, 440);

          // Student Code
          ctx.fillStyle = '#2563eb';
          ctx.font = 'bold 22px monospace';
          ctx.fillText(`الكود: ${data.studentCode || ''}`, 250, 480);

          // Password if available
          if (loginPassword) {
            ctx.fillStyle = '#475569';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText(`كلمة المرور: ${loginPassword}`, 250, 520);
          }

          URL.revokeObjectURL(url);
          canvas.toBlob(resolve, 'image/png');
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      });
    } catch (error) {
      console.error('Error generating image:', error);
      return null;
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!data) return;
    setIsDownloading(true);
    try {
      const blob = await generateQrImageBlob();
      if (blob) {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `student-card-${data.studentCode}.png`;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        toast.error('حدث خطأ أثناء إنشاء الصورة.');
      }
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء محاولة التنزيل.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareWhatsApp = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!data) return;

    try {
      setIsSharing(true);
      let shareText = `مرحباً ${data.fullName}، كود الطالب الخاص بك هو: ${data.studentCode}`;
      if (loginEmail || loginPhone || loginPassword) {
        shareText += `\n\nبيانات الدخول للمنصة:\n`;
        if (loginEmail) shareText += `البريد الإلكتروني: ${loginEmail}\n`;
        else if (loginPhone) shareText += `رقم الهاتف: ${loginPhone}\n`;
        if (loginPassword) shareText += `كلمة المرور: ${loginPassword}`;
      }

      if (navigator.share && navigator.canShare) {
        const blob = await generateQrImageBlob();
        if (blob) {
          const file = new File([blob], `student-card-${data.studentCode}.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'بطاقة الطالب',
              text: shareText,
            });
            return;
          }
        }
      }

      if (studentPhone) {
        const waUrl = `https://wa.me/${formatWhatsAppNumber(studentPhone)}?text=${encodeURIComponent(shareText)}`;
        window.open(waUrl, '_blank');
      } else {
        toast.error('رقم الطالب غير متوفر للمراسلة.');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('حدث خطأ أثناء محاولة المشاركة.');
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center p-6 border rounded-lg bg-gray-50 dark:bg-gray-800 animate-pulse">
        <div className="w-48 h-48 bg-gray-300 dark:bg-gray-700 rounded-lg mb-4"></div>
        <div className="w-32 h-6 bg-gray-300 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-4 text-center text-red-500 bg-red-50 rounded-lg">
        Failed to load QR code.
      </div>
    );
  }

  const handleRegenerate = () => {
    regenerate(studentId, {
      onSuccess: () => setShowConfirm(false),
    });
  };

  return (
  return (
    <div className="flex flex-row items-stretch border-none rounded-3xl shadow-sm ring-1 ring-slate-100 relative overflow-hidden bg-white max-w-sm mx-auto">
      <div ref={badgeRef} className="flex-1 flex flex-col items-center justify-center p-4 relative bg-white">
        <div className="absolute top-0 right-0 w-full h-1.5 bg-gradient-to-r from-primary-400 to-primary-600"></div>

        <div className="bg-white p-3 rounded-2xl shadow-sm ring-1 ring-slate-100 mb-3 group hover:shadow-md transition-shadow mt-2">
          <QRCode value={data.qrCodeToken} size={140} className="group-hover:scale-105 transition-transform duration-300" />
        </div>
        
        <div className="text-center w-full">
          <h3 className="text-base font-bold text-slate-900 mb-2">{data.fullName}</h3>
          
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-1.5 text-xs w-full text-start">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">كود الطالب:</span>
              <span className="font-mono font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded" dir="ltr">{data.studentCode}</span>
            </div>
            {loginPassword && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">كلمة المرور:</span>
                <span className="font-mono font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded" dir="ltr">{loginPassword}</span>
              </div>
            )}
            {loginPhone && !loginEmail && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">الدخول بـ:</span>
                <span className="font-mono font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded text-[10px]" dir="ltr">{loginPhone}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-16 flex flex-col items-center justify-center p-2 bg-slate-50 border-r border-slate-100 border-dashed">
        {showConfirm ? (
          <div className="flex flex-col items-center gap-2 w-full">
            <Button
              size="icon"
              className="w-10 h-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              title="تأكيد"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="w-10 h-10 rounded-xl bg-white"
              onClick={() => setShowConfirm(false)}
              disabled={isRegenerating}
              title="إلغاء"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full">
            <button
              onClick={() => setShowConfirm(true)}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition-all flex items-center justify-center shadow-sm"
              title="إعادة توليد الـ QR"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-900 text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              title="تنزيل الكود"
            >
              {isDownloading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
            </button>

            {studentPhone && (
              <button
                onClick={handleShareWhatsApp}
                disabled={isSharing}
                className="w-10 h-10 rounded-xl bg-green-500 hover:bg-green-600 text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                title="مشاركة عبر واتساب"
              >
                {isSharing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
