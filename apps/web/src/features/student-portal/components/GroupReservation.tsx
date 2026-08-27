'use client';

import React from 'react';
import { useAvailableGroups, useReserveGroup } from '../hooks/useStudentPortal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AlertCircle, Calendar, Clock, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export function GroupReservation({ pendingEnrollment }: { pendingEnrollment?: any }) {
  const { data: groups, isLoading } = useAvailableGroups();
  const reserveMutation = useReserveGroup();

  const handleReserve = (groupId: string) => {
    reserveMutation.mutate(groupId, {
      onSuccess: () => {
        toast.success('تم حجز مكانك بنجاح! يرجى التوجه للسنتر لتأكيد الحجز.');
      },
      onError: (err: any) => {
        toast.error(err.message || 'حدث خطأ أثناء الحجز');
      }
    });
  };

  if (pendingEnrollment) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in-50 duration-300">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-8 text-center shadow-sm">
          <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-amber-900 mb-2">حجز قيد الانتظار</h2>
          <p className="text-amber-700 max-w-lg mx-auto text-lg leading-relaxed">
            لقد قمت بحجز مكان في <span className="font-bold text-amber-900">{pendingEnrollment.group?.name}</span>.
            <br />
            <br />
            <strong>تنبيه هام:</strong> الحجز غير مؤكد حتى الآن. يرجى التوجه إلى مقر السنتر لدفع الرسوم وتأكيد الحجز ليتم تفعيل حسابك وعرض لوحة التحكم الخاصة بك.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-12 w-1/3 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-primary-50 rounded-2xl p-6 border border-primary-100 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-primary-600 shrink-0 mt-1" />
        <div>
          <h2 className="text-lg font-bold text-primary-900 mb-1">اختر مجموعتك الدراسية</h2>
          <p className="text-primary-700 text-sm">
            أنت لست منضماً لأي مجموعة حالياً. يرجى اختيار إحدى المجموعات المتاحة لصفك الدراسي لحجز مكانك.
            <br />
            <strong>ملاحظة:</strong> الحجز سيعتبر قيد الانتظار حتى تقوم بتأكيده في السنتر.
          </p>
        </div>
      </div>

      {!groups || groups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">لا توجد مجموعات متاحة حالياً لصفك الدراسي.</p>
          <p className="text-sm text-slate-400 mt-1">يرجى مراجعة إدارة السنتر.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group: any) => {
            const isFull = group._count?.enrollments >= group.maxCapacity;
            return (
              <Card key={group.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden flex flex-col">
                <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                  <CardTitle className="text-lg font-bold text-slate-800 line-clamp-1">
                    {group.name}
                  </CardTitle>
                  <p className="text-sm font-medium text-slate-500">
                    أ/ {group.teacher?.user?.fullName || 'غير محدد'}
                  </p>
                </CardHeader>
                <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-5">
                  <ul className="space-y-3 text-sm text-slate-600">
                    {group.schedules?.slice(0, 2).map((schedule: any) => {
                      const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
                      return (
                        <li key={schedule.id} className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary-500" />
                          <span>{days[schedule.dayOfWeek]} - {schedule.startTime}</span>
                        </li>
                      );
                    })}
                    {group.schedules?.length > 2 && (
                      <li className="text-xs text-slate-400">+ {group.schedules.length - 2} مواعيد أخرى</li>
                    )}
                  </ul>
                  
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>الأماكن المحجوزة</span>
                      <span className="font-bold">{group._count?.enrollments || 0} / {group.maxCapacity}</span>
                    </div>
                    <Button
                      variant={isFull ? 'outline' : 'primary'}
                      className="w-full font-bold shadow-sm rounded-xl"
                      disabled={isFull || reserveMutation.isPending}
                      isLoading={reserveMutation.isPending && reserveMutation.variables === group.id}
                      onClick={() => handleReserve(group.id)}
                    >
                      {isFull ? 'المجموعة مكتملة' : 'حجز مكان'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
