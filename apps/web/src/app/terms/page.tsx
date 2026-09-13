import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { ArrowRight, BookOpen, AlertOctagon, Scale, ShieldAlert, CheckCircle, FileCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'شروط الاستخدام والخدمة | منصة الأول التعليمية',
  description: 'اتفاقية شروط الاستخدام وقواعد الملكية الفكرية وحقوق الاستخدام لمنصة الأول التعليمية.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800" dir="rtl">
      {/* Header */}
      <header className="bg-slate-900 text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
          <div className="absolute -top-[50%] -right-[10%] w-[50%] h-[150%] rounded-full bg-blue-600/20 blur-[100px]" />
          <div className="absolute top-[20%] -left-[10%] w-[40%] h-[100%] rounded-full bg-indigo-600/20 blur-[120px]" />
        </div>
        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center">
          <Link
            href="/"
            className="self-start mb-8 inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg px-2 py-1"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة للرئيسية</span>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Scale className="w-7 h-7" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">شروط الاستخدام والخدمة</h1>
          </div>
          <p className="text-slate-300 text-sm md:text-base font-medium">
            تاريخ السريان وآخر تحديث: سبتمبر 2026 | عقد قانوني ملزم بين المنصة والمستخدم
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-12 border border-slate-100 space-y-12">
          {/* Acceptance Box */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-6 text-blue-950 text-sm md:text-base leading-relaxed">
            <p className="font-bold text-blue-900 mb-2">تنبيه قانوني هام:</p>
            باستخدامك لمنصة الأول التعليمية، أو تسجيل حساب طالب، أو سداد اشتراك لأي كورس أو حصة، فإنك توافق صراحة وتلتزم دون قيد أو شرط بجميع البنود والشروط الواردة في هذه الاتفاقية. إذا كنت لا توافق على هذه الشروط، يُرجى التوقف فوراً عن استخدام المنصة.
          </div>

          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black shrink-0">1</span>
              الأهلية والتسجيل
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              المنصة مخصصة لخدمة الطلاب في المراحل التعليمية الإعدادية والثانوية في جمهورية مصر العربية. في حال كان الطالب دون سن الرشد القانوني (18 عاماً)، فإن إنشاء الحساب يفترض موافقة وإشراف ولي الأمر الشرعي.
            </p>
            <ul className="text-sm md:text-base text-slate-600 space-y-2 list-disc list-inside">
              <li>يلتزم الطالب بتقديم بيانات صحيحة ومطابقة للواقع (الاسم الرباعي، رقم الهاتف، المرحلة التعليمية).</li>
              <li>يحظر تماماً استخدام أرقام هواتف وهمية أو انتحال شخصية طالب آخر.</li>
              <li>يحق للمنصة التحقق من صحة البيانات المسجلة عبر التواصل المباشر مع ولي الأمر.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center text-sm font-black shrink-0">2</span>
              حماية الملكية الفكرية ومكافحة القرصنة
            </h2>
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-3">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm md:text-base">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                تحذير جنائي ومدني مشدد
              </div>
              <p className="text-xs md:text-sm text-rose-950 leading-relaxed">
                جميع المحتويات المنشورة على المنصة من شروحات مرئية (فيديوهات)، ومذكرات وملخصات PDF، وبنوك أسئلة، وامتحانات، هي <strong>ملكية فكرية حصرية للأستاذ أحمد غريب ومنصة الأول</strong>، ومحمية بموجب قانون حماية الملكية الفكرية المصري رقم 82 لسنة 2002 والاتفاقيات الدولية ذات الصلة.
              </p>
            </div>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              يُحظر حظراً باتاً ومطلقاً ارتكاب أي من الأفعال التالية، ويترتب عليها إغلاق الحساب والملاحقة القانونية:
            </p>
            <ul className="text-sm md:text-base text-slate-600 space-y-2 list-disc list-inside">
              <li>تصوير الشاشة (Screen Recording) بأي وسيلة برمجية أو كاميرا خارجية لأي فيديو أو امتحان.</li>
              <li>تنزيل أو استخراج ملفات الفيديو من مشغلات المنصة بأي أدوات قرصنة أو إضافات متصفح.</li>
              <li>إعادة نشر أو بيع أو مشاركة مذكرات المنصة والكتب المطبوعة والإلكترونية على تيليجرام أو فيسبوك أو أي موقع خارجي.</li>
              <li>مشاركة بيانات الحساب (اسم المستخدم وكلمة المرور) مع أي طالب آخر؛ الحساب شخصي وفردي فقط.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-black shrink-0">3</span>
              نظام الحضور والامتحانات
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              تنظم المنصة الحضور والغياب للسنتر والأونلاين وفق الآليات التالية:
            </p>
            <ul className="text-sm md:text-base text-slate-600 space-y-2 list-disc list-inside">
              <li><strong>حضور السنتر:</strong> يتم تسجيل الحضور حصراً عبر مسح كود QR الشخصي المشفر للطالب في قاعة الدرس. لا يجوز مشاركة الكود مع زميل لتسجيل حضور وهمي.</li>
              <li><strong>الامتحانات الدورية:</strong> تحدد المنصة مواعيد زمنية محددة لفتح وغلق الواجبات والامتحانات الإلكترونية، ولا يعتد بأي تسليم يتم بعد انتهاء الوقت المحدد إلا بعذر رسمي مقبول.</li>
              <li><strong>إشعارات ولي الأمر:</strong> يوافق الطالب على إرسال تقارير غيابه ودرجاته الدورية إلى ولي الأمر المسجل في النظام.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-black shrink-0">4</span>
              الرسوم الدراسية والاشتراكات
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              تحدد قيمة اشتراكات الكورسات والحصص والمذكرات بالجنيه المصري (EGP). تسري سياسة الاسترداد وفق الضوابط الموضحة تفصيلاً في صفحة <Link href="/refund" className="text-blue-600 font-bold hover:underline">سياسة الاسترداد والإلغاء</Link>.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-black shrink-0">5</span>
              إنهاء وتجميد الحساب
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              تحتفظ إدارة المنصة بالحق الكامل في إيقاف أو تجميد أو إنهاء حساب أي طالب دون إنذار مسبق وبدون استرداد للمصروفات في الحالات التالية:
            </p>
            <ul className="text-sm md:text-base text-slate-600 space-y-2 list-disc list-inside">
              <li>محاولة اختراق النظام الأمني أو التلاعب بنظام حضور QR أو تزوير الدرجات.</li>
              <li>مخالفة الآداب العامة، أو توجيه إساءة للمدرس، أو الزملاء، أو فريق السكرتارية والدعم الفني.</li>
              <li>مشاركة بيانات الحساب وفتحه بالتزامن من أجهزة جغرافية متعددة متباعدة.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center text-sm font-black shrink-0">6</span>
              حدود المسؤولية وإخلاء الطرف
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              تبذل المنصة أقصى جهودها التقنية لضمان عمل الموقع على مدار الساعة واستقرار مشغلات الفيديو. ومع ذلك، لا تتحمل المنصة المسؤولية عن انقطاعات الخدمة الناتجة عن مشاكل شبكات الاتصال المحلية لدى الطالب، أو حجب بعض مزودي الإنترنت، أو القوة القاهرة والأعطال السحابية الطارئة.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-black shrink-0">7</span>
              القانون الواجب التطبيق والاختصاص القضائي
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              تخضع هذه الشروط وتفسر وفقاً للقوانين واللوائح المعمول بها في جمهورية مصر العربية. وفي حال نشوء أي نزاع قانوني يتعلق بهذه الاتفاقية أو استخدام المنصة، ينعقد الاختصاص القضائي الحصري للمحاكم المصرية المختصة بمحافظة دمياط / المحكمة الاقتصادية.
            </p>
          </section>

          {/* Navigation Links */}
          <div className="pt-8 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs md:text-sm">
            <div className="text-slate-500">
              وثائق ذات صلة:
            </div>
            <div className="flex items-center gap-4 font-semibold text-blue-600">
              <Link href="/privacy" className="hover:underline">سياسة الخصوصية</Link>
              <Link href="/refund" className="hover:underline">سياسة الاسترداد والإلغاء</Link>
              <Link href="/cookies" className="hover:underline">سياسة ملفات تعريف الارتباط</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
