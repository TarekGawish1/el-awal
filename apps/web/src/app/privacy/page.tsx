import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-slate-900 text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[50%] -right-[10%] w-[50%] h-[150%] rounded-full bg-teal-600/20 blur-[100px]" />
          <div className="absolute top-[20%] -left-[10%] w-[40%] h-[100%] rounded-full bg-emerald-600/20 blur-[120px]" />
        </div>
        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center">
          <Link href="/" className="self-start mb-8 flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-bold">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rtl:rotate-180" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            العودة للرئيسية
          </Link>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">سياسة الخصوصية</h1>
          <p className="text-slate-300 text-lg font-medium">آخر تحديث: أغسطس 2026</p>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-12 border border-slate-100">
          <div className="space-y-12 text-slate-700 leading-relaxed text-lg font-medium">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center text-sm font-black">1</span>
                مقدمة
              </h2>
              <p>
                نحن في منصة الأول نقدر خصوصيتك ونلتزم بحماية بياناتك الشخصية. توضح سياسة الخصوصية هذه كيفية جمعنا للمعلومات، استخدامها، وحمايتها عند استخدامك لمنصتنا لضمان تجربة تعليمية آمنة.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-black">2</span>
                المعلومات التي نجمعها
              </h2>
              <p className="mb-4">
                قد نقوم بجمع المعلومات التالية عندما تقوم بالتسجيل في المنصة أو عند استخدامك لخدماتنا:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-600">
                <li>الاسم بالكامل ورقم الهاتف (لك ولولي الأمر).</li>
                <li>المرحلة الدراسية والبيانات الأكاديمية الضرورية لتخصيص الكورسات لك.</li>
                <li>بيانات الاستخدام ومعلومات الجهاز (مثل نوع المتصفح وعنوان IP) لغرض تحسين أداء المنصة وتأمين الحسابات.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-black">3</span>
                كيف نستخدم معلوماتك؟
              </h2>
              <p className="mb-4">نستخدم المعلومات التي نجمعها للأغراض التالية:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-600">
                <li>إنشاء وإدارة حسابك التعليمي على المنصة.</li>
                <li>توفير الكورسات والمحتوى المرئي المناسب لمرحلتك الدراسية.</li>
                <li>التواصل معك بخصوص أي تحديثات أو إشعارات مهمة تخص الدروس أو الامتحانات.</li>
                <li>تحسين جودة المنصة وحل أي مشاكل تقنية قد تواجهك.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-black">4</span>
                حماية البيانات
              </h2>
              <p>
                نحن نتخذ إجراءات أمنية صارمة لحماية بياناتك الشخصية من الوصول غير المصرح به أو التعديل أو الإفشاء أو الإتلاف. نؤكد لك أننا لا نقوم ببيع أو تأجير معلوماتك الشخصية لأي أطراف خارجية تحت أي ظرف من الظروف.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
