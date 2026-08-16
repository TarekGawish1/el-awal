import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DashboardErrorState } from '../components/DashboardErrorState';
import { DashboardEmptyState } from '../components/DashboardEmptyState';
import { DashboardOfflineBanner } from '../components/DashboardOfflineBanner';
import { DashboardHeader } from '../components/DashboardHeader';

describe('Dashboard States & Auxiliary Components', () => {
  describe('DashboardErrorState', () => {
    it('renders error message and triggers retry on click', () => {
      const handleRetry = vi.fn();
      render(<DashboardErrorState errorMessage="خطأ في الخادم 500" onRetry={handleRetry} />);

      expect(screen.getByText('تعذر استرجاع مؤشرات لوحة التحكم')).toBeInTheDocument();
      expect(screen.getByText('خطأ في الخادم 500')).toBeInTheDocument();

      const retryBtn = screen.getByText('إعادة المحاولة الآن');
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('DashboardEmptyState', () => {
    it('renders first-time onboarding empty state with setup CTAs', () => {
      render(<DashboardEmptyState isFiltered={false} />);
      expect(screen.getByText('أهلاً بك في منصة الأول التعليمية!')).toBeInTheDocument();
      expect(screen.getByText('إنشاء أول مجموعة دراسية')).toBeInTheDocument();
    });

    it('renders filtered empty state with reset button', () => {
      const handleReset = vi.fn();
      render(<DashboardEmptyState isFiltered={true} onResetFilters={handleReset} />);
      expect(screen.getByText('لا توجد بيانات مطابقة لخيارات التصفية')).toBeInTheDocument();

      const resetBtn = screen.getByText('إعادة ضبط خيارات التصفية');
      fireEvent.click(resetBtn);
      expect(handleReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('DashboardOfflineBanner', () => {
    it('renders offline warning with message', () => {
      render(<DashboardOfflineBanner lastUpdatedTimestamp="2026-08-16T10:30:00Z" />);
      expect(screen.getByText(/أنت تعمل حالياً في وضع عدم الاتصال/i)).toBeInTheDocument();
    });
  });

  describe('DashboardHeader', () => {
    it('renders header with refresh action', () => {
      const handleRefresh = vi.fn();
      render(
        <DashboardHeader
          teacherName="أستاذ طارق"
          isFetching={false}
          isOffline={false}
          onRefresh={handleRefresh}
        />
      );

      expect(screen.getByText(/مرحباً، أستاذ طارق/i)).toBeInTheDocument();
      const refreshBtn = screen.getByLabelText('تحديث بيانات لوحة التحكم');
      fireEvent.click(refreshBtn);
      expect(handleRefresh).toHaveBeenCalledTimes(1);
    });
  });
});
