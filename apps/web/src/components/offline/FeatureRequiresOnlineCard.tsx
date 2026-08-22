'use client';

import React from 'react';
import Link from 'next/link';
import { WifiOff, ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface FeatureRequiresOnlineCardProps {
  featureName?: string;
  description?: string;
  backHref?: string;
}

export function FeatureRequiresOnlineCard({
  featureName = 'هذه الميزة',
  description = 'إدارة بنوك الأسئلة ورفع الفيديوهات والمحتوى التعليمي تتطلب اتصالاً نشطاً بالخادم.',
  backHref = '/teacher/dashboard',
}: FeatureRequiresOnlineCardProps) {
  return (
    <div
      id="feature-requires-online-card"
      className="max-w-2xl mx-auto my-8 p-6 sm:p-8 bg-white border border-amber-200/80 rounded-3xl shadow-sm text-center space-y-6"
    >
      <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-xs">
        <WifiOff className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/60 text-amber-800 text-xs font-bold">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>ميزة تتطلب الاتصال المباشر</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-neutral-900">
          هذه الميزة تتطلب اتصالاً بالإنترنت
        </h2>
        <p className="text-sm text-neutral-600 max-w-lg mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 text-xs text-neutral-600 text-start space-y-1.5">
        <p className="font-bold text-neutral-800">💡 ماذا يمكنك فعله بدون إنترنت؟</p>
        <ul className="list-disc list-inside space-y-1 text-neutral-600 leading-normal">
          <li>رصد حضور الطلاب بالماسح الضوئي QR أو يدوياً.</li>
          <li>تسجيل طلاب جدد وإنشاء مجموعات دراسية جديدة.</li>
          <li>إدارة جداول الحصص والتحصيل المالي والاشتراكات.</li>
        </ul>
        <p className="text-primary-700 font-medium pt-1">
          ستتم مزامنة جميع عملياتك مع الخادم تلقائياً فور عودة الاتصال.
        </p>
      </div>

      <div className="pt-2 flex justify-center">
        <Link href={backHref}>
          <Button
            variant="primary"
            className="rounded-xl px-6 py-2.5 font-bold shadow-md shadow-primary-600/20 flex items-center gap-2"
          >
            <span>العودة إلى الرئيسية</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
