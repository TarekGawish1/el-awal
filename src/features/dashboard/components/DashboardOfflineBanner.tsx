import React from 'react';
import { WifiOff, AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';

export interface DashboardOfflineBannerProps {
  lastUpdatedTimestamp?: string;
}

export function DashboardOfflineBanner({ lastUpdatedTimestamp }: DashboardOfflineBannerProps) {
  return (
    <Alert variant="warning" className="bg-warning-50 border-warning-300 text-warning-900 shadow-xs">
      <WifiOff className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <AlertTitle className="text-sm font-bold text-warning-900">
          أنت تعمل حالياً في وضع عدم الاتصال (Offline Mode)
        </AlertTitle>
        <AlertDescription className="text-xs text-warning-800 mt-0.5">
          يتم الآن عرض آخر بيانات تم حفظها على هذا الجهاز
          {lastUpdatedTimestamp ? ` (بتاريخ: ${new Date(lastUpdatedTimestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })})` : ''}.
          يمكنك الاستمرار في تصفح المجموعات، وسيتم تحديث المؤشرات تلقائياً فور عودة الاتصال.
        </AlertDescription>
      </div>
    </Alert>
  );
}
