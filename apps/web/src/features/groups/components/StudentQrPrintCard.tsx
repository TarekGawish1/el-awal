'use client';

import React from 'react';
import QRCode from 'react-qr-code';
import { StudentQrData } from '../utils/qr-pdf-exporter';

interface StudentQrPrintCardProps {
  student: StudentQrData;
  groupName: string;
  gradeLevel?: string;
  cardsPerPage: 6 | 8;
}

export function StudentQrPrintCard({
  student,
  groupName,
  gradeLevel,
  cardsPerPage,
}: StudentQrPrintCardProps) {
  return (
    <div
      key={student.id}
      className="qr-print-card border-2 border-dashed border-slate-300 rounded-2xl p-3.5 sm:p-4 bg-white flex flex-col items-center justify-start text-center relative overflow-visible break-inside-avoid print:border-slate-300 print:rounded-xl"
      style={{ minHeight: cardsPerPage === 8 ? '220px' : '260px' }}
    >
      {/* Card Header Badge */}
      <div className="w-full bg-slate-50 border border-slate-200/80 rounded-lg py-1.5 px-2 mb-2.5 text-center text-slate-700 text-[11px] font-bold leading-snug">
        {groupName} {gradeLevel ? `• ${gradeLevel}` : ''}
      </div>

      {/* Sharp High-Contrast QR Code */}
      <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-xs flex items-center justify-center">
        <QRCode
          value={student.studentCode || student.qrCodeToken}
          size={cardsPerPage === 8 ? 115 : 135}
          level="H"
        />
      </div>

      {/* Student Full Name */}
      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-2.5 leading-normal text-center w-full">
        {student.fullName}
      </h3>

      {/* Student Code */}
      <div className="text-xs font-mono font-bold text-primary-700 tracking-wider dir-ltr mt-1 select-all">
        {student.studentCode}
      </div>

      {/* Student Phone */}
      {student.phone && (
        <div className="text-[11px] text-slate-500 font-medium mt-1 dir-ltr">
          {student.phone}
        </div>
      )}
    </div>
  );
}
