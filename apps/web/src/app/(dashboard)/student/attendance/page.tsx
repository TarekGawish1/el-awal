'use client';

import React, { useRef, useState } from 'react';
import { useStudentProfile, useStudentQrCode, useStudentAttendance } from '@/features/student-portal/hooks/useStudentPortal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import QRCode from 'react-qr-code';
import { QrCode, Calendar, TrendingUp, CheckCircle2, XCircle, Clock, Download, X } from 'lucide-react';
import { formatArabicDate, formatArabicTime } from '@/lib/utils/formatters';

export default function StudentAttendancePage() {
  const { data: profile, isLoading: isProfileLoading } = useStudentProfile();
  const { data: qrData, isLoading: isQrLoading } = useStudentQrCode();
  const { data: attendanceData, isLoading: isAttendanceLoading } = useStudentAttendance();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  const studentName = profile?.user?.fullName || 'الطالب';
  const studentCode = profile?.studentCode || 'N/A';
  const gradeLevel = profile?.gradeLevel || '—';

  // Calculate stats from attendance data
  const records = attendanceData?.data || [];
  const totalSessions = records.length;
  const presentCount = records.filter((r: any) => r.status === 'PRESENT').length;
  const absentCount = records.filter((r: any) => r.status === 'ABSENT').length;
  const excusedCount = records.filter((r: any) => r.status === 'EXCUSED').length;

  const attendanceRate = totalSessions > 0 
    ? Math.round((presentCount / totalSessions) * 100) 
    : 100;

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
      } else {
        alert('حدث خطأ أثناء إنشاء الصورة.');
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء محاولة التنزيل.');
    } finally {
      setIsDownloading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <Badge variant="success" className="gap-1 font-medium"><CheckCircle2 className="w-3 h-3" /> حاضر</Badge>;
      case 'ABSENT':
        return <Badge variant="error" className="gap-1 font-medium"><XCircle className="w-3 h-3" /> غائب</Badge>;
      case 'EXCUSED':
        return <Badge variant="warning" className="gap-1 font-medium"><Clock className="w-3 h-3" /> معذر</Badge>;
      default:
        return <Badge variant="outline">غير مسجل</Badge>;
    }
  };

  if (isProfileLoading || isQrLoading || isAttendanceLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Skeleton className="h-[450px] w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">سجل الحضور والـ QR</h1>
        <p className="text-sm text-slate-500 mt-1">عرض بطاقة الحضور الرقمية الخاصة بك وسجل حضورك للمجموعات الدراسية</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Digital Student Card Container */}
        <div className="lg:col-span-1">
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
                  onClick={() => qrData?.qrCodeToken && setIsQrModalOpen(true)}
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
                  className="w-full py-5 rounded-xl bg-slate-900 hover:bg-slate-950 text-white font-semibold transition-colors flex items-center justify-center gap-2"
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
        </div>

        {/* Attendance Statistics and History Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-none shadow-sm shadow-slate-200/50">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">نسبة الحضور</p>
                  <h4 className="text-xl font-bold text-slate-800 mt-0.5">{attendanceRate}%</h4>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm shadow-slate-200/50">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">أيام الحضور</p>
                  <h4 className="text-xl font-bold text-slate-800 mt-0.5">{presentCount}</h4>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm shadow-slate-200/50">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">أيام الغياب</p>
                  <h4 className="text-xl font-bold text-slate-800 mt-0.5">{absentCount + excusedCount}</h4>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* History */}
          <Card className="border-none shadow-sm shadow-slate-200/50">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-md flex items-center gap-2 font-bold text-slate-800">
                <Calendar className="w-5 h-5 text-primary-600" />
                سجل الحضور والغياب التفصيلي
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {records.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">لا توجد سجلات حضور مسجلة بعد.</p>
                  <p className="text-xs text-slate-400 mt-1">عند حضورك الحصص وتأكيد الكود الخاص بك، ستظهر السجلات هنا.</p>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500">
                        <th className="py-3.5 px-6 font-semibold">التاريخ</th>
                        <th className="py-3.5 px-6 font-semibold">المجموعة الدراسية / الدرس</th>
                        <th className="py-3.5 px-6 font-semibold">حالة الحضور</th>
                        <th className="py-3.5 px-6 font-semibold">طريقة الرصد</th>
                        <th className="py-3.5 px-6 font-semibold">وقت الرصد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {records.map((record: any) => (
                        <tr key={record.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-4 px-6 font-medium text-slate-800">
                            {formatArabicDate(record.session?.sessionDate)}
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-semibold text-slate-800 block">
                              {record.session?.group?.name}
                            </span>
                            {record.session?.topic && (
                              <span className="text-xs text-slate-500 block mt-0.5">
                                {record.session.topic}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {getStatusBadge(record.status)}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-500">
                            {record.recordingMethod === 'QR_SCAN' ? 'مسح QR Code' : 'رصد يدوي'}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-500 font-mono">
                            {record.recordedAt ? formatArabicTime(record.recordedAt) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Large QR Modal Overlay */}
      {isQrModalOpen && qrData?.qrCodeToken && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsQrModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl border border-slate-100 flex flex-col items-center relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-slate-800">بطاقة الحضور السريع</h2>
              <p className="text-xs text-slate-500 mt-1">وجه الكود لقارئ الـ QR لتسجيل حضورك</p>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-100 mb-6">
              <QRCode value={qrData.qrCodeToken} size={250} />
            </div>

            {/* Student Info */}
            <div className="text-center space-y-2 w-full">
              <h3 className="text-xl font-bold text-slate-900">{studentName}</h3>
              <p className="text-base font-bold text-primary-600 font-mono tracking-wider">{studentCode}</p>
              <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-600 px-4 py-1 text-xs">
                {gradeLevel}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
