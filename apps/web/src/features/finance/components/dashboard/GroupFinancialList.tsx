import { FinanceAnalyticsGroup } from '../../types/finance.types';
import { Users, Eye } from 'lucide-react';

function formatAmount(amount: number) {
  return `${Number(amount || 0).toLocaleString('en-US')} ج.م`;
}

function formatRate(rate?: number) {
  return `${Number(rate || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

export function GroupFinancialList({ groups, onOpenGroup }: { groups: FinanceAnalyticsGroup[], onOpenGroup: (g: FinanceAnalyticsGroup) => void }) {
  if (!groups.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-extrabold text-slate-800 text-sm">التفاصيل المالية للمجموعات</h3>
      </div>
      
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-100">
            <tr>
              <th className="px-5 py-3">المجموعة</th>
              <th className="px-5 py-3">الطلاب</th>
              <th className="px-5 py-3">المستحق</th>
              <th className="px-5 py-3">المحصل</th>
              <th className="px-5 py-3">المتبقي</th>
              <th className="px-5 py-3">نسبة التحصيل</th>
              <th className="px-5 py-3">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groups.map((group) => (
              <tr key={group.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3">
                  <p className="font-bold text-slate-800">{group.name}</p>
                  <p className="text-[10px] font-semibold text-slate-500">{group.gradeLevel}</p>
                </td>
                <td className="px-5 py-3 font-semibold text-slate-600">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {group.studentCount}
                  </span>
                </td>
                <td className="px-5 py-3 font-semibold text-slate-600">{formatAmount(group.total.expected)}</td>
                <td className="px-5 py-3 font-bold text-emerald-600">{formatAmount(group.total.collected)}</td>
                <td className="px-5 py-3 font-bold text-rose-600">{formatAmount(group.total.remaining)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary-700 w-10">{formatRate(group.total.rate)}</span>
                    <div className="h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.max(0, Math.min(100, Number(group.total.rate) || 0))}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => onOpenGroup(group)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-primary-700 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    عرض التفاصيل
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-slate-100">
        {groups.map((group) => (
          <div key={group.id} className="p-4 hover:bg-slate-50/50 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold text-slate-800 text-sm">{group.name}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{group.gradeLevel}</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                <Users className="w-3.5 h-3.5" />
                {group.studentCount}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="bg-slate-50 p-2 rounded-lg">
                <p className="text-[10px] font-semibold text-slate-500">المستحق</p>
                <p className="font-bold text-slate-700 mt-0.5">{formatAmount(group.total.expected)}</p>
              </div>
              <div className="bg-emerald-50/50 p-2 rounded-lg">
                <p className="text-[10px] font-semibold text-emerald-700">المحصل</p>
                <p className="font-bold text-emerald-700 mt-0.5">{formatAmount(group.total.collected)}</p>
              </div>
              <div className="bg-rose-50/50 p-2 rounded-lg">
                <p className="text-[10px] font-semibold text-rose-700">المتبقي</p>
                <p className="font-bold text-rose-700 mt-0.5">{formatAmount(group.total.remaining)}</p>
              </div>
              <div className="bg-primary-50/50 p-2 rounded-lg">
                <p className="text-[10px] font-semibold text-primary-700">التحصيل</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="font-bold text-primary-700">{formatRate(group.total.rate)}</p>
                  <div className="flex-1 h-1 bg-primary-200/50 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.max(0, Math.min(100, Number(group.total.rate) || 0))}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => onOpenGroup(group)}
              className="w-full flex justify-center items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              عرض التفاصيل
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
