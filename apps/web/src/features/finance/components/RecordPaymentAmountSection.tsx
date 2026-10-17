'use client';

import React from 'react';
import { UseFormRegister } from 'react-hook-form';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';
import { PaymentFormData } from '../hooks/useRecordPaymentModalState';

interface RecordPaymentAmountSectionProps {
  register: UseFormRegister<PaymentFormData>;
  errors: any;
  isPending: boolean;
  selectedStudentId?: string;
  selectedStudent?: any;
  groupFee: number;
  paymentType: 'TUITION' | 'BOOKLET';
  isBookletAlreadyPaid: boolean;
  isPreviouslyPartial: boolean;
  previouslyPaid: number;
  currentExpectedAmount: number;
  currentEnteredAmount: number;
  totalCumulativePaid: number;
  remainingDue: number;
  isFullPayment: boolean;
  isPartialPayment: boolean;
  onSetAmountPaid: (amount: number) => void;
  onClose: () => void;
}

export function RecordPaymentAmountSection({
  register,
  errors,
  isPending,
  selectedStudentId,
  selectedStudent,
  groupFee,
  paymentType,
  isBookletAlreadyPaid,
  isPreviouslyPartial,
  previouslyPaid,
  currentExpectedAmount,
  currentEnteredAmount,
  totalCumulativePaid,
  remainingDue,
  isFullPayment,
  isPartialPayment,
  onSetAmountPaid,
  onClose,
}: RecordPaymentAmountSectionProps) {
  return (
    <>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label className="block text-xs font-bold text-slate-700">
            {isPreviouslyPartial
              ? 'المبلغ المحصل الآن لاستكمال السداد (ج.م)'
              : 'المبلغ المحصل الآن (ج.م)'}{' '}
            <span className="text-red-500">*</span>
          </Label>
          {currentExpectedAmount > 0 && (
            <div className="flex items-center gap-1.5">
              {isPreviouslyPartial ? (
                <button
                  type="button"
                  onClick={() =>
                    onSetAmountPaid(
                      selectedStudent?.remainingAmount ??
                        Math.max(0, currentExpectedAmount - previouslyPaid)
                    )
                  }
                  className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors border border-emerald-200 cursor-pointer"
                >
                  سداد المتبقي كاملاً (
                  {selectedStudent?.remainingAmount ??
                    Math.max(0, currentExpectedAmount - previouslyPaid)}{' '}
                  ج.م)
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSetAmountPaid(currentExpectedAmount)}
                    className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg transition-colors cursor-pointer border border-emerald-200"
                  >
                    {selectedStudent?.rateMultiplier === 0.5
                      ? `سداد نصف الشهر (${currentExpectedAmount} ج.م)`
                      : `سداد كامل (${currentExpectedAmount} ج.م)`}
                  </button>
                  {selectedStudent?.rateMultiplier !== 0.5 && currentExpectedAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => onSetAmountPaid(Math.round(currentExpectedAmount / 2))}
                      className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg transition-colors cursor-pointer border border-amber-200"
                    >
                      سداد النصف ({Math.round(currentExpectedAmount / 2)} ج.م)
                    </button>
                  )}
                  {selectedStudent?.rateMultiplier === 0.5 && groupFee > currentExpectedAmount && (
                    <button
                      type="button"
                      onClick={() => onSetAmountPaid(groupFee)}
                      className="text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer border border-slate-300"
                    >
                      سداد شهر كامل ({groupFee} ج.م)
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <Input
          type="number"
          step="any"
          min="0"
          {...register('amountPaid', { valueAsNumber: true })}
          disabled={isPending}
          className="font-bold text-emerald-700 text-base"
        />
        {errors.amountPaid && (
          <p className="text-red-500 text-xs mt-1 font-medium">{errors.amountPaid.message}</p>
        )}

        {/* Dynamic Partial / Full Payment Calculation Summary */}
        {selectedStudentId && currentExpectedAmount > 0 && (
          <div
            className={`mt-2 p-3.5 rounded-xl border text-xs transition-all ${
              isFullPayment
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : isPartialPayment
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span>
                {isFullPayment
                  ? 'سداد كامل للمبلغ'
                  : isPartialPayment
                  ? 'سداد جزئي (دفعة مقدمة / قسط)'
                  : 'تفاصيل الرسوم المستحقة'}
              </span>
              <span className="font-extrabold">إجمالي الاشتراك: {currentExpectedAmount} ج.م</span>
            </div>

            {isPreviouslyPartial && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold border-t border-amber-200/60 pt-1.5 text-amber-800">
                <span>المسدد سابقاً: {previouslyPaid} ج.م</span>
                <span className="text-blue-700 font-bold">
                  المحصل الآن: {currentEnteredAmount} ج.م
                </span>
              </div>
            )}

            <div className="mt-1 flex items-center justify-between text-[11px] font-bold border-t border-slate-200/60 pt-1">
              <span>الإجمالي المسدد بعد هذه العملية: {totalCumulativePaid} ج.م</span>
              <span className={remainingDue === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                {remainingDue === 0 ? '✅ تم سداد كامل المبلغ' : `المتبقي: ${remainingDue} ج.م`}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5 block text-xs font-bold text-slate-700">
            رقم الإيصال (اختياري)
          </Label>
          <Input
            type="text"
            placeholder="رقم الإيصال الورقي"
            {...register('receiptNumber')}
            disabled={isPending}
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-bold text-slate-700">ملاحظات (اختياري)</Label>
          <Input
            type="text"
            placeholder="...ملاحظات أو خصم"
            {...register('notes')}
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
          disabled={
            isPending ||
            !selectedStudentId ||
            currentEnteredAmount <= 0 ||
            (paymentType === 'BOOKLET' && isBookletAlreadyPaid)
          }
          className={
            paymentType === 'BOOKLET'
              ? 'bg-purple-600 hover:bg-purple-700 text-white font-bold'
              : isPartialPayment
              ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold'
              : 'bg-primary hover:bg-primary/90 text-white font-bold'
          }
        >
          {isPending ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري الحفظ...</span>
            </div>
          ) : isPartialPayment ? (
            `حفظ دفعة جزئية (${currentEnteredAmount} ج.م)`
          ) : (
            'حفظ عملية السداد'
          )}
        </Button>
      </div>
    </>
  );
}
