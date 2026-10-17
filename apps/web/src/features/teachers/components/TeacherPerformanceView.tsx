import React from 'react';
import { Gauge, Zap, ShieldCheck, Sparkles } from 'lucide-react';
import { ServerClusterCard } from '@/components/admin/ServerClusterCard';

export function TeacherPerformanceView() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shadow-xs">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">سرعة وأداء المنصة</h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              متابعة كفاءة المنصة والتحكم في مضاعفة السرعة أثناء الامتحانات لضمان تجربة فورية وسلسة للطلاب.
            </p>
          </div>
        </div>
      </div>

      {/* Main Performance Control Card */}
      <ServerClusterCard />

      {/* Helpful Guidance Cards for the Teacher */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-neutral-800">متى أحتاج لتفعيل السرعة القصوى؟</h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            عند إطلاق امتحان شهري أو اختبار شامل ينتظر دخوله مئات الطلاب في نفس التوقيت، أو عند بث فيديو مراجعة نهائية مهمة.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-neutral-800">التسريع التلقائي الذكي</h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            المنصة مزودة بنظام ذكي يراقب إقبال الطلاب، فإذا حدث ضغط مفاجئ ترتفع سرعة السيرفر تلقائياً للحفاظ على الاستقرار.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-neutral-800">العودة التلقائية للوضع الطبيعي</h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            بعد انتهاء المدة التي حددتها (مثلاً ساعتان)، تعود المنصة تلقائياً للوضع القياسي لتوفير الطاقة وموارد النظام بدون تدخل منك.
          </p>
        </div>
      </div>
    </div>
  );
}
