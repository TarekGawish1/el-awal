import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { ArrowRight, RefreshCcw, HelpCircle, Clock, FileCheck2, CheckCircle2, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'سياسة الاسترداد والإلغاء | منصة الأول التعليمية',
  description: 'سياسة وضوابط استرداد الرسوم الدراسية وإلغاء الاشتراكات للكورسات وحصص السنتر في منصة الأول التعليمية.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800" dir="rtl">
      {/* Header */}
      <header className="bg-slate-900 text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
          <div className="absolute -top-[50%] -right-[10%] w-[50%] h-[150%] rounded-full bg-emerald-600/20 blur-[100px]" />
          <div className="absolute top-[20%] -left-[10%] w-[40%] h-[100%] rounded-full bg-teal-600/20 blur-[120px]" />
        </div>
        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center">
          <Link
            href="/"
            className="self-start mb-8 inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-lg px-2 py-1"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة للرئيسية</span>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <RefreshCcw className="w-7 h-7" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">سياسة الاسترداد والإلغاء</h1>
          </div>
          <p className="text-slate-300 text-sm md:text-base font-medium">
            تاريخ السريان وآخر تحديث: سبتمبر 2026 | وفقاً لقانون حماية المستهلك المصري رقم 181 لسنة 2018
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-12 border border-slate-100 space-y-12">
          {/* Summary Box */}
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-6 text-emerald-950 text-sm md:text-base leading-relaxed">
            <p className="font-bold text-emerald-900 mb-2">مبدأ العدالة والشفافية:</p>
            تهدف منصة الأول التعليمية إلى تقديم أعلى مستويات الجودة الأكاديمية لطلابنا. ندرك أن بعض الظروف الطارئة قد تتطلب تعديل الاشتراك أو استرداد الرسوم؛ لذا وضعنا هذه السياسة الواضحة التي تضمن حقوق الطالب والمنصة بنزاهة وشفافية تامة.
          </div>

          {/* Section 1: Online Courses */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black shrink-0">1</span>
              اشتراكات الكورسات الرقمية (أونلاين)
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              نظراً لطبيعة المحتوى الرقمي التعليمي وسهولة استهلاكه فورياً، يخضع استرداد الكورسات الإلكترونية للشروط التالية:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  حالات قبول الاسترداد
                </div>
                <ul className="text-xs md:text-sm text-slate-700 space-y-1.5 list-disc list-inside">
                  <li>تقديم طلب الاسترداد خلال <strong>14 يوماً</strong> من تاريخ سداد الاشتراك.</li>
                  <li>عدم مشاهدة أكثر من <strong>درس واحد فقط (أو أقل من 20% من إجمالي محتوى الكورس)</strong>.</li>
                  <li>عدم تحميل أي مذكرات PDF أو أداء الامتحانات المرفقة بالكورس.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  حالات عدم قبول الاسترداد
                </div>
                <ul className="text-xs md:text-sm text-slate-700 space-y-1.5 list-disc list-inside">
                  <li>مرور أكثر من 14 يوماً على شراء وتفعيل الكورس.</li>
                  <li>تجاوز نسبة 20% من محتوى الكورس أو إكمال أكثر من محاضرة تعليمية.</li>
                  <li>تنزيل المذكرات الدراسية المخصصة للمشتركين.</li>
                  <li>الحسابات التي تم إيقافها بسبب انتهاك حقوق الملكية الفكرية أو تصوير الشاشة.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2: Physical Classroom */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-black shrink-0">2</span>
              اشتراكات الحضور بالسنتر (المجموعات الحضورية)
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              تُسدد اشتراكات السنتر شهرياً أو بنظام الحصة وفق الآتي:
            </p>
            <ul className="text-sm md:text-base text-slate-600 space-y-2 list-disc list-inside">
              <li><strong>الإلغاء قبل بدء الشهر الدراسي:</strong> يحق للطالب استرداد كامل قيمة الاشتراك الشهري دون أي استقطاعات في حال الإبلاغ قبل انعقاد أول حصة من الدورة الشهرية.</li>
              <li><strong>الإلغاء خلال الشهر الدراسي:</strong> في حال حضور حصة أو حصتين ورغبة الطالب في التوقف لأسباب قهرية، يتم احتساب الحصص المنعقدة بالسعر الفردي للحصة، واسترداد باقي المبلغ المتبقي، مع إخطار إدارة السكرتارية.</li>
              <li><strong>التحويل بين المجموعات:</strong> تتيح المنصة إمكانية نقل الاشتراك ومواعيد الحضور بين مجموعات السنتر (سنتر العدلية وسنتر البستان) دون أي مصاريف إضافية بحسب توفر المقاعد.</li>
            </ul>
          </section>

          {/* Section 3: Booklets */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-black shrink-0">3</span>
              المذكرات والكتب الدراسية المطبوعة
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              نظراً لطبيعة المطبوعات التعليمية، فإن المذكرات والكتب الدراسية المستلمة في السنتر <strong>غير قابلة للاسترداد</strong> بمجرد استلامها وفض غلافها، ما لم يكن هناك عيب طباعة واضح (مثل صفحات ناقصة أو طباعة غير واضحة)، وفي هذه الحالة يتم استبدال النسخة فوراً مجاناً.
            </p>
          </section>

          {/* Section 4: Refund Process & Timeline */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-black shrink-0">4</span>
              آلية تقديم الطلب والمدة الزمنية للتحويل
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              لتقديم طلب استرداد مالي رسمي، يرجى اتباع الخطوات الآتية:
            </p>
            <ol className="text-sm md:text-base text-slate-600 space-y-2 list-decimal list-inside">
              <li>التواصل مع السكرتارية أو إدارة السنتر عبر واتساب الرسمي: <span dir="ltr" className="font-bold text-slate-900">010 2190 2000</span> أو الهاتف: <span dir="ltr" className="font-bold text-slate-900">012 2130 1224</span>.</li>
              <li>إرسال كود الطالب، ورقم الهاتف المسجل، وإيصال السداد أو لقطة شاشة لعملية التحويل، وتوضيح سبب الاسترداد.</li>
              <li>تقوم إدارة الحسابات بمراجعة سجل المشاهدات والنشاط الأكاديمي خلال 48 ساعة عمل للتأكد من استيفاء الشروط.</li>
              <li>يتم تحويل المبلغ المستحق بنفس وسيلة الدفع الأصلية (فودافون كاش / إنستاباي InstaPay / تحويل بنكي) في غضون <strong>5 إلى 14 يوم عمل</strong>.</li>
            </ol>
          </section>

          {/* Section 5: Statutory Rights */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-black shrink-0">5</span>
              حقوق المستهلك القانونية
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              لا تؤثر هذه السياسة بأي شكل من الأشكال على حقوقك القانونية المكفولة بموجب قانون حماية المستهلك المصري رقم 181 لسنة 2018 ولائحته التنفيذية المنظمة للمعاملات التجارية والخدمات الرقمية.
            </p>
          </section>

          {/* Navigation Links */}
          <div className="pt-8 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs md:text-sm">
            <div className="text-slate-500">
              وثائق ذات صلة:
            </div>
            <div className="flex items-center gap-4 font-semibold text-blue-600">
              <Link href="/terms" className="hover:underline">شروط الاستخدام</Link>
              <Link href="/privacy" className="hover:underline">سياسة الخصوصية</Link>
              <Link href="/cookies" className="hover:underline">سياسة ملفات تعريف الارتباط</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
