'use client';

import { useState, useEffect } from 'react';
import { Settings, Calendar, ShieldCheck, CheckCircle2, Clock, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';
import { useBillingConfiguration, useUpdateBillingConfiguration } from '../hooks/useFinance';
import {
  DEFAULT_ACADEMIC_TERM,
  DEFAULT_ACADEMIC_YEAR,
  STORAGE_TERM_KEY,
  STORAGE_YEAR_KEY,
  getCurrentAcademicTerm,
  getCurrentAcademicYear,
} from '@/features/groups/hooks/useAcademicPeriod';

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const TERM_MONTHS: Record<'FIRST_TERM' | 'SECOND_TERM', number[]> = {
  FIRST_TERM: [8, 9, 10, 11, 12, 1],
  SECOND_TERM: [2, 3, 4, 5, 6],
};

function readStoredValue(key: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(value) && value[0] ? value[0] : fallback;
  } catch {
    return fallback;
  }
}

export function FinanceSettingsTab() {
  const defaultYear = getCurrentAcademicYear();
  const defaultTerm = getCurrentAcademicTerm();
  const [academicYear, setAcademicYear] = useState(() => readStoredValue(STORAGE_YEAR_KEY, defaultYear));
  const [academicTerm, setAcademicTerm] = useState<'FIRST_TERM' | 'SECOND_TERM'>(() => readStoredValue(STORAGE_TERM_KEY, defaultTerm) as 'FIRST_TERM' | 'SECOND_TERM');

  const { data: billingConfig, isLoading, refetch } = useBillingConfiguration(academicYear, academicTerm);
  const { mutate: updateBillingConfig, isPending: isSaving } = useUpdateBillingConfiguration();

  const [paymentTiming, setPaymentTiming] = useState<'PREPAID' | 'POSTPAID'>('PREPAID');
  const [excludedMonths, setExcludedMonths] = useState<number[]>([]);

  useEffect(() => {
    if (billingConfig) {
      setExcludedMonths(billingConfig.excludedMonths || []);
      setPaymentTiming(billingConfig.paymentTiming || 'PREPAID');
    }
  }, [billingConfig]);

  const handleTimingChange = (newTiming: 'PREPAID' | 'POSTPAID') => {
    setPaymentTiming(newTiming);
    updateBillingConfig(
      {
        academicYear,
        academicTerm,
        excludedMonths,
        paymentTiming: newTiming,
      },
      {
        onSuccess: () => {
          toast.success(`تم تفعيل نظام ${newTiming === 'PREPAID' ? 'الدفع المقدم (مع بداية الشهر)' : 'الدفع المؤجل (في نهاية الشهر)'} بنجاح ✅`);
        },
        onError: () => {
          toast.error('تعذر حفظ التغييرات، يرجى المحاولة مرة أخرى.');
        },
      }
    );
  };

  const handleMonthToggle = (month: number) => {
    const next = excludedMonths.includes(month)
      ? excludedMonths.filter((m) => m !== month)
      : [...excludedMonths, month];
    setExcludedMonths(next);
    updateBillingConfig(
      {
        academicYear,
        academicTerm,
        excludedMonths: next,
        paymentTiming,
      },
      {
        onSuccess: () => {
          toast.success('تم تحديث الشهور المحتسبة بنجاح');
        },
      }
    );
  };

  const activeTermMonths = TERM_MONTHS[academicTerm] || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <Card className="border-none bg-gradient-to-l from-slate-900 via-primary-950 to-primary-900 text-white shadow-xl">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-5 h-5 text-primary-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-primary-300">Finance & Billing Settings</p>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">إعدادات وقواعد المحاسبة المالية</h2>
            <p className="mt-1 text-sm text-slate-300 max-w-2xl">
              تخصيص نظام استحقاق المصروفات، مواعيد إرسال إنذارات التأخير، وتحديد الشهور المحتسبة للفترة الدراسية الحالية ({academicYear} - {academicTerm === 'FIRST_TERM' ? 'ترم أول' : 'ترم ثاني'}).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="bg-white/10 hover:bg-white/20 border-white/20 text-white shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ml-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث الإعدادات
          </Button>
        </CardContent>
      </Card>

      {/* 1. Payment Timing Mode Selector */}
      <Card className="border border-slate-200/80 shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary-100 text-primary-700">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-black text-slate-800">
                  نظام توقيت استحقاق المصروفات وإنذارات التأخير
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  حدد متى يُعتبر اشتراك الشهر مستحقاً ومتى تبدأ المنظومة في إرسال تنبيهات السداد وقوائم المتأخرين
                </CardDescription>
              </div>
            </div>
            <Badge variant={paymentTiming === 'PREPAID' ? 'default' : 'success'} className="hidden sm:inline-flex">
              {paymentTiming === 'PREPAID' ? 'مفعل: دفع مقدم' : 'مفعل: دفع مؤجل'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option A: PREPAID */}
            <div
              onClick={() => handleTimingChange('PREPAID')}
              className={`relative flex flex-col justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                paymentTiming === 'PREPAID'
                  ? 'border-primary-600 bg-primary-50/50 shadow-md shadow-primary-500/10'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentTiming === 'PREPAID' ? 'border-primary-600 bg-primary-600' : 'border-slate-300'
                    }`}>
                      {paymentTiming === 'PREPAID' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </span>
                    <h3 className="font-extrabold text-base text-slate-900">دفع مقدم للشهر (Prepaid)</h3>
                  </div>
                  <Badge variant="default" size="sm">بداية الشهر</Badge>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  يُعتبر اشتراك كل شهر <strong>مستحقاً فور حلول أول يوم في الشهر الجديد</strong>. وتظهر تنبيهات السداد وقوائم المتأخرين للطلاب الذين لم يسددوا مع بداية الشهر.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-2 text-[11px] font-bold text-primary-700">
                <CheckCircle2 className="w-4 h-4" />
                المطالبة تبدأ فوراً مع بداية كل شهر جديد
              </div>
            </div>

            {/* Option B: POSTPAID */}
            <div
              onClick={() => handleTimingChange('POSTPAID')}
              className={`relative flex flex-col justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                paymentTiming === 'POSTPAID'
                  ? 'border-primary-600 bg-primary-50/50 shadow-md shadow-primary-500/10'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentTiming === 'POSTPAID' ? 'border-primary-600 bg-primary-600' : 'border-slate-300'
                    }`}>
                      {paymentTiming === 'POSTPAID' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </span>
                    <h3 className="font-extrabold text-base text-slate-900">دفع في آخر الشهر (Postpaid)</h3>
                  </div>
                  <Badge variant="neutral" size="sm">نهاية الشهر</Badge>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>لا يُعتبر الطالب متأخراً خلال أيام الشهر الجاري</strong>. تبدأ مطالبة الطالب وتنبيهات التأخير والإشعارات <strong>فقط بعد انتهاء الشهر بالكامل</strong>.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-2 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                المطالبة والتنبيهات تبدأ بعد انقضاء الشهر فقط
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Included / Excluded Billing Months */}
      <Card className="border border-slate-200/80 shadow-xs">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-slate-800">
                الشهور المحتسبة في الترم الدراسي الحالي
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                قم بتحديد الشهور الفعلية للتدريس والتحصيل، الشهور غير المحددة يتم استبعادها تلقائياً من المطالبات
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            {activeTermMonths.map((month) => {
              const isExcluded = excludedMonths.includes(month);
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => handleMonthToggle(month)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all ${
                    !isExcluded
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!isExcluded}
                    readOnly
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 pointer-events-none"
                  />
                  <span>شهر {month} ({ARABIC_MONTHS[month - 1]})</span>
                  {!isExcluded && <span className="text-[10px] bg-emerald-200/60 px-1.5 py-0.5 rounded text-emerald-900 font-extrabold">محتسب</span>}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 3. Automatic Enrollment Policy Rules Info */}
      <Card className="border border-blue-100 bg-blue-50/40 shadow-xs">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-blue-900">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-sm sm:text-base">قواعد تسجيل وتاريخ التحاق الطلاب التلقائية</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-white/80 border border-blue-100">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900 mb-0.5">عدم المطالبة بالشهور السابقة للتسجيل</p>
                <p className="text-slate-600">إذا التحق الطالب في شهر 9، فلن يُطالب أبداً بسداد شهر 8 أو أي شهر سابق لتاريخ تسجيله بالمجموعة.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-white/80 border border-blue-100">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900 mb-0.5">احتساب نصف شهر للطالب الملتحق بعد منتصف الشهر</p>
                <p className="text-slate-600">إذا انضم الطالب في النصف الثاني من الشهر (بعد يوم 15)، يُطالب تلقائياً بنصف قيمة الاشتراك الشهري فقط (50%).</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
