import React from 'react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-slate-900 text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[50%] -right-[10%] w-[50%] h-[150%] rounded-full bg-blue-600/20 blur-[100px]" />
          <div className="absolute top-[20%] -left-[10%] w-[40%] h-[100%] rounded-full bg-indigo-600/20 blur-[120px]" />
        </div>
        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center">
          <Link href="/" className="self-start mb-8 flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-bold">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rtl:rotate-180" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            العودة للرئيسية
          </Link>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">شروط الاستخدام</h1>
          <p className="text-slate-300 text-lg font-medium">آخر تحديث: أغسطس 2026</p>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-12 border border-slate-100">
          <div className="space-y-12 text-slate-700 leading-relaxed text-lg font-medium">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-black">1</span>
                قبول الشروط
              </h2>
              <p>
                مرحباً بك في منصة الأول التعليمية. باستخدامك للمنصة، فإنك توافق صراحة على الالتزام بجميع شروط الاستخدام المذكورة هنا. إذا كنت لا توافق على هذه الشروط، يُرجى عدم استخدام المنصة والتوقف عن تصفحها.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-black">2</span>
                حساب المستخدم
              </h2>
              <p className="mb-4">
                أنت مسؤول بالكامل عن الحفاظ على سرية بيانات حسابك (مثل اسم المستخدم وكلمة المرور).
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-600">
                <li>يُمنع منعاً باتاً مشاركة حسابك مع أي شخص آخر أو أصدقائك.</li>
                <li>حسابك مخصص للاستخدام الفردي فقط لتلقي المحتوى التعليمي الخاص بك.</li>
                <li>يجب تقديم معلومات دقيقة وصحيحة (مثل الاسم ورقم الهاتف) عند التسجيل.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-black">3</span>
                حقوق الملكية الفكرية
              </h2>
              <p>
                جميع المحتويات المتوفرة على المنصة من فيديوهات تعليمية، مذكرات، أسئلة، وتصميمات، هي ملكية فكرية حصرية لمنصة الأول وللأستاذ/ أحمد غريب. يُمنع منعاً باتاً نسخ، توزيع، أو إعادة نشر أي جزء من هذا المحتوى بدون إذن كتابي مسبق.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center text-sm font-black">4</span>
                إنهاء الاستخدام
              </h2>
              <p>
                نحتفظ بالحق في تعليق أو إلغاء حسابك فوراً وبدون إشعار مسبق في حال تبين لنا قيامك بانتهاك أي من هذه الشروط، بما في ذلك محاولة تحميل الفيديوهات بطرق غير شرعية أو مشاركة الحساب مع أشخاص آخرين.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
