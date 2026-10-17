'use client';

import React from 'react';
import QRCode from 'react-qr-code';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface StudentQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeToken?: string;
  studentName: string;
  studentCode: string;
  gradeLevel: string;
}

export function StudentQrModal({
  isOpen,
  onClose,
  qrCodeToken,
  studentName,
  studentCode,
  gradeLevel,
}: StudentQrModalProps) {
  if (!isOpen || !qrCodeToken) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl border border-slate-100 flex flex-col items-center relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-slate-800">بطاقة الحضور السريع</h2>
          <p className="text-xs text-slate-500 mt-1">وجه الكود لقارئ الـ QR لتسجيل حضورك</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-100 mb-6">
          <QRCode value={qrCodeToken} size={250} />
        </div>

        <div className="text-center space-y-2 w-full">
          <h3 className="text-xl font-bold text-slate-900">{studentName}</h3>
          <p className="text-base font-bold text-primary-600 font-mono tracking-wider">{studentCode}</p>
          <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-600 px-4 py-1 text-xs">
            {gradeLevel}
          </Badge>
        </div>
      </div>
    </div>
  );
}
