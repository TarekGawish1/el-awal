import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export interface DashboardErrorStateProps {
  errorMessage?: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export function DashboardErrorState({
  errorMessage = 'تعذر تحميل بيانات لوحة التحكم، يرجى التحقق من الاتصال بالخادم والمحاولة مجدداً.',
  onRetry,
  isRetrying = false,
}: DashboardErrorStateProps) {
  return (
    <Card className="border-error-200 bg-error-50/30 p-8 text-center my-6">
      <CardContent className="max-w-md mx-auto flex flex-col items-center">
        <div className="p-3 bg-error-100 text-error-600 rounded-full mb-3">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 mb-1">
          تعذر استرجاع مؤشرات لوحة التحكم
        </h3>
        <p className="text-sm text-neutral-600 mb-5 leading-relaxed">
          {errorMessage}
        </p>
        <Button
          onClick={onRetry}
          isLoading={isRetrying}
          variant="primary"
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>إعادة المحاولة الآن</span>
        </Button>
      </CardContent>
    </Card>
  );
}
