'use client';

import React from 'react';
import { CreditCard, BookOpen, Users, Calendar, Volume2, VolumeX } from 'lucide-react';

interface PaymentScannerControlsProps {
  paymentType: 'TUITION' | 'BOOKLET';
  setPaymentType: (type: 'TUITION' | 'BOOKLET') => void;
  groupId: string;
  setGroupId: (id: string) => void;
  selectedBookletId: string;
  setSelectedBookletId: (id: string) => void;
  periodYear: number;
  setPeriodYear: (year: number) => void;
  periodMonth: number;
  setPeriodMonth: (month: number) => void;
  amountPaidOverride: string;
  setAmountPaidOverride: (val: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  groups: any[];
  eligibleBooklets: any[];
}

export function PaymentScannerControls({
  paymentType,
  setPaymentType,
  groupId,
  setGroupId,
  selectedBookletId,
  setSelectedBookletId,
  periodYear,
  setPeriodYear,
  periodMonth,
  setPeriodMonth,
  amountPaidOverride,
  setAmountPaidOverride,
  soundEnabled,
  setSoundEnabled,
  groups,
  eligibleBooklets,
}: PaymentScannerControlsProps) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];

  return (
    <div className="space-y-4">
      {/* Segmented Mode Selector */}
      <div className="flex bg-slate-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setPaymentType('TUITION')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
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
          onClick={() => setPaymentType('BOOKLET')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            paymentType === 'BOOKLET'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          سداد قيمة مذكرة
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {paymentType === 'TUITION' ? (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-primary" />
                المجموعة
              </label>
              <select
                className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-primary/20"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              >
                <option value="">تلقائي (حسب اشتراك الطالب)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.monthlyFee} ج.م)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                شهر الاستحقاق
              </label>
              <div className="flex gap-1.5">
                <select
                  className="w-2/3 h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-primary/20"
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(Number(e.target.value))}
                >
                  {months.map((m) => (
                    <option key={m} value={m}>
                      شهر {m}
                    </option>
                  ))}
                </select>
                <select
                  className="w-1/3 h-9 rounded-lg border border-slate-200 bg-white px-1.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-primary/20"
                  value={periodYear}
                  onChange={(e) => setPeriodYear(Number(e.target.value))}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                مجموعة الطالب
              </label>
              <select
                className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-purple-500/20"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              >
                <option value="">-- اختر المجموعة أولاً --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} - {g.gradeLevel}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                المذكرة المراد سدادها
              </label>
              <select
                className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-purple-500/20"
                value={selectedBookletId}
                onChange={(e) => setSelectedBookletId(e.target.value)}
                disabled={!groupId || eligibleBooklets.length === 0}
              >
                <option value="">-- اختر المذكرة للتحصيل --</option>
                {eligibleBooklets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} - {b.gradeLevel} ({b.price} ج.م)
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Custom Amount & Sound */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-primary" />
              المبلغ (اختياري)
            </label>
            <input
              type="number"
              placeholder="تلقائي"
              value={amountPaidOverride}
              onChange={(e) => setAmountPaidOverride(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'كتم الصوت' : 'تفعيل صوت التأكيد'}
            className={`h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-primary-50 border-primary-200 text-primary-700'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
