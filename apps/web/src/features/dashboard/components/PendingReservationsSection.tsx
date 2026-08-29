'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { CheckCircle2, XCircle, Clock, User, Phone, MapPin, QrCode, Banknote, CalendarClock, AlertCircle, X, Search } from 'lucide-react';
import { usePendingReservations, useAcceptReservation, useRejectReservation, useGroups, useChangeReservationGroup } from '@/features/groups';
import toast from 'react-hot-toast';
import { Scanner } from '@yudiel/react-qr-scanner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

export function PendingReservationsSection() {
  const { data: reservations, isLoading } = usePendingReservations();
  const acceptMutation = useAcceptReservation();
  const rejectMutation = useRejectReservation();
  const changeGroupMutation = useChangeReservationGroup();
  const { data: allGroups } = useGroups();
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [acceptModalData, setAcceptModalData] = useState<{ id: string; studentName: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredReservations = useMemo(() => {
    if (!reservations) return [];
    if (!searchQuery.trim()) return reservations;
    const lowerQuery = searchQuery.toLowerCase();
    return reservations.filter(r => 
      r.student?.user?.fullName?.toLowerCase().includes(lowerQuery) ||
      r.student?.user?.phone?.includes(lowerQuery) ||
      r.student?.studentCode?.toLowerCase().includes(lowerQuery) ||
      r.group?.name?.toLowerCase().includes(lowerQuery)
    );
  }, [reservations, searchQuery]);

  if (isLoading) {
    return (
      <Card className="shadow-sm border-neutral-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-neutral-400" />
            طلبات الانضمام قيد الانتظار
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-neutral-100 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!reservations || reservations.length === 0) {
    return null;
  }

  const handleScan = (text: string) => {
    // text is likely qr_tok_... or student code
    setIsScannerOpen(false);
    const reservation = reservations.find(r => 
      r.student?.qrCodeToken === text || 
      r.student?.studentCode === text
    );
    
    if (reservation) {
      toast.success(`تم العثور على حجز للطالب: ${reservation.student?.user?.fullName}`);
      setAcceptModalData({
        id: reservation.id,
        studentName: reservation.student?.user?.fullName || 'غير معروف'
      });
    } else {
      toast.error('لم يتم العثور على حجز قيد الانتظار لهذا الطالب');
    }
  };

  const executeAccept = (id: string, studentName: string, paymentStatus: 'PAID' | 'LATER') => {
    acceptMutation.mutate(
      { enrollmentId: id, paymentStatus },
      {
        onSuccess: () => {
          toast.success(`تم قبول الطالب ${studentName} بنجاح ${paymentStatus === 'PAID' ? 'مع تسجيل الدفع' : 'مع تسجيل تأجيل الدفع'}`);
          setAcceptModalData(null);
        },
        onError: (err: any) => {
          toast.error(err.message || 'حدث خطأ أثناء قبول الطالب');
        }
      }
    );
  };

  const handleReject = (id: string, studentName: string) => {
    if (confirm(`هل أنت متأكد من رفض حجز الطالب ${studentName}؟`)) {
      rejectMutation.mutate(id, {
        onSuccess: () => {
          toast.success(`تم رفض حجز الطالب ${studentName}`);
        },
        onError: (err: any) => {
          toast.error(err.message || 'حدث خطأ أثناء الرفض');
        }
      });
    }
  };

  return (
    <>
      <Card className="shadow-sm border-amber-200 bg-gradient-to-br from-amber-50 to-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-2 h-full bg-amber-500" />
        <CardHeader className="pb-3 border-b border-amber-100/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
              <Clock className="w-5 h-5 text-amber-600" />
              طلبات الانضمام قيد الانتظار ({reservations.length})
            </CardTitle>
            <CardDescription className="text-amber-700 mt-1">
              طلاب حجزوا أماكن في المجموعات وينتظرون التأكيد (الدفع أو القبول اليدوي)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              <Input
                placeholder="ابحث بالاسم أو الرقم أو المجموعة..."
                className="pl-3 pr-9 py-2 border-neutral-200 focus:border-amber-300 focus:ring-amber-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 shrink-0 hidden sm:flex" 
              onClick={() => setIsScannerOpen(true)}
              title="مسح QR لتأكيد القبول"
            >
              <QrCode className="w-4 h-4 me-2" />
              مسح QR
            </Button>
            <Button 
              className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 shrink-0 sm:hidden" 
              onClick={() => setIsScannerOpen(true)}
              title="مسح QR لتأكيد القبول"
            >
              <QrCode className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-amber-100">
          {filteredReservations.length > 0 ? filteredReservations.map((reservation) => (
              <div key={reservation.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-amber-100/20 transition-colors">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-neutral-900">{reservation.student?.user?.fullName || 'غير معروف'}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {reservation.student?.user?.phone || 'لا يوجد رقم'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {reservation.group?.name}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-[10px] text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full hover:bg-primary-100 transition-colors">
                            تغيير المجموعة
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>اختر المجموعة الجديدة</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {allGroups?.map(g => (
                            <DropdownMenuItem 
                              key={g.id} 
                              onClick={() => changeGroupMutation.mutate({ enrollmentId: reservation.id, groupId: g.id })}
                              disabled={g.id === reservation.groupId || changeGroupMutation.isPending}
                            >
                              {g.name} {g.id === reservation.groupId && '(الحالية)'}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-none font-medium px-2 py-0 h-5">
                        {new Date(reservation.enrolledAt).toLocaleDateString('ar-EG')}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-error-600 hover:text-error-700 hover:bg-error-50 border-error-200"
                    onClick={() => handleReject(reservation.id, reservation.student?.user?.fullName)}
                    disabled={rejectMutation.isPending && rejectMutation.variables === reservation.id}
                  >
                    <XCircle className="w-4 h-4 me-1.5" />
                    رفض
                  </Button>
                  <Button 
                    size="sm"
                    className="bg-primary-600 hover:bg-primary-700 text-white"
                    onClick={() => setAcceptModalData({ id: reservation.id, studentName: reservation.student?.user?.fullName || 'غير معروف' })}
                  >
                    <CheckCircle2 className="w-4 h-4 me-1.5" />
                    تأكيد القبول
                  </Button>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-neutral-500">
                <p>لم يتم العثور على أي حجز مطابق للبحث</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-neutral-800">مسح كود الطالب</h3>
              <button onClick={() => setIsScannerOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 bg-neutral-50 flex flex-col items-center">
              <div className="w-full max-w-[300px] aspect-square rounded-xl overflow-hidden shadow-inner border border-neutral-200 relative bg-black">
                <Scanner
                  onScan={(detectedCodes) => {
                    if (detectedCodes && detectedCodes.length > 0) {
                      handleScan(detectedCodes[0].rawValue);
                    }
                  }}
                  onError={(error) => console.error(error?.message)}
                  scanDelay={150}
                  components={{
                    audio: false,
                    torch: true,
                    zoom: false,
                    finder: true,
                  }}
                  constraints={{
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    advanced: [
                      { focusMode: 'continuous' },
                      { exposureMode: 'continuous' },
                      { whiteBalanceMode: 'continuous' },
                    ]
                  } as any}
                />
              </div>
              <p className="mt-4 text-center text-sm text-neutral-500">
                قم بتوجيه الكاميرا نحو بطاقة الطالب أو شاشة هاتفه التي تحتوي على رمز الـ QR
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {acceptModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-primary-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-primary-900">تأكيد قبول الطالب</h3>
                  <p className="text-xs text-primary-700">{acceptModalData.studentName}</p>
                </div>
              </div>
              <button onClick={() => setAcceptModalData(null)} className="text-primary-400 hover:text-primary-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                <p>هل قام الطالب بدفع مصروفات الشهر الحالي عند حضوره؟ يرجى تحديد حالة الدفع لتسجيلها في النظام.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button 
                  className="h-24 flex flex-col items-center justify-center gap-2 bg-white border-2 border-green-500 text-green-700 hover:bg-green-50"
                  variant="outline"
                  onClick={() => executeAccept(acceptModalData.id, acceptModalData.studentName, 'PAID')}
                  disabled={acceptMutation.isPending}
                >
                  <Banknote className="w-8 h-8" />
                  <span className="font-bold">نعم، دفع الآن</span>
                </Button>
                
                <Button 
                  className="h-24 flex flex-col items-center justify-center gap-2 bg-white border-2 border-neutral-300 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-400"
                  variant="outline"
                  onClick={() => executeAccept(acceptModalData.id, acceptModalData.studentName, 'LATER')}
                  disabled={acceptMutation.isPending}
                >
                  <CalendarClock className="w-8 h-8" />
                  <span className="font-bold">لا، سيدفع لاحقاً</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
