import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentQrScannerModal } from '../components/PaymentQrScannerModal';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useScanPaymentQr } from '../hooks/useFinance';

vi.mock('@/features/groups/hooks/useGroups', () => ({
  useGroups: vi.fn(),
}));

let mockScanHandler: any = null;

vi.mock('@yudiel/react-qr-scanner', () => ({
  Scanner: vi.fn(({ onScan, onError }: any) => {
    mockScanHandler = onScan;
    return (
      <div data-testid="mock-scanner">
        <button
          data-testid="simulate-scan-btn"
          onClick={() => onScan([{ rawValue: 'qr_tok_student_demo_123' }])}
        >
          Simulate Scan
        </button>
      </div>
    );
  }),
}));

vi.mock('../hooks/useFinance', () => ({
  useScanPaymentQr: vi.fn(),
}));

describe('PaymentQrScannerModal', () => {
  const mockMutate = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGroups).mockReturnValue({
      data: [
        { id: 'group-1', name: 'مجموعة الأوائل', monthlyFee: 400 },
        { id: 'group-2', name: 'مجموعة المتميزين', monthlyFee: 350 },
      ],
      isLoading: false,
    } as any);

    vi.mocked(useScanPaymentQr).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as any);
  });

  it('renders correctly when open with default values', () => {
    render(
      <PaymentQrScannerModal
        isOpen={true}
        onClose={mockOnClose}
        initialGroupId="group-1"
        initialPeriodYear={2026}
        initialPeriodMonth={8}
      />
    );

    expect(screen.getByText('دفع المصروفات عبر ماسح الـ QR')).toBeInTheDocument();
    expect(screen.getByText(/مجموعة الأوائل/i)).toBeInTheDocument();
    expect(screen.getByTestId('mock-scanner')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <PaymentQrScannerModal
        isOpen={false}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('دفع المصروفات عبر ماسح الـ QR')).not.toBeInTheDocument();
  });

  it('triggers mutation upon scanning a student QR code', () => {
    render(
      <PaymentQrScannerModal
        isOpen={true}
        onClose={mockOnClose}
        initialGroupId="group-1"
        initialPeriodYear={2026}
        initialPeriodMonth={8}
      />
    );

    const simulateBtn = screen.getByTestId('simulate-scan-btn');
    fireEvent.click(simulateBtn);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        qrCodeToken: 'qr_tok_student_demo_123',
        groupId: 'group-1',
        periodYear: 2026,
        periodMonth: 8,
      }),
      expect.any(Object)
    );
  });
});
