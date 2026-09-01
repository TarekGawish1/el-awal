import { Wallet, ShieldCheck } from 'lucide-react';

export function FinanceHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-slate-100 pb-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary-600" />
          الماليات والمصروفات
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500">
          تابع التحصيل والمصروفات والمدفوعات المستحقة بسهولة
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
        <ShieldCheck className="w-4 h-4" />
        بيانات مالية مشفرة ومؤمنة
      </div>
    </div>
  );
}
