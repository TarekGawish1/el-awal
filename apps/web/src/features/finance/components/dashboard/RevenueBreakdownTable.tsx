import { FinanceAnalyticsResponse } from '../../types/finance.types';

function formatAmount(amount: number) {
  return `${Number(amount || 0).toLocaleString('en-US')} ج.م`;
}

function formatRate(rate?: number) {
  return `${Number(rate || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

export function RevenueBreakdownTable({ overview }: { overview: FinanceAnalyticsResponse['overview'] }) {
  const data = [
    { source: 'الاشتراكات (حصص ومجموعات)', ...overview.tuition },
    { source: 'المذكرات والملازم الدراسية', ...overview.booklets },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-extrabold text-slate-800 text-sm">مصادر الإيرادات (تفصيل مالي)</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-slate-500 font-semibold text-xs">
            <tr>
              <th className="px-5 py-3 rounded-tr-lg">المصدر</th>
              <th className="px-5 py-3">المستحق</th>
              <th className="px-5 py-3">المحصل</th>
              <th className="px-5 py-3">المتبقي</th>
              <th className="px-5 py-3 rounded-tl-lg">نسبة التحصيل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3 font-bold text-slate-800">{row.source}</td>
                <td className="px-5 py-3 font-semibold text-slate-600">{formatAmount(row.expected)}</td>
                <td className="px-5 py-3 font-bold text-emerald-600">{formatAmount(row.collected)}</td>
                <td className="px-5 py-3 font-bold text-rose-600">{formatAmount(row.remaining)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary-700 w-12">{formatRate(row.collectionRate || row.rate)}</span>
                    <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.max(0, Math.min(100, Number(row.collectionRate || row.rate) || 0))}%` }} />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
