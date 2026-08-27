import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CancelPaymentModal, PaymentSummaryInfo } from '../components/CancelPaymentModal';

const mockDeletePayment = vi.fn();
const mockRefundPayment = vi.fn();

vi.mock('../hooks/useFinance', () => ({
  useDeletePayment: () => ({
    mutate: mockDeletePayment,
    isPending: false,
  }),
  useRefundPayment: () => ({
    mutate: mockRefundPayment,
    isPending: false,
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Payment Cancellation & Removal Workflow (CancelPaymentModal)', () => {
  let queryClient: QueryClient;

  const mockPayment: PaymentSummaryInfo = {
    id: 'pay-123',
    studentName: 'محمود أحمد',
    amountPaid: 350,
    paymentType: 'TUITION',
    periodMonth: 9,
    periodYear: 2026,
    groupName: 'مجموعة الأحد والثلاثاء',
    notes: 'تم السداد نقداً',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderComponent = (props: {
    isOpen: boolean;
    payment: PaymentSummaryInfo | null;
    onClose?: () => void;
    onSuccess?: () => void;
  }) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CancelPaymentModal
          isOpen={props.isOpen}
          payment={props.payment}
          onClose={props.onClose || vi.fn()}
          onSuccess={props.onSuccess || vi.fn()}
        />
      </QueryClientProvider>
    );
  };

  it('renders payment summary details correctly in the modal', () => {
    renderComponent({ isOpen: true, payment: mockPayment });

    expect(screen.getByText('إلغاء وحذف دفعة الطالب')).toBeInTheDocument();
    expect(screen.getByText('محمود أحمد')).toBeInTheDocument();
    expect(screen.getByText(/350 ج\.م/)).toBeInTheDocument();
    expect(screen.getByText(/اشتراك شهر 9 \/ 2026/)).toBeInTheDocument();
    expect(screen.getByText('مجموعة الأحد والثلاثاء')).toBeInTheDocument();
  });

  it('defaults to DELETE action and triggers useDeletePayment when confirmed', async () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    mockDeletePayment.mockImplementation((id: string, options?: any) => {
      options?.onSuccess?.();
    });

    renderComponent({
      isOpen: true,
      payment: mockPayment,
      onClose: handleClose,
      onSuccess: handleSuccess,
    });

    const confirmButton = screen.getByRole('button', { name: /تأكيد الحذف النهائي/i });
    expect(confirmButton).toBeInTheDocument();

    fireEvent.click(confirmButton);

    expect(mockDeletePayment).toHaveBeenCalledWith('pay-123', expect.any(Object));
    expect(handleSuccess).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalled();
  });

  it('switches to REFUND action, displays refund reason input, and calls useRefundPayment', async () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    mockRefundPayment.mockImplementation((payload: any, options?: any) => {
      options?.onSuccess?.();
    });

    renderComponent({
      isOpen: true,
      payment: mockPayment,
      onClose: handleClose,
      onSuccess: handleSuccess,
    });

    // Select the Refund option
    const refundOption = screen.getByText(/استرداد المبلغ وإلغاء العملية/i);
    fireEvent.click(refundOption);

    // Verify refund reason input appears
    const reasonInput = screen.getByPlaceholderText(/الطالب طلب استرداد المبلغ/i);
    expect(reasonInput).toBeInTheDocument();

    // Type a custom reason
    fireEvent.change(reasonInput, { target: { value: 'الطالب اعتذر عن الاستمرار هذا الشهر' } });

    // Confirm button text updates
    const refundButton = screen.getByRole('button', { name: /تأكيد استرداد المبلغ/i });
    expect(refundButton).toBeInTheDocument();

    fireEvent.click(refundButton);

    expect(mockRefundPayment).toHaveBeenCalledWith(
      {
        id: 'pay-123',
        reason: 'الطالب اعتذر عن الاستمرار هذا الشهر',
      },
      expect.any(Object)
    );
    expect(handleSuccess).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false or payment is null', () => {
    const { container } = renderComponent({ isOpen: false, payment: mockPayment });
    expect(container.firstChild).toBeNull();

    const { container: nullPaymentContainer } = renderComponent({ isOpen: true, payment: null });
    expect(nullPaymentContainer.firstChild).toBeNull();
  });
});
