import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FinancePage from '@/app/(dashboard)/teacher/finance/page';
import { offlineDb } from '@/lib/offline/db';

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: vi.fn() }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/teacher/finance',
}));

vi.mock('@/core/hooks/usePermissions', () => ({
  usePermissions: () => ({
    can: () => true,
    permissions: ['VIEW_FINANCE', 'MANAGE_FINANCE', 'MANAGE_STUDENTS'],
    role: 'TEACHER',
  }),
}));

vi.mock('@/lib/offline/use-online-status', () => ({
  useOnlineStatus: () => false,
}));

vi.mock('@yudiel/react-qr-scanner', () => ({
  Scanner: () => <div data-testid="mock-qr-scanner">Scanner Mock</div>,
  prepareZXingModule: vi.fn(),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('Offline Finance Navigation & Zero-Redirect Resilience', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

    // Populate offline groups and payments in IndexedDB
    await offlineDb.bulkPutGroups([
      {
        id: 'group-offline-fin-1',
        name: 'مجموعة الفيزياء التجريبية',
        stage: 'SECONDARY',
        gradeLevel: 'الصف الأول الثانوي',
        monthlyFee: 250,
      } as any,
    ]);
  });

  it('renders Finance Page in offline mode without redirecting to root / or dashboard', async () => {
    renderWithClient(<FinancePage />);

    // Header and offline notice should be visible
    await waitFor(() => {
      expect(screen.getByText('الماليات والمصروفات')).toBeInTheDocument();
    });

    // Verify offline banner is shown
    expect(screen.getByText(/أنت تعمل في وضع عدم الاتصال/i)).toBeInTheDocument();
    expect(screen.getByText(/رصد وتحصيل المصروفات والاشتراكات/i)).toBeInTheDocument();

    // Verify no redirects occurred
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('allows switching to MATRIX ledger offline without throwing or redirecting', async () => {
    mockSearchParams = new URLSearchParams('tab=matrix');
    renderWithClient(<FinancePage />);

    await waitFor(() => {
      expect(screen.getByText('الماليات والمصروفات')).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
