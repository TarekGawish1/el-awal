'use client';

import React from 'react';
import { CreditCard, Gift, Check, Sparkles } from 'lucide-react';

interface CoursePricingSectionProps {
  isFreeCourse: boolean;
  setIsFreeCourse: (val: boolean) => void;
  price: string;
  setPrice: (val: string) => void;
  hasCertificate: boolean;
  setHasCertificate: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export function CoursePricingSection({
  isFreeCourse,
  setIsFreeCourse,
  price,
  setPrice,
  hasCertificate,
  setHasCertificate,
}: CoursePricingSectionProps) {
  return (
    <>
      {/* Course Pricing Type (مجاني / مدفوع) */}
      <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
        <label className="block text-xs font-bold text-slate-800">
          نوع الاشتراك وتسعير الكورس
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setIsFreeCourse(false);
              if (price === '0' || !price) setPrice('200');
            }}
            className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
              !isFreeCourse
                ? 'bg-white border-primary-500 ring-2 ring-primary-500/20 shadow-xs'
                : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                <CreditCard className="w-4 h-4 text-primary-600" />
                <span>كورس مدفوع</span>
              </div>
              {!isFreeCourse && <Check className="w-3.5 h-3.5 text-primary-600" />}
            </div>
            <span className="text-[11px] text-slate-500">يتطلب سداد اشتراك أو إيصال تحويل</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsFreeCourse(true);
              setPrice('0');
            }}
            className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
              isFreeCourse
                ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                <Gift className="w-4 h-4 text-emerald-600" />
                <span>كورس مجاني 🎁</span>
              </div>
              {isFreeCourse && <Check className="w-3.5 h-3.5 text-emerald-600" />}
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">متاح للجميع مجاناً وبدون رسوم</span>
          </button>
        </div>

        {!isFreeCourse ? (
          <div className="pt-2 animate-in fade-in duration-200">
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              سعر الاشتراك في الكورس (ج.م) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="مثال: 250"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 pl-10 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-xs font-mono font-bold"
                required={!isFreeCourse}
              />
              <span className="text-xs font-bold text-slate-400 absolute left-3 top-2.5">ج.م</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              سيطلب من الطلاب تحويل هذا المبلغ على محفظة فودافون كاش وإرفاق صورة الإيصال.
            </span>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>يمكن للطلاب الاشتراك في هذا الكورس بضغطة زر ومشاهدة الدروس فوراً دون الحاجة لتحويل مالي.</span>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-4 rounded-xl border border-cyan-100 bg-cyan-50/60 p-4">
        <div className="text-right">
          <label htmlFor="course-certificate" className="block text-xs font-bold text-slate-800">
            إصدار شهادة إتمام
          </label>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            اسمح للطلاب بتحميل شهادة عند إكمال جميع دروس الكورس.
          </p>
        </div>
        <button
          id="course-certificate"
          type="button"
          role="switch"
          aria-checked={hasCertificate}
          onClick={() => setHasCertificate((value) => !value)}
          className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${hasCertificate ? 'bg-cyan-600' : 'bg-slate-300'}`}
        >
          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${hasCertificate ? 'translate-x-1' : 'translate-x-6'}`} />
        </button>
      </div>
    </>
  );
}
