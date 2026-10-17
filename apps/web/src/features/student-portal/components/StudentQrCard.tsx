'use client';

import React, { useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { QrCode, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface StudentQrCardProps {
  qrData?: { qrCodeToken?: string };
  studentName: string;
  studentCode: string;
  gradeLevel: string;
  onOpenModal: () => void;
}

export function StudentQrCard({
  qrData,
  studentName,
  studentCode,
  gradeLevel,
  onOpenModal,
}: StudentQrCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  const generateQrImageBlob = async (): Promise<Blob | null> => {
    if (!badgeRef.current || !qrData) return null;
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
          ctx.fillText(studentName, 250, 450);

          // Student Code
          ctx.fillStyle = '#2563eb';
          ctx.font = 'bold 20px monospace';
          ctx.fillText(studentCode, 250, 495);

          // Grade Level
          ctx.fillStyle = '#64748b';
          ctx.font = '16px sans-serif';
          ctx.fillText(gradeLevel, 250, 535);

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
    if (!qrData) return;
    setIsDownloading(true);
    try {
      const blob = await generateQrImageBlob();
      if (blob) {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `student-card-${studentCode}.png`;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
        toast.success('تم تنزيل البطاقة بنجاح');
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

  return (
    <Card className="border-none shadow-sm shadow-slate-200/50 overflow-hidden bg-gradient-to-b from-white to-slate-50/50">
      <CardHeader className="border-b border-slate-100 bg-white/50">
        <CardTitle className="text-md flex items-center gap-2 font-bold text-slate-800">
          <QrCode className="w-5 h-5 text-primary-600" />
          بطاقة الـ QR الخاصة بك
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 flex flex-col items-center">
        {/* Card visual wrapper */}
        <div 
          ref={badgeRef}
          className="w-full flex flex-col items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden"
        >
          {/* Decorative element */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary-500 to-primary-700"></div>

          <div 
            onClick={() => qrData?.qrCodeToken && onOpenModal()}
            className="bg-white p-4 rounded-xl shadow-xs ring-1 ring-slate-100 mb-5 mt-2 transition-all hover:scale-105 hover:shadow-md cursor-pointer relative group duration-300"
            title="اضغط لتكبير الكود"
          >
            {qrData?.qrCodeToken ? (
              <>
                <QRCode value={qrData.qrCodeToken} size={180} />
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors flex items-center justify-center rounded-xl">
                  <span className="text-xs font-bold text-white bg-slate-900/80 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    اضغط للتكبير
                  </span>
                </div>
              </>
            ) : (
              <div className="w-[180px] h-[180px] bg-slate-100 flex items-center justify-center rounded-lg text-slate-400 text-xs">
                لا يوجد كود QR
              </div>
            )}
          </div>

          <div className="text-center space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900">{studentName}</h3>
            <p className="text-sm font-semibold text-primary-600 font-mono tracking-wide">{studentCode}</p>
            <Badge variant="outline" className="bg-slate-50/50 border-slate-200/60 text-slate-600 px-3">
              {gradeLevel}
            </Badge>
          </div>
        </div>

        {/* Action buttons */}
        <div className="w-full mt-6">
          <Button
            onClick={handleDownload}
            disabled={isDownloading || !qrData}
            className="w-full py-5 rounded-xl bg-slate-900 hover:bg-slate-950 text-white font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isDownloading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isDownloading ? 'جاري التحضير والتنزيل...' : 'تنزيل بطاقة الـ QR'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
