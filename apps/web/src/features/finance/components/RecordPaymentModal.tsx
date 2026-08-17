'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, DollarSign, Loader2 } from 'lucide-react';
import { useRecordPayment, useGroupDefaulters } from '../hooks/useFinance';
import { PaymentStatus } from '../types/finance.types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import toast from 'react-hot-toast';

const paymentSchema = z.object({
  studentId: z.string().min(1, 'يجب اختيار الطالب'),
  amountPaid: z.number().min(0, 'المبلغ يجب أن يكون 0 أو أكثر'),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  periodYear: number;
  periodMonth: number;
}

export function RecordPaymentModal({ isOpen, onClose, groupId, periodYear, periodMonth }: Props) {
  const { mutate: recordPayment, isPending } = useRecordPayment();
  const { data: defaultersData, isLoading } = useGroupDefaulters(groupId, periodYear, periodMonth);
  
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  });

  const selectedStudentId = watch('studentId');
  const defaulters = defaultersData?.defaulters || [];

  // Auto-fill amount based on student expected fee when selected
  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setValue('studentId', sId);
    if (sId) {
      const student = defaulters.find(d => d.studentId === sId);
      if (student) {
        setValue('amountPaid', student.monthlyFeeExpected);
      }
    }
  };

  if (!isOpen) return null;

  const onSubmit = (data: PaymentFormData) => {
    const student = defaulters.find(d => d.studentId === data.studentId);
    
    recordPayment(
      {
        ...data,
        groupId,
        periodYear,
        periodMonth,
        amountExpected: student?.monthlyFeeExpected,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'CASH',
      },
      {
        onSuccess: () => {
          toast.success('تم تسجيل السداد بنجاح');
          reset();
          onClose();
        },
        onError: (err: any) => toast.error(err.message || 'حدث خطأ أثناء التسجيل'),
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            تسجيل سداد مصروفات
          </h2>
          <button onClick={onClose} disabled={isPending} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 mb-6 flex justify-between items-center">
            <span className="text-sm text-slate-600 font-medium">شهر الاستحقاق:</span>
            <span className="font-bold text-blue-700">{periodMonth} / {periodYear}</span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label className="mb-2 block text-sm font-bold">الطالب <span className="text-red-500">*</span></Label>
              <select
                className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-primary/20 bg-white"
                value={selectedStudentId || ''}
                onChange={handleStudentChange}
                disabled={isPending || isLoading}
              >
                <option value="">-- اختر طالباً متأخراً عن السداد --</option>
                {defaulters.map(d => (
                  <option key={d.studentId} value={d.studentId}>{d.fullName}</option>
                ))}
              </select>
              {errors.studentId && <p className="text-red-500 text-xs mt-1 font-medium">{errors.studentId.message}</p>}
            </div>

            <div>
              <Label className="mb-2 block text-sm font-bold">المبلغ المدفوع (ج.م) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                step="0.5"
                {...register('amountPaid', { valueAsNumber: true })}
                disabled={isPending}
              />
              {errors.amountPaid && <p className="text-red-500 text-xs mt-1 font-medium">{errors.amountPaid.message}</p>}
            </div>

            <div>
              <Label className="mb-2 block text-sm font-bold">رقم الإيصال (اختياري)</Label>
              <Input
                {...register('receiptNumber')}
                placeholder="رقم الدفتر أو الإيصال المطبوع"
                disabled={isPending}
              />
            </div>

            <div>
              <Label className="mb-2 block text-sm font-bold">ملاحظات (اختياري)</Label>
              <Input
                {...register('notes')}
                placeholder="ملاحظات حول الدفع أو الخصم..."
                disabled={isPending}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري الحفظ...</>
                ) : (
                  'حفظ الدفعة'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
