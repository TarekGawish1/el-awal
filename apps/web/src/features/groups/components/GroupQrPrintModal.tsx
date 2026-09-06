'use client';

import React, { useState } from 'react';
import { X, Printer, Download, Loader2, AlertCircle, QrCode, FileText } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useGroupStudents } from '../hooks/useGroups';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/api/endpoints';
import { getStoredAccessToken } from '@/features/auth/utils/auth-tokens';
import toast from 'react-hot-toast';

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

  const activeStudents = (enrollments || [])
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
      const token = getStoredAccessToken();
      const endpoint = API_ENDPOINTS.GROUPS.QR_CODES_PDF(groupId);
      const url = `${API_BASE_URL}${endpoint}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const sanitizedName = groupName.replace(/[^\w\u0600-\u06FF\s-]/gi, '').trim() || 'group';
      link.download = `${sanitizedName}-QRCodes.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(link);

      toast.success('تم تحميل كروت الـ QR بنجاح بصيغة PDF عالية الدقة.');
    } catch (error) {
      console.error('Failed to download QR code PDF:', error);
      toast.error('حدث خطأ أثناء تحميل ملف الـ PDF، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDirectPrint = () => {
    if (typeof window === 'undefined') return;

    if (process.env.NODE_ENV === 'test') {
      window.print();
      return;
    }

    const sheetElement = document.getElementById('printable-qr-sheet');
    if (!sheetElement) {
      window.print();
      return;
    }

    try {
      const existingIframe = document.getElementById('qr-print-hidden-iframe');
      if (existingIframe) {
        existingIframe.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'qr-print-hidden-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
          <head>
            <meta charset="utf-8" />
            <title>كروت الـ QR - ${groupName}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
              @page {
                size: A4 portrait;
                margin: 10mm;
              }
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              body {
                font-family: 'Cairo', system-ui, -apple-system, sans-serif;
                direction: rtl;
                background: #ffffff;
                color: #0f172a;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .sheet-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                width: 100%;
              }
              .qr-print-card {
                border: 1.5px dashed #cbd5e1;
                border-radius: 12px;
                padding: 12px 14px;
                background: #ffffff;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                page-break-inside: avoid;
                break-inside: avoid;
                min-height: ${cardsPerPage === 8 ? '210px' : '250px'};
              }
              .dir-ltr {
                direction: ltr !important;
                unicode-bidi: embed;
              }
            </style>
          </head>
          <body>
            <div class="sheet-grid">
              ${sheetElement.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
      }, 350);
    } catch {
      window.print();
    }
  };

  return (
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
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              <p className="text-sm font-medium">جاري تجهيز كروت الـ QR للطلاب...</p>
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
                <div
                  key={student.id}
                  className="qr-print-card border-2 border-dashed border-slate-300 rounded-2xl p-3.5 sm:p-4 bg-white flex flex-col items-center justify-center text-center relative overflow-hidden break-inside-avoid print:border-slate-300 print:rounded-xl"
                  style={{ minHeight: cardsPerPage === 8 ? '220px' : '260px' }}
                >
                  {/* Card Header Badge */}
                  <div className="w-full bg-slate-50 border border-slate-200/80 rounded-lg py-1 px-2 mb-2.5 flex items-center justify-center gap-1.5 text-slate-600 text-[11px] font-bold">
                    <span className="truncate">{groupName}</span>
                    {gradeLevel && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="truncate">{gradeLevel}</span>
                      </>
                    )}
                  </div>

                  {/* Sharp High-Contrast QR Code */}
                  <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-xs flex items-center justify-center">
                    <QRCode
                      value={student.studentCode || student.qrCodeToken}
                      size={cardsPerPage === 8 ? 120 : 140}
                      level="H"
                    />
                  </div>

                  {/* Student Full Name */}
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-2.5 line-clamp-1">
                    {student.fullName}
                  </h3>

                  {/* Student Code */}
                  <div className="text-xs font-mono font-bold text-primary-700 tracking-wider dir-ltr mt-0.5 select-all">
                    {student.studentCode}
                  </div>

                  {/* Student Phone */}
                  {student.phone && (
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5 dir-ltr">
                      {student.phone}
                    </div>
                  )}
                </div>
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
          /* Neutralize modal container constraints so Chrome prints without clipping or blank pages */
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
  );
}
