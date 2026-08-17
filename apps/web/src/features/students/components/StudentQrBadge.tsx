'use client';

import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { useStudentQrCode, useRegenerateStudentQr } from '../hooks/use-students';
import { Button } from '@/components/ui/Button';

interface StudentQrBadgeProps {
  studentId: string;
}

export function StudentQrBadge({ studentId }: StudentQrBadgeProps) {
  const { data, isLoading, isError } = useStudentQrCode(studentId);
  const { mutate: regenerate, isPending: isRegenerating } = useRegenerateStudentQr();
  const [showConfirm, setShowConfirm] = useState(false);

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
    <div className="flex flex-col items-center p-8 border-none rounded-3xl shadow-sm bg-gradient-to-b from-white to-slate-50 ring-1 ring-slate-100 relative overflow-hidden">
      <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
      
      <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-slate-100 mb-6 group hover:shadow-md transition-shadow">
        <QRCode value={data.qrCodeToken} size={220} className="group-hover:scale-105 transition-transform duration-300" />
      </div>
      
      <div className="text-center w-full mb-8 space-y-1">
        <h3 className="text-xl font-bold text-slate-900">{data.fullName}</h3>
        <p className="text-primary-600 font-mono text-sm tracking-wider font-medium bg-primary-50 py-1 px-3 rounded-md inline-block">
          {data.studentCode}
        </p>
      </div>

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
      )}
    </div>
  );
}
