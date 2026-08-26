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
        { id: 'group-1', name: 'مجموعة الأوائل', gradeLevel: 'G1', monthlyFee: 400 },
        { id: 'group-2', name: 'مجموعة المتميزين', gradeLevel: 'G2', monthlyFee: 350 },
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

  it('filters booklet choices to the selected group grade and scope', () => {
    vi.mocked(useBooklets).mockReturnValue({
      booklets: [
        { id: 'b-1', title: 'مذكرة الصف الأول', price: 60, gradeLevel: 'G1' },
        { id: 'b-2', title: 'مذكرة مجموعة أخرى', price: 70, gradeLevel: 'G1', groupId: 'group-2' },
        { id: 'b-3', title: 'مذكرة الصف الثاني', price: 80, gradeLevel: 'G2' },
      ],
      isLoading: false,
    } as any);

    render(<PaymentQrScannerModal isOpen={true} onClose={mockOnClose} initialGroupId="group-1" />);
    fireEvent.click(screen.getByRole('button', { name: /سداد قيمة مذكرة/i }));

    expect(screen.getByRole('option', { name: /مذكرة الصف الأول/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /مذكرة مجموعة أخرى/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /مذكرة الصف الثاني/i })).not.toBeInTheDocument();
  });

  it('presents booklet grade mismatch errors in Arabic without the API error code', () => {
    mockMutate.mockImplementation((_payload, options) => {
      options.onError({ message: 'INVALID_BOOKLET_FOR_STUDENT: invalid booklet (G1 != G2)' });
    });

    render(<PaymentQrScannerModal isOpen={true} onClose={mockOnClose} initialGroupId="group-1" />);
    fireEvent.click(screen.getByRole('button', { name: /سداد قيمة مذكرة/i }));
    fireEvent.click(screen.getByTestId('simulate-scan-btn'));

    expect(screen.getByText('هذه المذكرة مخصصة لطلاب G1، بينما الطالب في G2. يرجى اختيار مذكرة متوافقة.')).toBeInTheDocument();
    expect(screen.queryByText(/INVALID_BOOKLET_FOR_STUDENT/i)).not.toBeInTheDocument();
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
