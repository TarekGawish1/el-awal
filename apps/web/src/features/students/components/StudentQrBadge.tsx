'use client';

import React, { useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import { useStudentQrCode, useRegenerateStudentQr } from '../hooks/use-students';
import { Button } from '@/components/ui/Button';

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
  loginPassword
}: StudentQrBadgeProps) {
  const { data, isLoading, isError } = useStudentQrCode(studentId);
  const { mutate: regenerate, isPending: isRegenerating } = useRegenerateStudentQr();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  const handleShareWhatsApp = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!badgeRef.current || !data) return;
    
    try {
      setIsSharing(true);
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(badgeRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to generate image');

      const file = new File([blob], `student-card-${data.studentCode}.png`, { type: 'image/png' });
      let shareText = `مرحباً ${data.fullName}، كود الطالب الخاص بك هو: ${data.studentCode}`;
      
      if (loginEmail || loginPhone || loginPassword) {
        shareText += `\\n\\nبيانات الدخول للمنصة:\\n`;
        if (loginEmail) shareText += `البريد الإلكتروني: ${loginEmail}\\n`;
        else if (loginPhone) shareText += `رقم الهاتف: ${loginPhone}\\n`;
        if (loginPassword) shareText += `كلمة المرور: ${loginPassword}`;
      }

      if (studentPhone) {
        const imageUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `student-card-${data.studentCode}.png`;
        link.click();
        URL.revokeObjectURL(imageUrl);
        
        const waUrl = `https://wa.me/${studentPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(shareText + "\\n\\n(تم تحميل صورة البطاقة على جهازك، يمكنك إرفاقها هنا)")}`;
        window.open(waUrl, '_blank');
      } else if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'بطاقة الطالب',
          text: shareText,
        });
      } else {
        const imageUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `student-card-${data.studentCode}.png`;
        link.click();
        URL.revokeObjectURL(imageUrl);
        
        alert('تم تحميل صورة البطاقة. يمكنك الآن مشاركتها.');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      alert('حدث خطأ أثناء محاولة المشاركة.');
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
    <div className="flex flex-col items-center border-none rounded-3xl shadow-sm ring-1 ring-slate-100 relative overflow-hidden bg-gradient-to-b from-white to-slate-50">
      <div ref={badgeRef} className="flex flex-col items-center w-full p-8 pb-6 relative bg-white">
        <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-slate-100 mb-6 group hover:shadow-md transition-shadow mt-2">
          <QRCode value={data.qrCodeToken} size={220} className="group-hover:scale-105 transition-transform duration-300" />
        </div>
        
        <div className="text-center w-full mt-2">
          <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight">{data.fullName}</h3>
          <div className="inline-block bg-primary-50 py-1.5 px-4 rounded-md border border-primary-100">
            <span className="text-primary-600 font-mono text-sm tracking-wider font-bold">
              {data.studentCode}
            </span>
          </div>
        </div>
      </div>
      
      <div className="w-full p-8 pt-2">

      {showConfirm ? (
        <div className="flex flex-col items-center space-y-4 p-5 bg-amber-50 border border-amber-200 rounded-2xl w-full">
          <p className="text-sm text-amber-800 text-center font-medium leading-relaxed">
            سيؤدي هذا إلى إبطال رمز الاستجابة السريعة (QR) الحالي. هل أنت متأكد أنك تريد المتابعة؟
          </p>
          <div className="flex space-x-3 rtl:space-x-reverse w-full">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-xl"
              onClick={() => setShowConfirm(false)}
              disabled={isRegenerating}
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white border-none shadow-sm"
              onClick={handleRegenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? 'جاري التوليد...' : 'تأكيد'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-3">
          <Button
            variant="outline"
            className="w-full rounded-xl border-dashed border-2 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition-all font-medium py-6"
            onClick={() => setShowConfirm(true)}
          >
            <svg className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            إعادة توليد كود الـ QR
          </Button>
          
          {studentPhone && (
            <button
              onClick={handleShareWhatsApp}
              disabled={isSharing}
              className="flex items-center justify-center w-full rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSharing ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 rtl:ml-2 rtl:mr-0"></div>
              ) : (
                <svg className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              )}
              {isSharing ? 'جاري التحضير...' : 'مشاركة عبر واتساب'}
            </button>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
