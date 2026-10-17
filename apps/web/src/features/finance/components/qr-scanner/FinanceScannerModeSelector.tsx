'use client';

import React from 'react';
import { CreditCard, BookOpen, Calendar } from 'lucide-react';

interface FinanceScannerModeSelectorProps {
  paymentType: 'TUITION' | 'BOOKLET';
  setPaymentType: (val: 'TUITION' | 'BOOKLET') => void;
  selectedPeriodMonth: number;
  setSelectedPeriodMonth: (val: number) => void;
  selectedPeriodYear: number;
  setSelectedPeriodYear: (val: number) => void;
  selectedBookletId: string;
  setSelectedBookletId: (val: string) => void;
  booklets: any[];
}

export function FinanceScannerModeSelector({
  paymentType,
  setPaymentType,
  selectedPeriodMonth,
  setSelectedPeriodMonth,
  selectedPeriodYear,
  setSelectedPeriodYear,
  selectedBookletId,
  setSelectedBookletId,
  booklets,
}: FinanceScannerModeSelectorProps) {
  return (
    <>
      {/* Mode Selector */}
      <div className="w-full max-w-xs flex bg-slate-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setPaymentType('TUITION')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            paymentType === 'TUITION'
              ? 'bg-white text-primary shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          اشتراك شهري
        </button>
        <button
          type="button"
          onClick={() => setPaymentType('BOOKLET')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            paymentType === 'BOOKLET'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          سداد قيمة مذكرة
        </button>
      </div>

      {/* Month & Year Selector in Tuition Mode */}
      {paymentType === 'TUITION' && (
        <div className="w-full max-w-xs bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-primary-600" />
              <span>شهر وسنة الاشتراك:</span>
            </label>
            <span className="text-[10px] font-black text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100">
              شهر {selectedPeriodMonth} / {selectedPeriodYear}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <select
                className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-primary/30 cursor-pointer"
                value={selectedPeriodMonth}
                onChange={(e) => setSelectedPeriodMonth(Number(e.target.value))}
              >
                {[
                  { m: 1, name: 'شهر 1 (يناير)' },
                  { m: 2, name: 'شهر 2 (فبراير)' },
                  { m: 3, name: 'شهر 3 (مارس)' },
                  { m: 4, name: 'شهر 4 (أبريل)' },
                  { m: 5, name: 'شهر 5 (مايو)' },
                  { m: 6, name: 'شهر 6 (يونيو)' },
                  { m: 7, name: 'شهر 7 (يوليو)' },
                  { m: 8, name: 'شهر 8 (أغسطس)' },
                  { m: 9, name: 'شهر 9 (سبتمبر)' },
                  { m: 10, name: 'شهر 10 (أكتوبر)' },
                  { m: 11, name: 'شهر 11 (نوفمبر)' },
                  { m: 12, name: 'شهر 12 (ديسمبر)' },
                ].map(({ m, name }) => (
                  <option key={m} value={m}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-primary/30 cursor-pointer"
                value={selectedPeriodYear}
                onChange={(e) => setSelectedPeriodYear(Number(e.target.value))}
              >
                {[selectedPeriodYear - 1, selectedPeriodYear, selectedPeriodYear + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Booklet Selector in Booklet Mode */}
      {paymentType === 'BOOKLET' && (
        <div className="w-full max-w-xs animate-in fade-in duration-200">
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
            المذكرة المراد سدادها للطالب
          </label>
          <select
            className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            value={selectedBookletId}
            onChange={(e) => setSelectedBookletId(e.target.value)}
          >
            <option value="">-- اختر المذكرة للتحصيل --</option>
            {booklets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} ({b.price} ج.م) - {b.gradeLevel}
              </option>
            ))}
          </select>
          {booklets.length === 0 && (
            <p className="text-[11px] text-amber-600 mt-1">
              لا توجد مذكرات نشطة حالياً. يمكنك إنشاء مذكرات من تبويب &quot;المذكرات والملازم&quot;.
            </p>
          )}
        </div>
      )}
    </>
  );
}
