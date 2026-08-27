'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, XCircle, Clock, User, Phone, MapPin } from 'lucide-react';
import { usePendingReservations, useAcceptReservation, useRejectReservation } from '@/features/groups';
import toast from 'react-hot-toast';

export function PendingReservationsSection() {
  const { data: reservations, isLoading } = usePendingReservations();
  const acceptMutation = useAcceptReservation();
  const rejectMutation = useRejectReservation();

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

  const handleAccept = (id: string, studentName: string) => {
    acceptMutation.mutate(id, {
      onSuccess: () => {
        toast.success(`تم قبول الطالب ${studentName} بنجاح`);
      },
      onError: (err: any) => {
        toast.error(err.message || 'حدث خطأ أثناء قبول الطالب');
      }
    });
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
    <Card className="shadow-sm border-amber-200 bg-gradient-to-br from-amber-50 to-white overflow-hidden relative">
      <div className="absolute top-0 right-0 w-2 h-full bg-amber-500" />
      <CardHeader className="pb-3 border-b border-amber-100/50">
        <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
          <Clock className="w-5 h-5 text-amber-600" />
          طلبات الانضمام قيد الانتظار ({reservations.length})
        </CardTitle>
        <CardDescription className="text-amber-700">
          طلاب حجزوا أماكن في المجموعات وينتظرون التأكيد (الدفع أو القبول اليدوي)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-amber-100">
          {reservations.map((reservation) => (
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
                  onClick={() => handleAccept(reservation.id, reservation.student?.user?.fullName)}
                  disabled={acceptMutation.isPending && acceptMutation.variables === reservation.id}
                  isLoading={acceptMutation.isPending && acceptMutation.variables === reservation.id}
                >
                  <CheckCircle2 className="w-4 h-4 me-1.5" />
                  تأكيد القبول
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
