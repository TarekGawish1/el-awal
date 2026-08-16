import React from 'react';
import Link from 'next/link';
import { PlusCircle, Users, BookOpen, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export interface DashboardEmptyStateProps {
  isFiltered?: boolean;
  onResetFilters?: () => void;
}

export function DashboardEmptyState({ isFiltered = false, onResetFilters }: DashboardEmptyStateProps) {
  if (isFiltered) {
    return (
      <Card className="border-dashed border-2 border-neutral-300 p-8 text-center my-6">
        <CardContent className="max-w-md mx-auto flex flex-col items-center">
          <div className="p-3 bg-neutral-100 text-neutral-500 rounded-full mb-3">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-1">
            لا توجد بيانات مطابقة لخيارات التصفية
          </h3>
          <p className="text-sm text-neutral-500 mb-5 leading-relaxed">
            لم يتم العثور على حصص أو سجلات حضور للمجموعة أو الفترة المحددة.
          </p>
          {onResetFilters && (
            <Button onClick={onResetFilters} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              <span>إعادة ضبط خيارات التصفية</span>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // First-time Onboarding State for a fresh teacher account
  return (
    <Card className="border-primary-200 bg-gradient-to-b from-primary-50/50 to-white p-8 text-center my-6">
      <CardContent className="max-w-lg mx-auto flex flex-col items-center">
        <div className="p-3.5 bg-primary-100 text-primary-700 rounded-full mb-3">
          <BookOpen className="w-9 h-9" />
        </div>
        <h3 className="text-xl font-bold text-neutral-900 mb-1.5">
          أهلاً بك في منصة الأول التعليمية!
        </h3>
        <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
          لبدء استخدام لوحة التحكم ورصد الحضور الذكي ومتابعة الطلاب، يرجى إنشاء مجموعتك الدراسية الأولى وتحديد مواعيد الحصص.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/teacher/groups">
            <Button variant="primary" className="gap-2">
              <PlusCircle className="w-4 h-4" />
              <span>إنشاء أول مجموعة دراسية</span>
            </Button>
          </Link>
          <Link href="/teacher/students">
            <Button variant="outline" className="gap-2">
              <Users className="w-4 h-4" />
              <span>إضافة الطلاب وتوليد الـ QR</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
