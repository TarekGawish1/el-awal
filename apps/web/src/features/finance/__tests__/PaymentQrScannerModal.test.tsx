import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentQrScannerModal } from '../components/PaymentQrScannerModal';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useScanPaymentQr } from '../hooks/useFinance';
import { useBooklets } from '@/features/booklets/hooks/useBooklets';

vi.mock('@/features/groups/hooks/useGroups', () => ({
  useGroups: vi.fn(),
}));

vi.mock('@/features/booklets/hooks/useBooklets', () => ({
  useBooklets: vi.fn(() => ({
    booklets: [
      { id: 'b-1', title: 'مذكرة الفيزياء الحديثة', price: 60, gradeLevel: 'G1' },
    ],
    isLoading: false,
  })),
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

    expect(screen.getByText('الماسح الذكي لتحصيل المدفوعات والمذكرات')).toBeInTheDocument();
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

    expect(screen.queryByText('الماسح الذكي لتحصيل المدفوعات والمذكرات')).not.toBeInTheDocument();
  });

  it('triggers mutation upon scanning a student QR code in tuition mode', () => {
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
        paymentType: 'TUITION',
        periodYear: 2026,
        periodMonth: 8,
      }),
      expect.any(Object)
    );
  });

  it('allows switching to booklet mode and scanning with bookletId', () => {
    render(
      <PaymentQrScannerModal
        isOpen={true}
        onClose={mockOnClose}
        initialGroupId="group-1"
      />
    );

    // Switch to booklet payment mode
    fireEvent.click(screen.getByRole('button', { name: /سداد قيمة مذكرة/i }));

    const simulateBtn = screen.getByTestId('simulate-scan-btn');
    fireEvent.click(simulateBtn);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        qrCodeToken: 'qr_tok_student_demo_123',
        paymentType: 'BOOKLET',
        bookletId: 'b-1',
      }),
      expect.any(Object)
    );
  });
});
