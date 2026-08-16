import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import { formatArabicTime } from '@/lib/utils/formatters';

export interface DashboardOfflineBannerProps {
  lastUpdatedTimestamp?: string;
}

export function DashboardOfflineBanner({ lastUpdatedTimestamp }: DashboardOfflineBannerProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <Alert variant="warning" className="bg-warning-50 border-warning-300 text-warning-900 shadow-xs">
      <WifiOff className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <AlertTitle className="text-sm font-bold text-warning-900">
          أنت تعمل حالياً في وضع عدم الاتصال (Offline Mode)
        </AlertTitle>
        <AlertDescription className="text-xs text-warning-800 mt-0.5">
          يتم الآن عرض آخر بيانات تم حفظها على هذا الجهاز
          {isMounted && lastUpdatedTimestamp ? ` (بتاريخ: ${formatArabicTime(lastUpdatedTimestamp)})` : ''}.
          يمكنك الاستمرار في تصفح المجموعات، وسيتم تحديث المؤشرات تلقائياً فور عودة الاتصال.
        </AlertDescription>
      </div>
    </Alert>
  );
}

