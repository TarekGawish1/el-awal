'use client';

import React from 'react';
import { Save, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';

interface SubmissionGradingFooterProps {
  totalAwardedScore: number;
  totalMaxScore: number;
  percentage: number;
  isPassing: boolean;
  isPending: boolean;
  hasAnyError: boolean;
  generalFeedback: string;
  onGeneralFeedbackChange: (value: string) => void;
}

export function SubmissionGradingFooter({
  totalAwardedScore,
  totalMaxScore,
  percentage,
  isPassing,
  isPending,
  hasAnyError,
  generalFeedback,
  onGeneralFeedbackChange,
}: SubmissionGradingFooterProps) {
  return (
    <>
      {/* General Teacher Feedback Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 space-y-3">
        <Label className="block font-bold text-sm text-slate-800 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>ملاحظات وتقييم عام على تسليم الاختبار (اختياري)</span>
        </Label>
        <Textarea
          rows={3}
          value={generalFeedback}
          onChange={(e) => onGeneralFeedbackChange(e.target.value)}
          placeholder="اكتب رسالة أو ملاحظات عامة للطالب تظهر له مع النتيجة..."
          className="text-sm"
        />
      </div>

      {/* Sticky Live Summary Footer Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3.5 shadow-2xl z-40">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          {/* Live Totals Display */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">إجمالي الدرجات:</span>
              <span className="font-mono font-extrabold text-lg text-slate-900">
                {totalAwardedScore} / {totalMaxScore}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">النسبة:</span>
              <span className={`font-mono font-extrabold text-base ${isPassing ? 'text-emerald-600' : 'text-rose-600'}`}>
                {percentage}%
              </span>
              <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                isPassing ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {isPassing ? 'ناجح' : 'راسب'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="submit"
              disabled={isPending || hasAnyError}
              className={`w-full sm:w-auto px-8 font-bold text-sm shadow-sm cursor-pointer ${
                hasAnyError ? 'opacity-60 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              <Save className="w-4 h-4 ml-2" />
              {isPending ? 'جاري حفظ واعتماد الدرجات...' : 'حفظ واعتماد الدرجات'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
