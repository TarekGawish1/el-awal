import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { ArrowRight, Cookie, Shield, Sliders, CheckCircle2, Lock, BarChart2 } from 'lucide-react';
import { CookieConsentSettingsTrigger } from '@/components/analytics/CookieConsentBanner';

export const metadata: Metadata = {
  title: 'سياسة ملفات تعريف الارتباط (Cookies) | منصة الأول التعليمية',
  description: 'سياسة استخدام ملفات تعريف الارتباط وتفضيلات التتبع لمنصة الأول التعليمية.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function CookiesPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800" dir="rtl">
      {/* Header */}
      <header className="bg-slate-900 text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
          <div className="absolute -top-[50%] -right-[10%] w-[50%] h-[150%] rounded-full bg-amber-600/20 blur-[100px]" />
          <div className="absolute top-[20%] -left-[10%] w-[40%] h-[100%] rounded-full bg-blue-600/20 blur-[120px]" />
        </div>
        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center">
          <Link
            href="/"
            className="self-start mb-8 inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg px-2 py-1"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة للرئيسية</span>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Cookie className="w-7 h-7" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">سياسة ملفات تعريف الارتباط (Cookies)</h1>
          </div>
          <p className="text-slate-300 text-sm md:text-base font-medium">
            تاريخ السريان وآخر تحديث: سبتمبر 2026 | التزام كامل بالتوجيه الأوروبي للخصوصية (ePrivacy) ومعايير الشفافية
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-12 border border-slate-100 space-y-12">
          {/* Quick Settings Banner */}
          <div className="bg-gradient-to-r from-amber-50 to-blue-50 border border-amber-200/80 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-1">التحكم في اختيارات الخصوصية:</h2>
              <p className="text-xs md:text-sm text-slate-600">
                يمكنك في أي لحظة تعديل أو إلغاء موافقتك على تتبع التحليلات والملفات الاختيارية.
              </p>
            </div>
            <CookieConsentSettingsTrigger className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs md:text-sm shadow-sm transition-all shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
              <Sliders className="w-4 h-4" />
              <span>إدارة تفضيلات الكوكيز</span>
            </CookieConsentSettingsTrigger>
          </div>

          {/* Section 1: What are cookies */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-black shrink-0">1</span>
              ما هي ملفات تعريف الارتباط وتقنيات التخزين؟
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              ملفات تعريف الارتباط (Cookies) وتقنيات التخزين المحلي (LocalStorage & SessionStorage) هي ملفات نصية صغيرة تحفظ على متصفحك أو جهازك عند زيارة الموقع. تمكننا هذه الملفات من الحفاظ على تسجيل دخولك، وتذكر تفضيلات الحضور والمظهر، وتقديم تجربة تعليمية مستقرة وسريعة.
            </p>
          </section>

          {/* Section 2: Categories */}
          <section className="space-y-6">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black shrink-0">2</span>
              أنواع ملفات تعريف الارتباط التي نستخدمها
            </h2>

            {/* Essential */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">الملفات الضرورية والأساسية (Strictly Necessary)</h3>
                    <span className="text-xs text-emerald-700 font-semibold">مفعلة دائماً (إلزامية لتشغيل المنصة)</span>
                  </div>
                </div>
              </div>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                هذه الملفات لا غنى عنها لعمل المنصة الأساسي ولا يمكن تعطيلها؛ فهي المسؤولة عن تأمين الجلسة، والتحقق من هوية الطالب، وتمرير كود QR للحضور، ومنع هجمات التزييف عبر المواقع (CSRF).
              </p>
              <div className="text-xs text-slate-500 font-mono bg-white p-2.5 rounded-lg border border-slate-200">
                أمثلة: <code>auth-storage</code> (بيانات التوثيق)، <code>elawal_cookie_consent_v1</code> (تفضيلات الكوكيز المسجلة).
              </div>
            </div>

            {/* Analytics */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">ملفات التحليلات والأداء (Analytics & Performance)</h3>
                    <span className="text-xs text-blue-700 font-semibold">اختيارية (تتطلب موافقتك الصريحة)</span>
                  </div>
                </div>
              </div>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                تساعدنا على فهم كيفية تفاعل الزوار مع صفحات الموقع وتشخيص الأخطاء التقنية. نستخدم خدمة <strong>Microsoft Clarity</strong> لتحليل الخرائط الحرارية دون جمع أي نصوص لكلمات المرور أو المعلومات الحساسة.
              </p>
              <div className="text-xs text-slate-500 font-mono bg-white p-2.5 rounded-lg border border-slate-200">
                أمثلة: <code>_clck</code>، <code>_clsk</code> (معرفات جلسة مجهولة المصدر من Microsoft Clarity).
              </div>
            </div>

            {/* Marketing */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">ملفات التسويق والتخصيص (Marketing / Targeting)</h3>
                    <span className="text-xs text-purple-700 font-semibold">معطلة افتراضياً</span>
                  </div>
                </div>
              </div>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                لا نضع أي إعلانات خارجية لطرف ثالث على المنصة. في حال إطلاق حملات توعوية عبر منصات التواصل (فيسبوك)، فإن أي أكواد تتبع لا تُحمّل إلا بعد موافقة الطالب أو ولي الأمر.
              </p>
            </div>
          </section>

          {/* Section 3: Browser Controls */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-black shrink-0">3</span>
              كيفية إدارة الكوكيز من خلال المتصفح
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              بالإضافة إلى إمكانية ضبط التفضيلات من خلال نافذة الخصوصية الخاصة بنا، يمكنك في أي وقت مسح أو حظر ملفات تعريف الارتباط مباشرة من إعدادات متصفحك (Google Chrome, Firefox, Safari, Edge). مع ملاحظة أن حظر الملفات الضرورية قد يؤدي إلى تعطيل خاصية تسجيل الدخول.
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
              <Link href="/refund" className="hover:underline">سياسة الاسترداد والإلغاء</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
