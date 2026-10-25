'use client';

import React, { useState } from 'react';
import { X, Printer, Download, Loader2, AlertCircle, QrCode, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Portal } from '@/components/ui/Portal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useGroupStudents } from '../hooks/useGroups';
import { exportGroupQrCodesPdf, StudentQrData } from '../utils/qr-pdf-exporter';
import { printQrSheetDirectly } from '../utils/qr-print-helpers';
import { StudentQrPrintCard } from './StudentQrPrintCard';

interface GroupQrPrintModalProps {
  groupId: string | null;
  groupName: string;
  gradeLevel?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function GroupQrPrintModal({
  groupId,
  groupName,
  gradeLevel,
  isOpen,
  onClose,
}: GroupQrPrintModalProps) {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [cardsPerPage, setCardsPerPage] = useState<6 | 8>(8);

  const { data: enrollments, isLoading, isError } = useGroupStudents(groupId || '');

  if (!isOpen || !groupId) return null;

  const activeStudents: StudentQrData[] = (enrollments || [])
    .filter((e) => e.status === 'ACTIVE')
    .map((e) => {
      const studentObj = (e as any).student || {};
      const userObj = studentObj.user || {};
      const studentCode = studentObj.code || (studentObj as any).studentCode || `STU-${studentObj.id?.slice(0, 8) || '0000'}`;
      const qrCodeToken = (studentObj as any).qrCodeToken || studentCode;
      return {
        id: studentObj.id || e.id,
        fullName: userObj.name || userObj.fullName || 'طالب غير معروف',
        studentCode,
        qrCodeToken,
        phone: userObj.phone,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await exportGroupQrCodesPdf({
        groupId,
        groupName,
        gradeLevel,
        cardsPerPage,
        activeStudents,
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDirectPrint = () => {
    printQrSheetDirectly(groupName, cardsPerPage);
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white"
        onClick={onClose}
      >
      <div
        className="relative bg-white rounded-3xl max-w-5xl w-full p-5 sm:p-7 shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden print:max-w-none print:max-h-none print:shadow-none print:border-0 print:rounded-none print:p-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-700 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-800">
                  طباعة كروت الـ QR Codes للطلاب
                </h2>
                <Badge variant="default" className="text-xs">
                  {activeStudents.length} طالب
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                {groupName} {gradeLevel ? `• ${gradeLevel}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl bg-slate-100/80 hover:bg-slate-200 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-4 bg-slate-50 rounded-2xl my-4 border border-slate-100 print:hidden">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span>تنسيق الصفحة:</span>
            <button
              onClick={() => setCardsPerPage(8)}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                cardsPerPage === 8
                  ? 'bg-white text-primary-700 border-primary-300 shadow-xs font-bold'
                  : 'bg-transparent text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              8 كروت / صفحة (4x2)
            </button>
            <button
              onClick={() => setCardsPerPage(6)}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                cardsPerPage === 6
                  ? 'bg-white text-primary-700 border-primary-300 shadow-xs font-bold'
                  : 'bg-transparent text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              6 كروت / صفحة (3x2)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf || activeStudents.length === 0}
              className="gap-2 bg-white text-slate-700 hover:text-slate-900 border-slate-200 shadow-xs"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
              ) : (
                <Download className="w-4 h-4 text-primary-600" />
              )}
              <span>تحميل PDF عالي الدقة</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleDirectPrint}
              disabled={activeStudents.length === 0}
              className="gap-2 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة فورية (Print)</span>
            </Button>
          </div>
        </div>

        {/* Modal Body / Sheet Preview */}
        <div className="flex-1 overflow-y-auto pr-1 pl-1 print:overflow-visible">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="border border-slate-200 rounded-2xl p-4 bg-white flex flex-col items-center gap-3">
                  <Skeleton className="w-28 h-28 rounded-xl" />
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <AlertCircle className="w-10 h-10 text-error-500 mx-auto" />
              <p className="font-bold text-slate-700">فشل في تحميل قائمة طلاب المجموعة</p>
              <p className="text-xs">يرجى المحاولة مرة أخرى أو التحقق من الاتصال بالإنترنت.</p>
            </div>
          ) : activeStudents.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <FileText className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-700">لا يوجد طلاب مسجلون حالياً في هذه المجموعة</p>
              <p className="text-xs">قم بإضافة طلاب أولاً لإنشاء وطباعة كروت الـ QR الخاصة بهم.</p>
            </div>
          ) : (
            <div
              id="printable-qr-sheet"
              className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 p-1 print:p-0 print:grid-cols-2 print:gap-3"
            >
              {activeStudents.map((student) => (
                <StudentQrPrintCard
                  key={student.id}
                  student={student}
                  groupName={groupName}
                  gradeLevel={gradeLevel}
                  cardsPerPage={cardsPerPage}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Global CSS for Print Media */}
      <style>{`
        @media print {
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-qr-sheet,
          #printable-qr-sheet * {
            visibility: visible !important;
          }
          .fixed,
          .overflow-y-auto,
          .overflow-hidden,
          .max-h-\\[92vh\\] {
            position: static !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            box-shadow: none !important;
            border: 0 !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #printable-qr-sheet {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 5mm !important;
            background: white !important;
          }
          .qr-print-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1.5px dashed #cbd5e1 !important;
            box-shadow: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
    </Portal>
  );
}
