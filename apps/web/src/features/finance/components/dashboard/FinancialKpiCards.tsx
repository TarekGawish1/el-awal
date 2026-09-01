import { Card, CardContent } from '@/components/ui/Card';
import { Wallet, TrendingUp, AlertTriangle, GraduationCap } from 'lucide-react';
import { FinanceAnalyticsResponse } from '../../types/finance.types';

function formatAmount(amount: number) {
  return `${Number(amount || 0).toLocaleString('en-US')} ج.م`;
}

function formatRate(rate?: number) {
  return `${Number(rate || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

function ProgressIndicator({ rate, colorClass }: { rate: number; colorClass: string }) {
  const percentage = Math.max(0, Math.min(100, Number(rate) || 0));
  return (
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-3">
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${percentage}%` }} />
    </div>
  );
}

interface FinancialKpiCardsProps {
  overview: FinanceAnalyticsResponse['overview'];
}

export function FinancialKpiCards({ overview }: FinancialKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* KPI 1: Expected */}
      <Card className="rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-slate-600" />
            </div>
            <p className="text-xs font-bold text-slate-500">إجمالي المستحق</p>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900">{formatAmount(overview.totalExpected)}</p>
          <p className="mt-1 text-[10px] sm:text-xs font-semibold text-slate-400">من الاشتراكات والمذكرات</p>
        </CardContent>
      </Card>

      {/* KPI 2: Collected */}
      <Card className="rounded-2xl border-emerald-100 bg-emerald-50/30 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-xs font-bold text-emerald-800">إجمالي المحصل</p>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-700">{formatAmount(overview.totalCollected)}</p>
          <p className="mt-1 text-[10px] sm:text-xs font-semibold text-emerald-600/70">{formatRate(overview.collectionRate)} من المستحق</p>
        </CardContent>
      </Card>

      {/* KPI 3: Remaining */}
      <Card className="rounded-2xl border-rose-100 bg-rose-50/30 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            </div>
            <p className="text-xs font-bold text-rose-800">إجمالي المتبقي</p>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-rose-700">{formatAmount(overview.totalRemaining)}</p>
          <p className="mt-1 text-[10px] sm:text-xs font-semibold text-rose-600/70">مبالغ لم يتم تحصيلها</p>
        </CardContent>
      </Card>

      {/* KPI 4: Collection Percentage */}
      <Card className="rounded-2xl border-primary-100 bg-primary-50/30 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-primary-600" />
              </div>
              <p className="text-xs font-bold text-primary-800">نسبة التحصيل</p>
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-primary-700">{formatRate(overview.collectionRate)}</p>
          </div>
          <ProgressIndicator rate={overview.collectionRate} colorClass="bg-primary-500" />
        </CardContent>
      </Card>
    </div>
  );
}
