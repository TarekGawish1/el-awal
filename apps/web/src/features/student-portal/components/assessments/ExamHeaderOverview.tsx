'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Clock,
  Award,
  ChevronLeft,
  AlertCircle,
  AlertTriangle,
  RefreshCcw,
} from 'lucide-react';
import { formatArabicDate, formatArabicTime } from '@/lib/utils/formatters';

export interface ExamHeaderOverviewProps {
  assessment: any;
  mySubmission: any;
  retakeMode: boolean;
  timeLeft: number | null;
  formatTimer: (seconds: number) => string;
  isPastDue: boolean;
  isExam: boolean;
  canRetake: boolean;
  returnUrl?: string | null;
  onBack: () => void;
  onStartRetake: () => void;
}

export function ExamHeaderOverview({
  assessment,
  mySubmission,
  retakeMode,
  timeLeft,
  formatTimer,
  isPastDue,
  isExam,
  canRetake,
  returnUrl,
  onBack,
  onStartRetake,
}: ExamHeaderOverviewProps) {
  return (
    <>
      {/* Late joiner alert banner for FIXED_SESSION */}
      {assessment.isLate && assessment.timingType === 'FIXED_SESSION' && !mySubmission && (
        <div className="bg-amber-500/10 border-2 border-amber-400 text-amber-900 p-4 rounded-2xl flex items-center gap-3 shadow-xs animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 animate-bounce" />
          <div className="text-xs sm:text-sm font-bold leading-relaxed">
            <span>تنبيه: دخلت متأخراً، سينتهي الاختبار للجميع عند </span>
            <span className="underline decoration-amber-500 decoration-2 font-mono">
              {assessment.endTime
                ? `${formatArabicDate(assessment.endTime)} - ${formatArabicTime(
                    assessment.endTime
                  )}`
                : 'الموعد المحدد'}
            </span>
            <span> (تم احتساب الوقت المتبقي لك تلقائياً).</span>
          </div>
        </div>
      )}

      {/* Top action bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
        <button
          onClick={onBack}
          className="flex items-center text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 ml-1" />
          {returnUrl
            ? 'العودة لقاعة الدرس في الكورس'
            : !isExam
            ? 'الرجوع لقائمة الواجبات'
            : 'الرجوع لقائمة الاختبارات'}
        </button>

        {timeLeft !== null && !mySubmission && !isPastDue && (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold font-mono transition-all shadow-sm ${
              timeLeft <= 120
                ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-200'
                : timeLeft <= 300
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            <Clock
              className={`w-4 h-4 ${
                timeLeft <= 120 ? 'animate-spin' : 'animate-pulse'
              }`}
            />
            <span>الوقت المتبقي: {formatTimer(timeLeft)}</span>
          </div>
        )}
      </div>

      {/* Overview Card */}
      <Card className="border-none shadow-sm shadow-slate-200/50 bg-gradient-to-br from-white to-slate-50/20 relative overflow-hidden">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant={isExam ? 'error' : 'default'}
                className={
                  isExam
                    ? 'bg-error-50 text-error-800 border-none'
                    : 'bg-primary-50 text-primary-700 border-none'
                }
              >
                {isExam ? 'اختبار دراسي' : 'واجب منزلي'}
              </Badge>
              <Badge variant="outline" className="border-slate-200 bg-white/70">
                درجة النجاح: {assessment.passingScore || 'غير محدد'} /{' '}
                {assessment.totalScore}
              </Badge>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">
              {assessment.title}
            </h2>
            <p className="text-sm text-slate-500 max-w-xl">
              {assessment.description || 'لا يوجد وصف مضاف لهذا الاختبار.'}
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
            {mySubmission && !retakeMode ? (
              mySubmission.status === 'GRADED' ? (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-4">
                  <div className="p-2.5 bg-emerald-500 text-white rounded-xl">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-emerald-600 block">
                      درجتك المحصلة
                    </span>
                    <span className="text-2xl font-extrabold text-slate-800 font-mono leading-none mt-1 inline-block">
                      {mySubmission.scoreObtained}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {' '}
                      / {assessment.totalScore} درجة
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
                  <div>
                    <span className="text-sm font-bold text-blue-700 block">
                      تم تسليم الإجابات
                    </span>
                    <span className="text-xs text-slate-500 mt-1 block">
                      قيد المراجعة والتصحيح من قبل المعلم.
                    </span>
                  </div>
                </div>
              )
            ) : isPastDue ? (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <div>
                  <span className="text-sm font-bold text-rose-700 block">
                    فات موعد التسليم
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5 block">
                    لم تعد قادراً على تسليم هذا الاختبار.
                  </span>
                </div>
              </div>
            ) : null}

            {canRetake && (
              <Button
                variant="outline"
                size="sm"
                onClick={onStartRetake}
                className="rounded-xl border-dashed border-primary-300 text-primary-700 hover:bg-primary-50 font-bold gap-2 cursor-pointer"
              >
                <RefreshCcw className="w-4 h-4" />
                إعادة المحاولة (تُعتمد أعلى درجة)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
