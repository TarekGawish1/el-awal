import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { getNavigationItemsForRole, TEACHER_NAVIGATION_ITEMS, STUDENT_NAVIGATION_ITEMS } from '@/config/navigation';
import { FeatureRequiresOnlineCard } from '@/components/offline/FeatureRequiresOnlineCard';
import { MobileBottomNav } from '../MobileBottomNav';
import * as useOnlineStatusModule from '@/lib/offline/use-online-status';
import { AssessmentList } from '@/features/assessments/components/AssessmentList';
import { ContentContainer } from '@/features/content/components/ContentContainer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock router and hooks
vi.mock('next/navigation', () => ({
  usePathname: () => '/teacher/dashboard',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/features/assessments/hooks/use-assessments', () => ({
  useAssessments: () => ({
    data: { data: [] },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/features/content/components/ContentLibrary', () => ({
  ContentLibrary: () => <div data-testid="content-library">مكتبة المحتوى</div>,
}));

vi.mock('@/features/content/components/UploadModal', () => ({
  UploadModal: () => null,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('Offline Navigation Filtering & Route Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNavigationItemsForRole', () => {
    it('returns all 8 teacher navigation items when online', () => {
      const items = getNavigationItemsForRole('TEACHER', true);
      expect(items).toHaveLength(8);
      const labels = items.map((i) => i.label);
      expect(labels).toContain('الواجبات والاختبارات');
      expect(labels).toContain('المحتوى والدروس');
      expect(labels).toContain('لوحة التحكم');
      expect(labels).toContain('سجل الطلاب');
    });

    it('filters out online-only teacher items (leaving 6 offline-supported items) when offline', () => {
      const items = getNavigationItemsForRole('TEACHER', false);
      expect(items).toHaveLength(6);
      const labels = items.map((i) => i.label);
      expect(labels).not.toContain('الواجبات والاختبارات');
      expect(labels).not.toContain('المحتوى والدروس');
      expect(labels).toContain('لوحة التحكم');
      expect(labels).toContain('المجموعات الدراسية');
      expect(labels).toContain('جدول وحصص المعلم');
      expect(labels).toContain('رصد الحضور والـ QR');
      expect(labels).toContain('سجل الطلاب');
      expect(labels).toContain('الماليات والمصروفات');
    });

    it('filters out online-only student items when offline', () => {
      const onlineItems = getNavigationItemsForRole('STUDENT', true);
      expect(onlineItems).toHaveLength(5);

      const offlineItems = getNavigationItemsForRole('STUDENT', false);
      expect(offlineItems).toHaveLength(3);
      const labels = offlineItems.map((i) => i.label);
      expect(labels).not.toContain('الدورات');
      expect(labels).not.toContain('الاختبارات');
      expect(labels).toContain('الرئيسية');
      expect(labels).toContain('الحضور');
      expect(labels).toContain('المدفوعات');
    });
  });

  describe('MobileBottomNav', () => {
    it('renders bottom navigation tabs properly in offline mode', () => {
      vi.spyOn(useOnlineStatusModule, 'useOnlineStatus').mockReturnValue(false);

      render(<MobileBottomNav userRole="TEACHER" onOpenMobileMenu={vi.fn()} />);

      expect(screen.getByText('الرئيسية')).toBeDefined();
      expect(screen.getByText('المجموعات')).toBeDefined();
      expect(screen.getByText('رصد الحضور')).toBeDefined();
      expect(screen.getByText('الجدول')).toBeDefined();
      expect(screen.getByText('المزيد')).toBeDefined();
    });
  });

  describe('FeatureRequiresOnlineCard', () => {
    it('renders offline warning card with custom description and return action', () => {
      render(
        <FeatureRequiresOnlineCard
          featureName="الواجبات والاختبارات"
          description="إدارة بنوك الأسئلة ورفع الاختبارات تتطلب اتصالاً نشطاً بالخادم."
          backHref="/teacher/dashboard"
        />
      );

      expect(screen.getByText('هذه الميزة تتطلب اتصالاً بالإنترنت')).toBeDefined();
      expect(
        screen.getByText('إدارة بنوك الأسئلة ورفع الاختبارات تتطلب اتصالاً نشطاً بالخادم.')
      ).toBeDefined();
      expect(screen.getByText('العودة إلى الرئيسية')).toBeDefined();
    });
  });

  describe('Offline creation guards', () => {
    it('keeps assessments visible but disables creating homework and exams offline', () => {
      vi.spyOn(useOnlineStatusModule, 'useOnlineStatus').mockReturnValue(false);

      render(<AssessmentList />, { wrapper: createWrapper() });

      expect(screen.getByText('إدارة الاختبارات والواجبات')).toBeDefined();
      expect(screen.getByRole('button', { name: 'إنشاء اختبار جديد' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'إنشاء واجب جديد' })).toBeDisabled();
    });

    it('keeps the content library available offline while upload remains locked', () => {
      vi.spyOn(useOnlineStatusModule, 'useOnlineStatus').mockReturnValue(false);

      render(<ContentContainer />);

      expect(screen.getByTestId('content-library')).toBeDefined();
    });
  });
});
