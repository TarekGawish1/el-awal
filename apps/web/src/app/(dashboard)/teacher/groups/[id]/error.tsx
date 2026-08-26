'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';

export default function GroupDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-6">
      <Link href="/teacher/groups" className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowRight className="w-4 h-4 ml-2" />
        العودة للمجموعات
      </Link>
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">حدث خطأ أثناء عرض تفاصيل المجموعة</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {error?.message || 'تعذر تحميل بيانات المجموعة في وضع عدم الاتصال.'}
          </p>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={() => reset()}>
            <RefreshCw className="w-4 h-4 ml-1.5" />
            إعادة المحاولة
          </Button>
          <Link href="/teacher/groups">
            <Button variant="primary" size="sm">
              العودة لقائمة المجموعات
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
