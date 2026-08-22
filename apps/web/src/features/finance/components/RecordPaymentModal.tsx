'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, DollarSign, BookOpen, CreditCard, Loader2 } from 'lucide-react';
import { useRecordPayment, useGroupDefaulters } from '../hooks/useFinance';
import { useBooklets } from '@/features/booklets/hooks/useBooklets';
import { PaymentStatus } from '../types/finance.types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import toast from 'react-hot-toast';

const paymentSchema = z.object({
  studentId: z.string().min(1, 'يجب اختيار الطالب'),
  bookletId: z.string().optional(),
  amountPaid: z.number().min(0, 'المبلغ يجب أن يكون 0 أو أكثر'),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  groupId?: string;
  periodYear: number;
  periodMonth: number;
  allStudents?: Array<{ id: string; fullName: string; studentCode?: string }>;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  groupId = '',
  periodYear,
  periodMonth,
  allStudents = [],
}: Props) {
  const [paymentType, setPaymentType] = useState<'TUITION' | 'BOOKLET'>('TUITION');

  const { mutate: recordPayment, isPending } = useRecordPayment();
  const { data: defaultersData, isLoading: isDefaultersLoading } = useGroupDefaulters(
    groupId,
    periodYear,
    periodMonth,
  );
  const { booklets, isLoading: isBookletsLoading } = useBooklets(
    groupId ? { groupId } : undefined,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  });

  const selectedStudentId = watch('studentId');
  const selectedBookletId = watch('bookletId');
  const defaulters = defaultersData?.defaulters || [];

  // Available students list depending on mode
  const availableStudents =
    paymentType === 'TUITION' && defaulters.length > 0
      ? defaulters.map((d) => ({
          id: d.studentId,
          name: d.fullName,
          fee: d.monthlyFeeExpected,
        }))
      : allStudents.length > 0
      ? allStudents.map((s) => ({ id: s.id, name: s.fullName, fee: 0 }))
      : defaulters.map((d) => ({
          id: d.studentId,
          name: d.fullName,
          fee: d.monthlyFeeExpected,
        }));

  // Auto-fill amount based on student expected fee when selected
  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setValue('studentId', sId);
    if (sId && paymentType === 'TUITION') {
      const student = defaulters.find((d) => d.studentId === sId);
      if (student) {
        setValue('amountPaid', student.monthlyFeeExpected);
      }
    }
  };

  const handleBookletChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bId = e.target.value;
    setValue('bookletId', bId);
    if (bId) {
      const b = booklets.find((item) => item.id === bId);
      if (b) {
        setValue('amountPaid', Number(b.price));
      }
    }
  };

  const handlePaymentTypeChange = (type: 'TUITION' | 'BOOKLET') => {
    setPaymentType(type);
    if (type === 'BOOKLET' && booklets.length > 0) {
      setValue('bookletId', booklets[0].id);
      setValue('amountPaid', Number(booklets[0].price));
    } else if (type === 'TUITION' && selectedStudentId) {
      const student = defaulters.find((d) => d.studentId === selectedStudentId);
      if (student) {
        setValue('amountPaid', student.monthlyFeeExpected);
      }
      setValue('bookletId', undefined);
    }
  };

  if (!isOpen) return null;

  const onSubmit = (data: PaymentFormData) => {
    if (paymentType === 'BOOKLET' && !data.bookletId) {
      toast.error('يرجى اختيار المذكرة المراد سداد قيمتها');
      return;
    }

    const student = defaulters.find((d) => d.studentId === data.studentId);
    const booklet = booklets.find((b) => b.id === data.bookletId);

    const expected =
      paymentType === 'BOOKLET'
        ? booklet
          ? Number(booklet.price)
          : data.amountPaid
        : student?.monthlyFeeExpected;

    recordPayment(
      {
        studentId: data.studentId,
        groupId: groupId || undefined,
        bookletId: paymentType === 'BOOKLET' ? data.bookletId : undefined,
        paymentType,
        periodYear,
        periodMonth,
        amountPaid: data.amountPaid,
        amountExpected: expected,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: 'CASH',
        receiptNumber: data.receiptNumber,
        notes:
          data.notes ||
          (paymentType === 'BOOKLET' && booklet ? `سداد مذكرة: ${booklet.title}` : undefined),
      } as any,
      {
        onSuccess: () => {
          toast.success(
            paymentType === 'BOOKLET'
              ? 'تم تسجيل سداد المذكرة بنجاح 📚'
              : 'تم تسجيل سداد المصروفات بنجاح 💳',
          );
          reset();
          onClose();
        },
        onError: (err: any) => toast.error(err.message || 'حدث خطأ أثناء التسجيل'),
      },
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            {paymentType === 'BOOKLET' ? (
              <BookOpen className="w-5 h-5 text-purple-600" />
            ) : (
              <DollarSign className="w-5 h-5 text-primary" />
            )}
            تسجيل عملية سداد
          </h2>
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Payment Type Segmented Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handlePaymentTypeChange('TUITION')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                paymentType === 'TUITION'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              اشتراك شهري / حصص
            </button>
            <button
              type="button"
              onClick={() => handlePaymentTypeChange('BOOKLET')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                paymentType === 'BOOKLET'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              سداد قيمة مذكرة
            </button>
          </div>

          <div
            className={`border rounded-xl p-3 flex justify-between items-center text-xs ${
              paymentType === 'BOOKLET'
                ? 'bg-purple-50/50 border-purple-100 text-purple-900'
                : 'bg-blue-50/50 border-blue-100 text-blue-900'
            }`}
          >
            <span className="font-medium">نوع المعاملة:</span>
            <span className="font-bold">
              {paymentType === 'BOOKLET'
                ? 'تحصيل قيمة ملزمة / مذكرة دراسية'
                : `شهر الاستحقاق: ${periodMonth} / ${periodYear}`}
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Student Select */}
            <div>
              <Label className="mb-1.5 block text-xs font-bold text-slate-700">
                الطالب <span className="text-red-500">*</span>
              </Label>
              <select
                className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-primary/20 bg-white"
                value={selectedStudentId || ''}
                onChange={handleStudentChange}
                disabled={isPending || isDefaultersLoading}
              >
                <option value="">-- اختر طالباً --</option>
                {availableStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.fee ? `(${s.fee} ج.م)` : ''}
                  </option>
                ))}
              </select>
              {errors.studentId && (
                <p className="text-red-500 text-xs mt-1 font-medium">
                  {errors.studentId.message}
                </p>
              )}
            </div>

            {/* Booklet Select (If Booklet Mode) */}
            {paymentType === 'BOOKLET' && (
              <div>
                <Label className="mb-1.5 block text-xs font-bold text-slate-700">
                  المذكرة / الملزمة الدراسية <span className="text-red-500">*</span>
                </Label>
                <select
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-purple-500/20 bg-white"
                  value={selectedBookletId || ''}
                  onChange={handleBookletChange}
                  disabled={isPending || isBookletsLoading}
                >
                  <option value="">-- اختر المذكرة --</option>
                  {booklets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} - {b.gradeLevel} ({b.price} ج.م)
                    </option>
                  ))}
                </select>
                {booklets.length === 0 && !isBookletsLoading && (
                  <p className="text-amber-600 text-xs mt-1">
                    لا توجد مذكرات نشطة حالياً. يمكنك إضافة مذكرات من تبويب "المذكرات والملازم".
                  </p>
                )}
              </div>
            )}

            {/* Amount Paid */}
            <div>
              <Label className="mb-1.5 block text-xs font-bold text-slate-700">
                المبلغ المحصل (ج.م) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                step="any"
                min="0"
                {...register('amountPaid', { valueAsNumber: true })}
                disabled={isPending}
                className="font-bold text-emerald-700"
              />
              {errors.amountPaid && (
                <p className="text-red-500 text-xs mt-1 font-medium">
                  {errors.amountPaid.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs font-bold text-slate-700">
                  رقم الإيصال (اختياري)
                </Label>
                <Input
                  {...register('receiptNumber')}
                  placeholder="رقم الإيصال الورقي"
                  disabled={isPending}
                />
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-bold text-slate-700">
                  ملاحظات (اختياري)
                </Label>
                <Input
                  {...register('notes')}
                  placeholder="ملاحظات أو خصم..."
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className={
                  paymentType === 'BOOKLET'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-primary hover:bg-primary/90 text-white'
                }
              >
                {isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </div>
                ) : (
                  'حفظ عملية السداد'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
