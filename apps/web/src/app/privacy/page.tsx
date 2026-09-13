import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { ArrowRight, ShieldCheck, Lock, Eye, FileText, Database, UserCheck, Bell, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية | منصة الأول التعليمية',
  description: 'سياسة الخصوصية وحماية البيانات الشخصية لمنصة الأول التعليمية وفقاً للأنظمة والتشريعات المعمول بها.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800" dir="rtl">
      {/* Header */}
      <header className="bg-slate-900 text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
          <div className="absolute -top-[50%] -right-[10%] w-[50%] h-[150%] rounded-full bg-teal-600/20 blur-[100px]" />
          <div className="absolute top-[20%] -left-[10%] w-[40%] h-[100%] rounded-full bg-emerald-600/20 blur-[120px]" />
        </div>
        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center">
          <Link
            href="/"
            className="self-start mb-8 inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-lg px-2 py-1"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة للرئيسية</span>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">سياسة الخصوصية وحماية البيانات</h1>
          </div>
          <p className="text-slate-300 text-sm md:text-base font-medium">
            تاريخ السريان وآخر تحديث: سبتمبر 2026 | متوافقة مع قانون حماية البيانات الشخصية رقم 151 لسنة 2020 والمعايير الدولية (GDPR)
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-12 border border-slate-100 space-y-12">
          {/* Executive Summary */}
          <div className="bg-teal-50/60 border border-teal-100 rounded-2xl p-6 text-teal-900 text-sm md:text-base leading-relaxed">
            <p className="font-bold text-teal-950 mb-2">إشعار عام للمستخدم:</p>
            تلتزم <strong>منصة الأول التعليمية (المؤسسة التعليمية للأستاذ أحمد غريب)</strong> بحماية خصوصية الطلاب وأولياء الأمور وزوار الموقع. توضح هذه الوثيقة بوضوح وشفافية أنواع البيانات التي نجمعها، الأساس القانوني لمعالجتها، كيفية حمايتها وتخزينها، وحقوقك الكاملة في التحكم ببياناتك أو طلب حذفها.
          </div>

          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-black shrink-0">1</span>
              مسؤول معالجة البيانات (Data Controller)
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              الجهة المسؤولة عن معالجة وإدارة بياناتك الشخصية هي <strong>منصة الأول التعليمية</strong>، المسجلة بالجمهورية المصرية، ومقرها الرئيسي: سنتر العدلية التعليمي وسنتر البستان، محافظة دمياط.
            </p>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              للتواصل مع مسؤول حماية البيانات (DPO) أو لأي استفسار متعلق بالخصوصية:
              <br />
              البريد الإلكتروني المخصص: <a href="mailto:privacy@al-awal.online" className="text-blue-600 hover:underline font-bold" dir="ltr">privacy@al-awal.online</a>
              <br />
              الهاتف / واتساب الدعم الفني: <span dir="ltr" className="font-bold text-slate-900">012 2130 1224 / 010 2190 2000</span>
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black shrink-0">2</span>
              البيانات الشخصية التي نجمعها
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              نحن نتبع مبدأ <strong>الحد الأدنى من البيانات (Data Minimization)</strong>، فلا نطلب ولا نجمع إلا ما هو ضروري وحصري لتقديم الخدمة التعليمية بكفاءة وأمان:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  بيانات الهوية والتسجيل
                </h3>
                <ul className="text-xs md:text-sm text-slate-600 list-disc list-inside space-y-1">
                  <li>الاسم الرباعي للطالب.</li>
                  <li>رقم هاتف الطالب ورقم هاتف ولي الأمر (لإشعارات الحضور والدرجات).</li>
                  <li>المرحلة الدراسية والصف الدراسي المعتمد.</li>
                  <li>نظام الحضور المختار (حضور سنتر أو منصة إلكترونية).</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  البيانات الأكاديمية ونشاط الاستخدام
                </h3>
                <ul className="text-xs md:text-sm text-slate-600 list-disc list-inside space-y-1">
                  <li>سجلات حضور الحصص الموثقة عبر مسح كود QR الآمن.</li>
                  <li>درجات الواجبات، الاختبارات الدورية، والتقييمات الشهرية.</li>
                  <li>نسبة تقدم مشاهدة الفيديوهات التعليمية وحل التدريبات الأونلاين.</li>
                  <li>سجل المعاملات والاشتراكات الدراسية (دون تخزين أي بيانات بنكية حساسة).</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-black shrink-0">3</span>
              السند القانوني لمعالجة البيانات (Legal Basis)
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              تتم معالجة البيانات استناداً إلى أحد الأسس القانونية الآتية:
            </p>
            <ul className="text-sm md:text-base text-slate-600 space-y-2 list-disc list-inside">
              <li><strong>تنفيذ العقد التعليمي (Contractual Necessity):</strong> لإنشاء الحساب، وإتاحة الدروس والمحاضرات، واستخراج بطاقات الحضور والشهادات.</li>
              <li><strong>الموافقة الصريحة (Explicit Consent):</strong> لتلقي إشعارات المتابعة عبر الرسائل، وتفعيل ملفات تعريف الارتباط التحليلية (Analytics Cookies).</li>
              <li><strong>المصلحة المشروعة والالتزام القانوني:</strong> لمكافحة تسريب المحتوى وحماية الملكية الفكرية، وتأمين البنية التقنية ضد الهجمات السيبرانية.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-sm font-black shrink-0">4</span>
              مقدمو الخدمات والأطراف الخارجية (Subprocessors)
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              <strong>نؤكد بشكل قاطع أننا لا نبيع أو نؤجر أو نتاجر ببيانات المستخدمين مع أي معلن أو طرف ثالث.</strong> نتعامل فقط مع مزودي بنية تحتية سحابية معتمدين يلتزمون بأعلى معايير الأمن السيبراني:
            </p>
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-slate-200 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0" />
                <div className="text-xs md:text-sm text-slate-700">
                  <strong>خوادم الاستضافة وقواعد البيانات (Hetzner VPS & Neon PostgreSQL):</strong> استضافة سحابية أوروبية مؤمنة باتفاقيات حماية بيانات صارمة وتشفير البيانات أثناء النقل والراحة.
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-600 mt-2 shrink-0" />
                <div className="text-xs md:text-sm text-slate-700">
                  <strong>تخزين وبث الوسائط (Cloudflare R2 & Bunny Stream):</strong> لتسليم ملفات PDF وتدفق الفيديو المشفر بروابط مؤقتة ومحمية من التنزيل غير القانوني.
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-600 mt-2 shrink-0" />
                <div className="text-xs md:text-sm text-slate-700">
                  <strong>تحليلات سلوك المستخدم (Microsoft Clarity):</strong> أداة اختيارية لقياس تجربة التصفح وحل المشاكل التقنية. <em>لا يتم تحميلها إلا بعد موافقة صريحة عبر نافذة ملفات تعريف الارتباط.</em>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-black shrink-0">5</span>
              حقوق المستخدم بموجب القانون (User Rights)
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              يحق للطالب أو ولي أمره القانوني ممارسة الحقوق التالية في أي وقت بموجب قانون حماية البيانات:
            </p>
            <ul className="text-sm md:text-base text-slate-600 space-y-2 list-disc list-inside">
              <li><strong>حق الاطلاع والوصول (Right of Access):</strong> الحصول على نسخة كاملة من البيانات الشخصية المحفوظة في ملفك.</li>
              <li><strong>حق التصحيح والتحديث (Right to Rectification):</strong> تعديل أو تصحيح أي بيانات غير دقيقة أو أرقام هواتف تغيرت.</li>
              <li><strong>حق الحذف ومحو البيانات (Right to Erasure / Right to be Forgotten):</strong> طلب مسح حسابك وبياناتك عند انتهاء العام الدراسي أو التوقف عن الدراسة.</li>
              <li><strong>حق سحب الموافقة (Withdrawal of Consent):</strong> تعديل أو إلغاء موافقتك على ملفات تعريف الارتباط أو الإشعارات في أي وقت.</li>
            </ul>
            <p className="text-xs md:text-sm text-slate-500 pt-1">
              * لممارسة أي من هذه الحقوق، يرجى إرسال بريد إلكتروني رسمي إلى <a href="mailto:privacy@al-awal.online" className="text-teal-600 font-bold hover:underline">privacy@al-awal.online</a> مع توضيح اسم الطالب وكوده التعريفي.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center text-sm font-black shrink-0">6</span>
              حماية القُصّر (Minor Protection)
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              نظراً لأن خدمات المنصة موجهة لطلاب المراحل الإعدادية والثانوية (الفئات العمرية تحت سن 18 عاماً)، فإن تسجيل الطالب واشتراكه في المجموعات يتطلب علم وموافقة ولي الأمر أو الوصي القانوني. وتوفر المنصة بوابة خاصة بولي الأمر للمتابعة والاطلاع على مسيرة الطالب التعليمية.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center text-sm font-black shrink-0">7</span>
              الاحتفاظ بالبيانات والأمان
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm md:text-base">
              نحتفظ ببيانات الطالب خلال فترة قيده بالسنتر أو المنصة، بالإضافة إلى فترة تكميلية تمتد لـ 12 شهراً لحفظ السجلات الأكاديمية واستخراج كشوف الدرجات عند الطلب، قبل أن يتم إتلافها أو إخفاء هويتها (Anonymization) بشكل آمن. يتم تشفير جميع كلمات المرور وفق معايير التجزئة الأمنية (Argon2 / bcrypt) ولا يمكن لأي موظف أو مدرس الاطلاع على كلمة المرور النصية الخاصة بك.
            </p>
          </section>

          {/* Quick links to other policies */}
          <div className="pt-8 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs md:text-sm">
            <div className="text-slate-500">
              وثائق ذات صلة:
            </div>
            <div className="flex items-center gap-4 font-semibold text-blue-600">
              <Link href="/terms" className="hover:underline">شروط الاستخدام</Link>
              <Link href="/refund" className="hover:underline">سياسة الاسترداد والإلغاء</Link>
              <Link href="/cookies" className="hover:underline">سياسة ملفات تعريف الارتباط</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
